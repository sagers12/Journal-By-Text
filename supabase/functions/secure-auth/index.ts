import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthRequest {
  action: 'signin' | 'signup'
  email: string
  password: string
  phoneNumber?: string
  timezone?: string
}

// Input validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

function validatePassword(password: string): boolean {
  // Must be at least 12 characters with uppercase, lowercase, number, and special character
  const minLength = password.length >= 12
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[@$!%*?&]/.test(password)
  
  return minLength && hasUpper && hasLower && hasNumber && hasSpecial
}

function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  // Should be 10-15 digits (international format)
  return cleaned.length >= 10 && cleaned.length <= 15
}

function getClientIP(req: Request): string {
  // Try various headers for client IP
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

    // Parse and validate request
    let requestData: AuthRequest
    try {
      requestData = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, email, password, phoneNumber, timezone } = requestData
    const clientIP = getClientIP(req)

    // Input validation
    if (!action || !['signin', 'signup'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be signin or signup.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!email || !validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password strength for signup
    if (action === 'signup' && !validatePassword(password)) {
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 12 characters long and contain uppercase, lowercase, number, and special character' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits using client IP and email
    const rateLimitIdentifier = `${clientIP}:${email}`
    const endpoint = action === 'signin' ? 'auth_signin' : 'auth_signup'
    
    const { data: rateLimitCheck } = await supabaseClient.rpc('check_rate_limit', {
      p_identifier: rateLimitIdentifier,
      p_endpoint: endpoint,
      p_max_attempts: action === 'signin' ? 5 : 3, // More restrictive for signup
      p_window_minutes: 15
    })

    if (!rateLimitCheck.allowed) {
      // Log security event
      await supabaseClient
        .from('security_events')
        .insert({
          event_type: 'rate_limit_exceeded',
          identifier: rateLimitIdentifier,
          details: {
            endpoint,
            ip: clientIP,
            email,
            blocked_until: rateLimitCheck.blocked_until
          },
          severity: 'medium'
        })

      return new Response(
        JSON.stringify({ 
          error: 'Too many attempts. Please try again later.',
          blocked_until: rateLimitCheck.blocked_until
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for account lockout (signin only)
    if (action === 'signin') {
      const { data: lockoutData } = await supabaseClient
        .from('account_lockouts')
        .select('locked_until, failed_attempts')
        .eq('email', email)
        .single()

      if (lockoutData?.locked_until && new Date(lockoutData.locked_until) > new Date()) {
        return new Response(
          JSON.stringify({ 
            error: 'Account temporarily locked due to multiple failed login attempts',
            locked_until: lockoutData.locked_until
          }),
          { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    let authResponse
    let authError

    if (action === 'signin') {
      // Attempt sign in
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })
      authResponse = data
      authError = error

      if (error) {
        // Handle failed login attempt
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
              error: error.message,
              timestamp: new Date().toISOString()
            },
            severity: 'medium'
          })
      } else if (authResponse.user) {
        // Successful login - clear lockout record
        await supabaseClient
          .from('account_lockouts')
          .delete()
          .eq('email', email)
      }

    } else {
      // Sign up
      const redirectUrl = `${req.headers.get('origin') || 'https://journalbytext.com'}/`
      
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            ...(phoneNumber && { phone_number: phoneNumber }),
            ...(timezone && { timezone })
          }
        }
      })
      authResponse = data
      authError = error

      if (!error && data.user) {
        // Log successful signup
        await supabaseClient
          .from('security_events')
          .insert({
            event_type: 'user_signup',
            user_id: data.user.id,
            identifier: email,
            details: {
              ip: clientIP,
              has_phone: !!phoneNumber,
              timezone: timezone || 'UTC'
            },
            severity: 'low'
          })
      }
    }

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        data: authResponse,
        rate_limit: {
          attempts: rateLimitCheck.attempts,
          max_attempts: rateLimitCheck.max_attempts
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Secure auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})