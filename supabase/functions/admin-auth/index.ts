import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminLoginRequest {
  email: string
  password: string
}

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  last_login_at: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (action === 'login') {
      const { email, password }: AdminLoginRequest = await req.json()

      console.log('Login attempt:', { email, passwordLength: password?.length })

      // Validate input
      if (!email || !password) {
        console.log('Missing email or password')
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get admin user
      const { data: adminUser, error: adminError } = await supabaseClient
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single()

      console.log('Admin user query result:', { 
        adminUser: adminUser ? { id: adminUser.id, email: adminUser.email } : null, 
        error: adminError 
      })

      if (adminError || !adminUser) {
        console.log('Admin user not found or error:', adminError)
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For now, using a simple password check (in production, use bcrypt)
      // This is the temporary admin password: "admin123"
      const isValidPassword = password === 'admin123'

      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create session
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const { error: sessionError } = await supabaseClient
        .from('admin_sessions')
        .insert({
          admin_user_id: adminUser.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || '0.0.0.0',
          user_agent: req.headers.get('user-agent') || ''
        })

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update last login
      await supabaseClient
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminUser.id)

      const user: AdminUser = {
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        is_active: adminUser.is_active,
        last_login_at: adminUser.last_login_at
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify') {
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const sessionToken = authHeader.substring(7)

      // Verify session
      const { data: session, error: sessionError } = await supabaseClient
        .from('admin_sessions')
        .select(`
          *,
          admin_users (
            id,
            email,
            full_name,
            is_active,
            last_login_at
          )
        `)
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (sessionError || !session || !session.admin_users.is_active) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: session.admin_users 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'logout') {
      const authHeader = req.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const sessionToken = authHeader.substring(7)
        
        // Delete session
        await supabaseClient
          .from('admin_sessions')
          .delete()
          .eq('session_token', sessionToken)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Simple password verification function (replace with bcrypt in production)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // This is a placeholder - in production, use bcrypt
  return password === hash
}