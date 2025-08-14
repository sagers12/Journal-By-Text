import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DashboardMetrics {
  paidSubscribers: number
  trialUsers: number
  trialConversionRate: number
  journalEntries: {
    count: number
    period: string
  }
  avgEntriesPerUser: number
  newSignups: {
    count: number
    period: string
  }
  accountVerificationRate: number
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

    // Verify admin session
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sessionToken = authHeader.substring(7)
    const { data: session, error: sessionError } = await supabaseClient
      .from('admin_sessions')
      .select('admin_user_id')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()
    const period = url.searchParams.get('period') || 'today'

    if (action === 'metrics') {
      const metrics = await calculateMetrics(supabaseClient, period)
      
      return new Response(
        JSON.stringify({ success: true, metrics }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'refresh-cache') {
      await refreshMetricsCache(supabaseClient)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Metrics cache refreshed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin dashboard error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function calculateMetrics(supabaseClient: any, period: string): Promise<DashboardMetrics> {
  const now = new Date()
  const { startDate, endDate } = getPeriodDates(period, now)

  // Paid subscribers count
  const { count: paidSubscribers } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('subscribed', true)

  // Trial users count
  const { count: trialUsers } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_trial', true)
    .gt('trial_end', now.toISOString())

  // Trial conversion rate (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  const { count: trialStartedCount } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('is_trial', true)

  const { count: convertedCount } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('subscribed', true)

  const trialConversionRate = trialStartedCount > 0 ? 
    Math.round((convertedCount / trialStartedCount) * 100) : 0

  // Journal entries count for specified period
  const { count: journalEntriesCount } = await supabaseClient
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Active users count (all trial + paid users)
  const { count: activeUsersCount } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .or('subscribed.eq.true,and(is_trial.eq.true,trial_end.gt.' + now.toISOString() + ')')

  // Calculate average entries per user per week
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const weeksInPeriod = Math.max(1, daysInPeriod / 7)
  const avgEntriesPerUser = activeUsersCount > 0 ? 
    Math.round((journalEntriesCount / activeUsersCount) / weeksInPeriod * 10) / 10 : 0

  // New signups for specified period
  const { count: newSignupsCount } = await supabaseClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Verified accounts for the same period
  const { count: verifiedAccountsCount } = await supabaseClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .eq('phone_verified', true)

  const accountVerificationRate = newSignupsCount > 0 ? 
    Math.round((verifiedAccountsCount / newSignupsCount) * 100) : 0

  return {
    paidSubscribers: paidSubscribers || 0,
    trialUsers: trialUsers || 0,
    trialConversionRate,
    journalEntries: {
      count: journalEntriesCount || 0,
      period
    },
    avgEntriesPerUser,
    newSignups: {
      count: newSignupsCount || 0,
      period
    },
    accountVerificationRate
  }
}

function getPeriodDates(period: string, now: Date): { startDate: Date, endDate: Date } {
  const endDate = new Date(now)
  endDate.setHours(23, 59, 59, 999)
  
  let startDate: Date

  switch (period) {
    case 'today':
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '3months':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '6months':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
  }

  return { startDate, endDate }
}

async function refreshMetricsCache(supabaseClient: any): Promise<void> {
  const periods = ['today', 'week', 'month', '3months', '6months', 'year']
  
  for (const period of periods) {
    const metrics = await calculateMetrics(supabaseClient, period)
    
    // Cache the metrics
    await supabaseClient
      .from('dashboard_metrics_cache')
      .upsert({
        metric_name: 'dashboard_metrics',
        metric_value: metrics,
        period_type: period,
        period_start: getPeriodDates(period, new Date()).startDate.toISOString().split('T')[0],
        period_end: getPeriodDates(period, new Date()).endDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'metric_name,period_type,period_start,period_end'
      })
  }
}