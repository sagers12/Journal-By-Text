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
import { ArrowLeft, Users, UserPlus, Clock, Search, RefreshCw, Download, UserX } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface SubscriberData {
  id: string
  phone_last_four: string
  signup_date: string
  subscription_date: string | null
}

interface SubscribersMetrics {
  totalSubscribers: number
  newSubscribersThisMonth: number
  averageDuration: number
  cancelledThisMonth: number
}

interface SubscribersResponse {
  subscribers: SubscriberData[]
  totalCount: number
  metrics: SubscribersMetrics
}

export default function AdminSubscribers() {
  const { user } = useAdminAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [subscribersData, setSubscribersData] = useState<SubscribersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
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

  const fetchSubscribers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      })

      const response = await fetch(
        `https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-dashboard/subscribers?${searchParams}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      const result = await response.json()
      
      if (result.success) {
        setSubscribersData(result.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch subscribers data",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Subscribers fetch error:', error)
      toast({
        title: "Error",
        description: "Failed to load subscribers data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchSubscribers()
    setRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "Subscribers data has been updated"
    })
  }

  const exportToCSV = () => {
    if (!subscribersData) return

    const csvContent = [
      ['Phone (Last 4)', 'Sign-up Date', 'Subscription Date'],
      ...subscribersData.subscribers.map(sub => [
        `****-***-${sub.phone_last_four}`,
        new Date(sub.signup_date).toLocaleDateString(),
        sub.subscription_date ? new Date(sub.subscription_date).toLocaleDateString() : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSubscribers()
  }

  useEffect(() => {
    fetchSubscribers()
  }, [page])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading subscribers...</div>
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
                <h1 className="text-2xl font-bold text-slate-900">Subscribers</h1>
                <p className="text-sm text-slate-600">Detailed subscriber information and analytics</p>
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
                disabled={!subscribersData?.subscribers.length}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {subscribersData?.metrics.totalSubscribers || 0}
              </div>
              <p className="text-xs text-slate-600">
                Active paying customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Subscribers</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {subscribersData?.metrics.newSubscribersThisMonth || 0}
              </div>
              <p className="text-xs text-slate-600">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {subscribersData?.metrics.averageDuration || 0}
              </div>
              <p className="text-xs text-slate-600">
                Months subscribed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled This Month</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {subscribersData?.metrics.cancelledThisMonth || 0}
              </div>
              <p className="text-xs text-slate-600">
                Cancellations this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Subscriber List</CardTitle>
                <CardDescription>
                  {subscribersData?.totalCount || 0} total subscribers
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone (Last 4)</TableHead>
                    <TableHead>Sign-up Date</TableHead>
                    <TableHead>Subscription Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribersData?.subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">
                        ****-***-{subscriber.phone_last_four}
                      </TableCell>
                      <TableCell>
                        {formatDate(subscriber.signup_date)}
                      </TableCell>
                      <TableCell>
                        {subscriber.subscription_date 
                          ? formatDate(subscriber.subscription_date)
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {(!subscribersData?.subscribers.length) && (
                <div className="text-center py-8 text-slate-500">
                  No subscribers found
                </div>
              )}
            </div>

            {/* Pagination */}
            {subscribersData && subscribersData.totalCount > limit && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-slate-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, subscribersData.totalCount)} of {subscribersData.totalCount} subscribers
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
                    disabled={page * limit >= subscribersData.totalCount}
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