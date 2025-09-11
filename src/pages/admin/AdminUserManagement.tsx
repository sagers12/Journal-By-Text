import { useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Shield, Trash2, Search, User, Phone, Mail, Calendar, ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  phone_number?: string
  phone_verified: boolean
  timezone: string
  reminder_enabled: boolean
  created_at: string
  updated_at: string
}

interface UserData {
  profile: UserProfile
  email: string
  created_at: string
  subscription_status?: 'trial' | 'active' | 'expired'
}

interface DeletionSummary {
  userId: string
  userEmail: string
  deletedRecords: {
    journalEntries: number
    journalPhotos: number
    smsMessages: number
    profileRecord: boolean
    subscriberRecord: boolean
    userPromptHistory: number
    smsConsents: number
  }
  filesDeleted: string[]
  filesFailedToDelete: string[]
}

export default function AdminUserManagement() {
  const { user: adminUser } = useAdminAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [lastDeletion, setLastDeletion] = useState<DeletionSummary | null>(null)

  const searchUser = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      let profile = null
      let subscriber = null

      // Search by UUID first
      if (searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', searchTerm)
          .single()

        if (data && !error) {
          profile = data
        }
      } else {
        // Search by email or phone
        // First try to find by email in subscribers table
        const { data: subscriberData } = await supabase
          .from('subscribers')
          .select('*, profiles(*)')
          .eq('email', searchTerm)
          .single()

        if (subscriberData?.profiles) {
          profile = subscriberData.profiles
          subscriber = subscriberData
        } else {
          // Search by phone number in profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone_number', searchTerm)
            .single()

          if (profileData) {
            profile = profileData
          }
        }
      }

      if (profile) {
        // Get subscriber info if we don't have it
        if (!subscriber) {
          const { data: subscriberData } = await supabase
            .from('subscribers')
            .select('*')
            .eq('user_id', profile.id)
            .single()
          subscriber = subscriberData
        }

        // Determine subscription status
        let subscription_status: 'trial' | 'active' | 'expired' = 'expired'
        if (subscriber) {
          if (subscriber.is_trial && subscriber.trial_end) {
            subscription_status = new Date(subscriber.trial_end) > new Date() ? 'trial' : 'expired'
          } else if (subscriber.subscribed) {
            subscription_status = 'active'
          }
        }

        setUserData({
          profile,
          email: subscriber?.email || 'No email found',
          created_at: profile.created_at,
          subscription_status
        })
      } else {
        setUserData(null)
        toast({
          title: "User not found",
          description: "No user found with that UUID, email, or phone number",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({
        title: "Search failed",
        description: "Failed to search for user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async () => {
    if (!userData || confirmationText !== 'DELETE') return

    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      const response = await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/delete-user-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.profile.id,
          confirmationText: confirmationText
        })
      })

      const data = await response.json()

      if (data.success) {
        setLastDeletion(data.summary)
        setUserData(null)
        setSearchTerm('')
        setConfirmationText('')
        
        toast({
          title: "User deleted successfully",
          description: `User ${data.summary.userEmail} has been permanently deleted`,
        })
      } else {
        toast({
          title: "Deletion failed",
          description: data.error || "Failed to delete user",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Deletion failed",
        description: "An error occurred while deleting the user",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
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
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                <p className="text-sm text-slate-600">Delete user accounts and data</p>
              </div>
            </div>
            
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {adminUser?.email}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Find User
            </CardTitle>
            <CardDescription>
              Search by User UUID, email, or phone number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="search">User ID, Email, or Phone</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Enter user UUID, email, or phone number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={searchUser} 
                  disabled={loading || !searchTerm.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        {userData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">User ID</Label>
                  <p className="text-sm text-slate-600 font-mono">{userData.profile.id}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    Email
                  </Label>
                  <p className="text-sm text-slate-600">{userData.email}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Phone Number
                  </Label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-slate-600">{userData.profile.phone_number || 'Not provided'}</p>
                    {userData.profile.phone_verified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Unverified</Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created
                  </Label>
                  <p className="text-sm text-slate-600">
                    {new Date(userData.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subscription Status</Label>
                  <div>
                    {userData.subscription_status === 'trial' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Trial</Badge>
                    )}
                    {userData.subscription_status === 'active' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                    )}
                    {userData.subscription_status === 'expired' && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">Expired</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete User Section */}
        {userData && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
                <Trash2 className="w-5 h-5 mr-2" />
                Delete User Account
              </CardTitle>
              <CardDescription>
                Permanently delete this user and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  <strong>Warning:</strong> This will permanently delete:
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>User authentication account</li>
                    <li>All journal entries and photos</li>
                    <li>SMS message history</li>
                    <li>User profile and settings</li>
                    <li>Subscription records</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="lg" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete User Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to permanently delete the account for:
                      <div className="mt-2 p-2 bg-slate-100 rounded text-sm font-mono">
                        {userData?.email}
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="confirmation">Type "DELETE" to confirm:</Label>
                        <Input
                          id="confirmation"
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          placeholder="DELETE"
                          className="font-mono"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmationText('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteUser}
                      disabled={confirmationText !== 'DELETE' || deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Last Deletion Summary */}
        {lastDeletion && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Last Deletion Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>User:</strong> {lastDeletion.userEmail}</p>
                <p><strong>Records Deleted:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Journal Entries: {lastDeletion.deletedRecords.journalEntries}</li>
                  <li>• Photos: {lastDeletion.deletedRecords.journalPhotos}</li>
                  <li>• SMS Messages: {lastDeletion.deletedRecords.smsMessages}</li>
                  <li>• Files Deleted: {lastDeletion.filesDeleted.length}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}