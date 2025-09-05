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

interface SubscriberData {
  id: string
  phone_last_four: string
  signup_date: string
  subscription_date: string | null
}

interface SubscribersResponse {
  subscribers: SubscriberData[]
  totalCount: number
  metrics: {
    totalSubscribers: number
    newSubscribersThisMonth: number
    averageDuration: number
  }
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

    // Verify admin access using Supabase auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)

    // Get user from Supabase auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.log('User verification failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.log('Admin user not found:', adminError)
      return new Response(
        JSON.stringify({ error: 'Access denied - not an admin user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    if (action === 'subscribers') {
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const search = url.searchParams.get('search') || ''
      
      const subscribersData = await getSubscribersData(supabaseClient, page, limit, search)
      
      return new Response(
        JSON.stringify({ success: true, data: subscribersData }),
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

  // Get subscription events for enhanced metrics
  const { data: subscriptionEvents } = await supabaseClient
    .from('subscription_events')
    .select('*')
    .gte('event_date', startDate.toISOString())
    .lte('event_date', endDate.toISOString())

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

  // Calculate re-subscription metrics
  const resubscriptionEvents = subscriptionEvents?.filter(e => e.event_type === 'resubscribed') || []
  const cancellationEvents = subscriptionEvents?.filter(e => e.event_type === 'cancelled') || []
  const resubscriptionRate = cancellationEvents.length > 0 ? (resubscriptionEvents.length / cancellationEvents.length * 100) : 0
  
  // Calculate average subscription duration (for cancelled subscriptions)
  const { data: cancelledSubscribers } = await supabaseClient
    .from('subscribers')
    .select('first_subscription_date, subscription_end')
    .eq('subscribed', false)
    .not('first_subscription_date', 'is', null)
    .not('subscription_end', 'is', null)
    
  const totalDuration = (cancelledSubscribers || []).reduce((sum, sub) => {
    const startDate = new Date(sub.first_subscription_date)
    const endDate = new Date(sub.subscription_end)
    return sum + (endDate.getTime() - startDate.getTime())
  }, 0)
  const avgSubscriptionDays = (cancelledSubscribers?.length || 0) > 0 ? 
    Math.round(totalDuration / ((cancelledSubscribers?.length || 1) * 24 * 60 * 60 * 1000)) : 0

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
    accountVerificationRate,
    resubscriptionRate: Math.round(resubscriptionRate * 100) / 100,
    avgSubscriptionDays,
    totalCancellations: cancellationEvents.length,
    totalResubscriptions: resubscriptionEvents.length
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

async function getSubscribersData(supabaseClient: any, page: number, limit: number, search: string): Promise<SubscribersResponse> {
  const offset = (page - 1) * limit
  const now = new Date()
  
  // Get total count for pagination first
  const { count: totalCount } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('subscribed', true)
    .eq('is_trial', false)
  
  // Since there's no foreign key, we need to use RPC or do a manual query
  // Let's use a direct query with manual join
  let sqlQuery = `
    SELECT 
      s.id,
      s.created_at,
      s.updated_at,
      s.first_subscription_date,
      s.subscribed,
      s.is_trial,
      s.user_id,
      p.phone_number,
      p.created_at as profile_created_at
    FROM subscribers s
    INNER JOIN profiles p ON s.user_id = p.id
    WHERE s.subscribed = true 
      AND s.is_trial = false
      AND p.phone_number IS NOT NULL
  `
  
  // Add search filter if provided
  if (search) {
    sqlQuery += ` AND p.phone_number ILIKE '%${search}%'`
  }
  
  sqlQuery += ` ORDER BY s.updated_at DESC LIMIT ${limit} OFFSET ${offset}`
  
  const { data: subscribersData, error } = await supabaseClient.rpc('exec_sql', { 
    sql: sqlQuery 
  })
  
  // If RPC doesn't work, fall back to separate queries
  if (error) {
    console.log('RPC failed, using fallback approach:', error)
    
    // Get subscribers first
    const { data: subs, error: subsError } = await supabaseClient
      .from('subscribers')
      .select('id, created_at, updated_at, first_subscription_date, user_id')
      .eq('subscribed', true)
      .eq('is_trial', false)
      .order('first_subscription_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (subsError) {
      console.error('Error fetching subscribers:', subsError)
      throw subsError
    }
    
    // Get profiles for these subscribers
    const userIds = (subs || []).map(sub => sub.user_id)
    if (userIds.length === 0) {
      return {
        subscribers: [],
        totalCount: totalCount || 0,
        metrics: {
          totalSubscribers: totalCount || 0,
          newSubscribersThisMonth: 0,
          averageDuration: 0
        }
      }
    }
    
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, phone_number, created_at')
      .in('id', userIds)
      .not('phone_number', 'is', null)
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }
    
    // Combine the data
    const combinedData = (subs || []).map(sub => {
      const profile = (profiles || []).find(p => p.id === sub.user_id)
      return {
        ...sub,
        profiles: profile ? {
          phone_number: profile.phone_number,
          created_at: profile.created_at
        } : null
      }
    }).filter(sub => sub.profiles) // Only include subscribers with profiles
    
    return await processSubscribersData(supabaseClient, combinedData, totalCount, now)
  }
  
  return await processSubscribersData(supabaseClient, subscribersData, totalCount, now)
}

async function processSubscribersData(supabaseClient: any, subscribersData: any[], totalCount: number, now: Date) {
  // Process the data
  const subscribers: SubscriberData[] = (subscribersData || []).map((sub: any) => {
    // Handle both the joined data format and the separate queries format
    const phoneNumber = sub.profiles?.phone_number || sub.phone_number || ''
    const phone_last_four = phoneNumber.length >= 4 ? phoneNumber.slice(-4) : phoneNumber
    
    return {
      id: sub.id,
      phone_last_four,
      signup_date: sub.profiles?.created_at || sub.profile_created_at || sub.created_at,
      subscription_date: sub.first_subscription_date || sub.updated_at // Use first_subscription_date, fallback to updated_at
    }
  })
  
  // Calculate metrics
  const totalSubscribers = totalCount || 0
  
  // New subscribers this month (based on first subscription date)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const { count: newSubscribersThisMonth } = await supabaseClient
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('subscribed', true)
    .eq('is_trial', false)
    .gte('first_subscription_date', thisMonthStart.toISOString())
  
  // Calculate average duration (in months) based on first subscription date
  const { data: allSubscribers } = await supabaseClient
    .from('subscribers')
    .select('first_subscription_date, updated_at')
    .eq('subscribed', true)
    .eq('is_trial', false)
  
  let averageDuration = 0
  if (allSubscribers && allSubscribers.length > 0) {
    const totalMonths = allSubscribers.reduce((acc: number, sub: any) => {
      // Use first_subscription_date if available, fallback to updated_at
      const subscriptionDate = new Date(sub.first_subscription_date || sub.updated_at)
      const monthsDiff = (now.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44) // Average days per month
      return acc + Math.max(monthsDiff, 0)
    }, 0)
    averageDuration = Math.round((totalMonths / allSubscribers.length) * 10) / 10
  }
  
  // Calculate cancellations this month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data: cancellationsThisMonth } = await supabaseClient
    .from('subscription_events')
    .select('id', { count: 'exact' })
    .eq('event_type', 'cancelled')
    .gte('event_date', thisMonthStart.toISOString())

  return {
    subscribers,
    totalCount: totalCount || 0,
    metrics: {
      totalSubscribers,
      newSubscribersThisMonth: newSubscribersThisMonth || 0,
      averageDuration,
      cancelledThisMonth: cancellationsThisMonth?.length || 0
    }
  }
}