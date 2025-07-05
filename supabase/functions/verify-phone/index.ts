
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { phoneNumber, code } = await req.json()
    
    if (!phoneNumber || !code) {
      throw new Error('Phone number and verification code are required')
    }

    // Clean phone number
    const cleanPhone = phoneNumber.replace(/[\+\-\s\(\)]/g, '')

    // Check verification code
    const { data: verification, error: verificationError } = await supabaseClient
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', cleanPhone)
      .eq('verification_code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (verificationError || !verification) {
      // Rate limiting for failed attempts - max 5 attempts per phone per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: failedAttempts } = await supabaseClient
        .from('phone_verifications')
        .select('id')
        .eq('phone_number', cleanPhone)
        .gte('created_at', oneHourAgo)
      
      if (failedAttempts && failedAttempts.length >= 5) {
        throw new Error('Too many failed verification attempts. Please request a new code.')
      }
      
      throw new Error('Invalid or expired verification code')
    }

    // Mark as verified
    const { error: updateError } = await supabaseClient
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id)

    if (updateError) throw updateError

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('User not authenticated')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Update user profile with verified phone number
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ 
        phone_number: cleanPhone, 
        phone_verified: true 
      })
      .eq('id', user.id)

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ success: true, message: 'Phone number verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Verify phone error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
