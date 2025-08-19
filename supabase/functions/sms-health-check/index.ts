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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const healthChecks = []

  try {
    // 1. Database connectivity check
    const dbStart = Date.now()
    const { data: dbTest, error: dbError } = await supabaseClient
      .from('profiles')
      .select('count')
      .limit(1)

    healthChecks.push({
      name: 'Database Connectivity',
      status: dbError ? 'FAIL' : 'PASS',
      responseTime: Date.now() - dbStart,
      error: dbError?.message
    })

    // 2. Recent message processing check
    const { data: recentMessages } = await supabaseClient
      .from('sms_messages')
      .select('processed, error_message, received_at')
      .gte('received_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('received_at', { ascending: false })

    const unprocessedCount = recentMessages?.filter(m => !m.processed).length || 0
    const errorCount = recentMessages?.filter(m => m.error_message).length || 0
    const totalRecent = recentMessages?.length || 0

    healthChecks.push({
      name: 'Message Processing (Last Hour)',
      status: (unprocessedCount === 0 && errorCount === 0) ? 'PASS' : 'WARN',
      details: {
        total: totalRecent,
        unprocessed: unprocessedCount,
        errors: errorCount,
        processedRate: totalRecent > 0 ? ((totalRecent - unprocessedCount) / totalRecent * 100).toFixed(1) + '%' : 'N/A'
      }
    })

    // 3. Journal entry creation rate check
    const { data: recentEntries } = await supabaseClient
      .from('journal_entries')
      .select('created_at')
      .eq('source', 'sms')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    const entriesCount = recentEntries?.length || 0
    const expectedRatio = totalRecent > 0 ? entriesCount / totalRecent : 0

    healthChecks.push({
      name: 'SMS to Journal Entry Conversion',
      status: expectedRatio >= 0.8 ? 'PASS' : 'WARN', // Expect 80%+ conversion rate
      details: {
        smsMessages: totalRecent,
        journalEntries: entriesCount,
        conversionRate: (expectedRatio * 100).toFixed(1) + '%'
      }
    })

    // 4. Environment variables check
    const requiredEnvs = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY', 
      'SURGE_API_TOKEN',
      'SURGE_ACCOUNT_ID',
      'SURGE_WEBHOOK_SECRET'
    ]

    const missingEnvs = requiredEnvs.filter(env => !Deno.env.get(env))

    healthChecks.push({
      name: 'Environment Configuration',
      status: missingEnvs.length === 0 ? 'PASS' : 'FAIL',
      details: {
        required: requiredEnvs.length,
        configured: requiredEnvs.length - missingEnvs.length,
        missing: missingEnvs
      }
    })

    // 5. Webhook endpoint availability check
    const webhookStart = Date.now()
    try {
      const webhookResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-webhook`, {
        method: 'OPTIONS'
      })
      
      healthChecks.push({
        name: 'SMS Webhook Endpoint',
        status: webhookResponse.ok ? 'PASS' : 'WARN',
        responseTime: Date.now() - webhookStart,
        details: { statusCode: webhookResponse.status }
      })
    } catch (webhookError) {
      healthChecks.push({
        name: 'SMS Webhook Endpoint',
        status: 'FAIL',
        responseTime: Date.now() - webhookStart,
        error: webhookError.message
      })
    }

    // 6. User verification status check
    const { data: userStats } = await supabaseClient
      .from('profiles')
      .select('phone_verified')

    const totalUsers = userStats?.length || 0
    const verifiedUsers = userStats?.filter(u => u.phone_verified).length || 0
    const verificationRate = totalUsers > 0 ? verifiedUsers / totalUsers : 0

    healthChecks.push({
      name: 'User Phone Verification Rate',
      status: verificationRate >= 0.5 ? 'PASS' : 'WARN', // Expect 50%+ verification
      details: {
        totalUsers,
        verifiedUsers,
        verificationRate: (verificationRate * 100).toFixed(1) + '%'
      }
    })

    // Calculate overall health
    const failCount = healthChecks.filter(check => check.status === 'FAIL').length
    const warnCount = healthChecks.filter(check => check.status === 'WARN').length
    const passCount = healthChecks.filter(check => check.status === 'PASS').length

    const overallStatus = failCount > 0 ? 'UNHEALTHY' : 
                         warnCount > 0 ? 'DEGRADED' : 'HEALTHY'

    // Log health check result
    await supabaseClient
      .from('health_check_logs')
      .insert({
        overall_status: overallStatus,
        checks_passed: passCount,
        checks_warned: warnCount,
        checks_failed: failCount,
        details: healthChecks
      })
      .catch(err => console.log('Failed to log health check:', err))

    const result = {
      timestamp: new Date().toISOString(),
      status: overallStatus,
      summary: {
        total: healthChecks.length,
        passed: passCount,
        warned: warnCount,
        failed: failCount
      },
      checks: healthChecks
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: overallStatus === 'UNHEALTHY' ? 503 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    const result = {
      timestamp: new Date().toISOString(),
      status: 'CRITICAL',
      error: error.message,
      checks: healthChecks
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})