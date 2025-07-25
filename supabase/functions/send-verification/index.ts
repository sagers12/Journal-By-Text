
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  // Should be 10-15 digits (international format)
  return cleaned.length >= 10 && cleaned.length <= 15
}

function getClientIP(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  const xRealIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim()
  if (cfConnectingIP) return cfConnectingIP
  if (xRealIP) return xRealIP
  return 'unknown'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let requestData
    try {
      requestData = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { phoneNumber } = requestData
    const clientIP = getClientIP(req)
    
    // Input validation
    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Valid phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limit phone number length to prevent abuse
    if (phoneNumber.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Phone number too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits
    const rateLimitIdentifier = `${clientIP}:phone_verification`
    const { data: rateLimitCheck } = await supabaseClient.rpc('check_rate_limit', {
      p_identifier: rateLimitIdentifier,
      p_endpoint: 'phone_verification',
      p_max_attempts: 3, // Only 3 attempts per 15 minutes
      p_window_minutes: 15
    })

    if (!rateLimitCheck.allowed) {
      await supabaseClient
        .from('security_events')
        .insert({
          event_type: 'rate_limit_exceeded',
          identifier: rateLimitIdentifier,
          details: {
            endpoint: 'phone_verification',
            ip: clientIP,
            phone: phoneNumber,
            blocked_until: rateLimitCheck.blocked_until
          },
          severity: 'medium'
        })

      return new Response(
        JSON.stringify({ 
          error: 'Too many verification attempts. Please try again later.',
          blocked_until: rateLimitCheck.blocked_until
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Clean phone number
    const cleanPhone = phoneNumber.replace(/[\+\-\s\(\)]/g, '')

    // Store verification code (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    
    const { error: storeError } = await supabaseClient
      .from('phone_verifications')
      .upsert({
        phone_number: cleanPhone,
        verification_code: verificationCode,
        expires_at: expiresAt,
        verified: false
      }, {
        onConflict: 'phone_number'
      })

    if (storeError) throw storeError

    // Send SMS via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured')
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('From', fromNumber)
    formData.append('To', phoneNumber)
    formData.append('Body', `Your SMS Journal verification code is: ${verificationCode}`)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    })

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text()
      throw new Error(`Twilio error: ${error}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send verification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
