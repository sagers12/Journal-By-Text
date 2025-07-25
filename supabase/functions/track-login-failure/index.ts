import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getClientIP(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  const xRealIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  if (xRealIP) {
    return xRealIP
  }
  
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

    const { email, error: authErrorMessage } = await req.json()
    const clientIP = getClientIP(req)

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle failed login attempt tracking
    const { data: existingLockout } = await supabaseClient
      .from('account_lockouts')
      .select('*')
      .eq('email', email)
      .single()

    if (existingLockout) {
      const newFailedAttempts = existingLockout.failed_attempts + 1
      const shouldLock = newFailedAttempts >= 5
      
      await supabaseClient
        .from('account_lockouts')
        .update({
          failed_attempts: newFailedAttempts,
          locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null, // 30 min lockout
          last_attempt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)

      if (shouldLock) {
        // Log security event
        await supabaseClient
          .from('security_events')
          .insert({
            event_type: 'account_locked',
            identifier: email,
            details: {
              ip: clientIP,
              failed_attempts: newFailedAttempts,
              locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            },
            severity: 'high'
          })
      }
    } else {
      // Create new lockout record
      await supabaseClient
        .from('account_lockouts')
        .insert({
          email,
          user_id: '00000000-0000-0000-0000-000000000000', // Placeholder until we get actual user ID
          failed_attempts: 1,
          last_attempt: new Date().toISOString()
        })
    }

    // Log failed login
    await supabaseClient
      .from('security_events')
      .insert({
        event_type: 'failed_login',
        identifier: email,
        details: {
          ip: clientIP,
          error: authErrorMessage,
          timestamp: new Date().toISOString()
        },
        severity: 'medium'
      })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Track login failure error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})