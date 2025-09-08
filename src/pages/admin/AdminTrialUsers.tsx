import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, UserCheck, UserPlus, Clock, AlertTriangle, Search, RefreshCw, Download, Calendar } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface TrialUserData {
  id: string
  phone_last_four: string
  signup_date: string
  trial_end: string
}

interface TrialUsersMetrics {
  newTrialsToday: number
  activeTrialUsers: number
  endingToday: number
  endingIn1Day: number
  endingIn2Days: number
  endingIn3Days: number
  expiredThisMonth: number
}

interface TrialUsersResponse {
  trialUsers: TrialUserData[]
  totalCount: number
  metrics: TrialUsersMetrics
}

export default function AdminTrialUsers() {
  const { user } = useAdminAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [trialUsersData, setTrialUsersData] = useState<TrialUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showExpired, setShowExpired] = useState(false)
  const limit = 50

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

  const fetchTrialUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: showExpired ? 'expired' : 'active',
        ...(search && { search })
      })

      const response = await fetch(
        `https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-dashboard/trial-users?${searchParams}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      const result = await response.json()
      
      if (result.success) {
        setTrialUsersData(result.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch trial users data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Trial users fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to load trial users data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchTrialUsers()
    setRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "Trial users data has been updated"
    })
  }

  const exportToCSV = () => {
    if (!trialUsersData) return

    const csvContent = [
      ['Phone (Last 4)', 'Sign-up Date', 'Trial Expiration Date'],
      ...trialUsersData.trialUsers.map(user => [
        `****-***-${user.phone_last_four}`,
        new Date(user.signup_date).toLocaleDateString(),
        new Date(user.trial_end).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTrialUsers()
  }

  useEffect(() => {
    fetchTrialUsers()
  }, [page, showExpired])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTrialEnd = (dateString: string) => {
    const trialEnd = new Date(dateString)
    const now = new Date()
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    let className = 'text-slate-600'
    let prefix = ''
    
    if (diffDays < 0) {
      className = 'text-red-600 font-medium'
      prefix = 'Expired '
    } else if (diffDays === 0) {
      className = 'text-red-600 font-medium'
      prefix = 'Ends today '
    } else if (diffDays === 1) {
      className = 'text-orange-600 font-medium'
      prefix = 'Ends tomorrow '
    } else if (diffDays <= 3) {
      className = 'text-yellow-600 font-medium'
      prefix = `Ends in ${diffDays} days `
    }
    
    return (
      <span className={className}>
        {prefix}{formatDate(dateString)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading trial users...</div>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/dashboard')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="border-l border-slate-300 h-6 mx-3" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Trial Users</h1>
                <p className="text-sm text-slate-600">Detailed trial user information and analytics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={refreshData}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                disabled={!trialUsersData?.trialUsers.length}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              
              <Badge variant="secondary">
                {user?.email}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Trials</CardTitle>
              <UserPlus className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {trialUsersData?.metrics.newTrialsToday || 0}
              </div>
              <p className="text-xs text-slate-600">
                Started today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trial Users</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {trialUsersData?.metrics.activeTrialUsers || 0}
              </div>
              <p className="text-xs text-slate-600">
                Currently on trial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ending Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(trialUsersData?.metrics.endingToday || 0) + 
                 (trialUsersData?.metrics.endingIn1Day || 0) + 
                 (trialUsersData?.metrics.endingIn2Days || 0) + 
                 (trialUsersData?.metrics.endingIn3Days || 0)}
              </div>
              <p className="text-xs text-slate-600">
                Next 3 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired This Month</CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {trialUsersData?.metrics.expiredThisMonth || 0}
              </div>
              <p className="text-xs text-slate-600">
                Trials expired
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ending Soon Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-orange-600">
                {trialUsersData?.metrics.endingToday || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Tomorrow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-600">
                {trialUsersData?.metrics.endingIn1Day || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">In 2 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-600">
                {trialUsersData?.metrics.endingIn2Days || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">In 3 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-600">
                {trialUsersData?.metrics.endingIn3Days || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Trial List</CardTitle>
                <CardDescription>
                  {trialUsersData?.totalCount || 0} {showExpired ? 'expired' : 'active'} trial users
                </CardDescription>
              </div>
              
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search by last 4 digits..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button type="submit" size="sm">
                  Search
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            {/* Toggle for Active/Expired */}
            <div className="flex items-center space-x-2 mb-6">
              <Switch
                id="show-expired"
                checked={showExpired}
                onCheckedChange={setShowExpired}
              />
              <Label htmlFor="show-expired" className="text-sm font-medium">
                Show expired trials
              </Label>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone (Last 4)</TableHead>
                    <TableHead>Sign-up Date</TableHead>
                    <TableHead>Trial Expiration Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialUsersData?.trialUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        ****-***-{user.phone_last_four}
                      </TableCell>
                      <TableCell>
                        {formatDate(user.signup_date)}
                      </TableCell>
                      <TableCell>
                        {formatTrialEnd(user.trial_end)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!trialUsersData?.trialUsers.length) && (
                <div className="text-center py-8 text-slate-500">
                  No trial users found
                </div>
              )}
            </div>

            {/* Pagination */}
            {trialUsersData && trialUsersData.totalCount > limit && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-slate-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, trialUsersData.totalCount)} of {trialUsersData.totalCount} trial users
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= trialUsersData.totalCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}