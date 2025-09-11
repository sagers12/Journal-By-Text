import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, UserCheck, TrendingUp, FileText, UserPlus, Shield, LogOut, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' },
]

export default function AdminDashboard() {
  const { user, logout } = useAdminAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [journalPeriod, setJournalPeriod] = useState('today')
  const [signupPeriod, setSignupPeriod] = useState('today')

  // Add noindex meta tag
  useEffect(() => {
    const metaTag = document.createElement('meta')
    metaTag.name = 'robots'
    metaTag.content = 'noindex, nofollow'
    document.head.appendChild(metaTag)

    return () => {
      document.head.removeChild(metaTag)
    }
  }, [])

  const fetchMetrics = async (period = 'today') => {
    try {
      // Use current Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-dashboard/metrics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.metrics)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch dashboard metrics",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Metrics fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshMetrics = async () => {
    setRefreshing(true)
    try {
      // Use current Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      // Refresh cache
      await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-dashboard/refresh-cache', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      // Fetch updated metrics
      await fetchMetrics(journalPeriod)
      
      toast({
        title: "Metrics Refreshed",
        description: "Dashboard metrics have been updated with latest data"
      })
    } catch (error) {
      console.error('Refresh error:', error)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh metrics. Please try again.",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics(journalPeriod)
  }, [journalPeriod, signupPeriod])

  const handleLogout = async () => {
    await logout()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-600">Journal by Text Analytics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/admin/user-management')}
                variant="outline"
                size="sm"
              >
                User Management
              </Button>
              
              <Button
                onClick={() => window.open('/admin/sms-testing', '_blank')}
                variant="outline"
                size="sm"
              >
                SMS Testing
              </Button>
              
              <Button
                onClick={refreshMetrics}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {user?.email}
                </Badge>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Paid Subscribers */}
          <Card 
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => navigate('/admin/dashboard/subscribers')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Subscribers</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics?.paidSubscribers || 0}
              </div>
              <p className="text-xs text-slate-600">
                Active paying customers
              </p>
            </CardContent>
          </Card>

          {/* Trial Users */}
          <Card 
            className="cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => navigate('/admin/dashboard/trial-users')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {metrics?.trialUsers || 0}
              </div>
              <p className="text-xs text-slate-600">
                Active trial accounts
              </p>
            </CardContent>
          </Card>

          {/* Trial Conversion Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {metrics?.trialConversionRate || 0}%
              </div>
              <p className="text-xs text-slate-600">
                Trial to paid (30 days)
              </p>
            </CardContent>
          </Card>

          {/* Account Verification Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {metrics?.accountVerificationRate || 0}%
              </div>
              <p className="text-xs text-slate-600">
                Verified accounts ({signupPeriod})
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Journal Entries */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-slate-600" />
                    Journal Entries
                  </CardTitle>
                  <CardDescription>
                    Entries created in selected period
                  </CardDescription>
                </div>
                <Select value={journalPeriod} onValueChange={setJournalPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {metrics?.journalEntries.count || 0}
              </div>
              <div className="text-sm text-slate-600">
                <strong>Avg per active user/week:</strong> {metrics?.avgEntriesPerUser || 0}
              </div>
            </CardContent>
          </Card>

          {/* New Signups */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-slate-600" />
                    New Sign-ups
                  </CardTitle>
                  <CardDescription>
                    User registrations in selected period
                  </CardDescription>
                </div>
                <Select value={signupPeriod} onValueChange={setSignupPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {metrics?.newSignups.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Future Charts Section */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
            <CardDescription>
              Detailed analytics and trend charts will be available here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Trend charts coming soon</p>
                <p className="text-sm">Historical data visualization and analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}