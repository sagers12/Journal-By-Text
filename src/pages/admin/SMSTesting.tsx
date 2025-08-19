import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, MessageSquare, Activity, Users, ArrowLeft, RefreshCw, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface SMSTestResult {
  id: string
  test_type: string
  phone_number: string
  message_content: string
  success: boolean
  webhook_status: number | null
  created_at: string
}

interface SMSStats {
  totalMessages: number
  successRate: number
  avgProcessingTime: number
  recentErrors: number
}

export default function SMSTesting() {
  const { user } = useAdminAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testResults, setTestResults] = useState<SMSTestResult[]>([])
  const [smsStats, setSmsStats] = useState<SMSStats | null>(null)

  const TEST_MESSAGES = {
    short: 'Test message - short format',
    medium: 'This is a medium-length test message that contains several sentences to test how the SMS system processes moderately sized content. It should be processed normally without any truncation issues.',
    long: 'This is an extremely long test message designed to test the SMS processing system with a substantial amount of content. '.repeat(50),
    unicode: '🎉 Unicode test: café, résumé, naïve, emoji 🚀 中文测试 العربية test עברית ñoño',
    empty: '',
    oversized: 'X'.repeat(15000)
  }

  useEffect(() => {
    fetchTestResults()
    fetchSMSStats()
  }, [])

  const fetchTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_test_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTestResults(data || [])
    } catch (error) {
      console.error('Error fetching test results:', error)
    }
  }

  const fetchSMSStats = async () => {
    try {
      // Get SMS processing statistics
      const { data: messages } = await supabase
        .from('sms_messages')
        .select('processed, received_at, entry_id')
        .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const totalMessages = messages?.length || 0
      const processedMessages = messages?.filter(m => m.processed).length || 0
      const successRate = totalMessages > 0 ? (processedMessages / totalMessages) * 100 : 0

      // Get recent errors
      const { data: errors } = await supabase
        .from('sms_messages')
        .select('error_message')
        .not('error_message', 'is', null)
        .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      setSmsStats({
        totalMessages,
        successRate,
        avgProcessingTime: 1.2, // Mock data for now
        recentErrors: errors?.length || 0
      })
    } catch (error) {
      console.error('Error fetching SMS stats:', error)
    }
  }

  const runTest = async (testType: keyof typeof TEST_MESSAGES) => {
    if (!testPhone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number for testing",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/sms-test-suite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType,
          phoneNumber: testPhone
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Test Sent Successfully",
          description: `${testType} message test completed`
        })
        await fetchTestResults()
        await fetchSMSStats()
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: "Test Error",
        description: "Failed to execute test. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const runHealthCheck = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/sms-health-check', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      const result = await response.json()
      
      toast({
        title: result.overall_status === 'healthy' ? "System Healthy" : "System Issues Detected",
        description: `${result.checks_passed} passed, ${result.checks_failed} failed`,
        variant: result.overall_status === 'healthy' ? "default" : "destructive"
      })
    } catch (error) {
      console.error('Health check error:', error)
      toast({
        title: "Health Check Failed",
        description: "Unable to perform health check",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="w-px h-6 bg-slate-300" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">SMS Testing Dashboard</h1>
                <p className="text-sm text-slate-600">Test and monitor SMS message processing</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={runHealthCheck}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Activity className={`w-4 h-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
                Health Check
              </Button>
              
              <Button
                onClick={() => { fetchTestResults(); fetchSMSStats(); }}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages (24h)</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{smsStats?.totalMessages || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {smsStats?.successRate.toFixed(1) || 0}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              <Activity className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{smsStats?.avgProcessingTime || 0}s</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{smsStats?.recentErrors || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Testing Interface */}
        <Tabs defaultValue="testing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="testing">Message Testing</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
          </TabsList>

          <TabsContent value="testing" className="space-y-6">
            {/* Test Phone Input */}
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
                <CardDescription>Configure test parameters before running tests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Test Phone Number</Label>
                  <Input
                    id="testPhone"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="max-w-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Test Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Message Tests</CardTitle>
                <CardDescription>Run different types of message tests to verify SMS processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(TEST_MESSAGES).map(([type, message]) => (
                    <Card key={type} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium capitalize">{type} Message</h4>
                          <Badge variant="outline">{message.length} chars</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {message.slice(0, 80)}{message.length > 80 ? '...' : ''}
                        </p>
                        <Button
                          onClick={() => runTest(type as keyof typeof TEST_MESSAGES)}
                          disabled={loading || !testPhone.trim()}
                          size="sm"
                          className="w-full"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Test {type}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Recent Test Results</CardTitle>
                <CardDescription>Latest SMS test executions and their outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.test_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{result.phone_number}</span>
                          <Badge variant="outline">
                            {result.webhook_status || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {result.message_content.slice(0, 100)}...
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className={`text-sm font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                          {result.success ? 'Success' : 'Failed'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(result.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {testResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No test results available. Run some tests to see results here.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}