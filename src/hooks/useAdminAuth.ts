import { useState, useEffect, createContext, useContext } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  last_login_at: string | null
}

interface AdminAuthContextType {
  user: AdminUser | null
  session: any | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  verifySession: () => Promise<boolean>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

export const useAdminAuthState = () => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Check for existing session on load
  useEffect(() => {
    const initializeAuth = async () => {
      // Get current Supabase session
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      
      if (supabaseSession) {
        try {
          // Check if this user is an admin
          const isValid = await verifyAdminStatus(supabaseSession.access_token)
          if (isValid) {
            setSession(supabaseSession)
            setUser(isValid.user)
          }
        } catch (error) {
          console.error('Admin verification error:', error)
        }
      }
      setLoading(false)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (event === 'SIGNED_OUT' || !supabaseSession) {
        setUser(null)
        setSession(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const adminCheck = await verifyAdminStatus(supabaseSession.access_token)
          if (adminCheck) {
            setSession(supabaseSession)
            setUser(adminCheck.user)
          } else {
            setUser(null)
            setSession(null)
          }
        } catch (error) {
          console.error('Admin verification error:', error)
          setUser(null)
          setSession(null)
        }
      }
    })

    initializeAuth()

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.session) {
        toast({
          title: "Login Failed",
          description: authError?.message || "Invalid credentials",
          variant: "destructive"
        })
        return false
      }

      // Check if user is admin
      const adminCheck = await verifyAdminStatus(authData.session.access_token)
      
      if (!adminCheck) {
        // Sign out if not admin
        await supabase.auth.signOut()
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges.",
          variant: "destructive"
        })
        return false
      }

      setUser(adminCheck.user)
      setSession(authData.session)
      
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in to the admin dashboard."
      })
      return true
    } catch (error) {
      console.error('Login error:', error)
      toast({
        title: "Login Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive"
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Clear state anyway
      setUser(null)
      setSession(null)
    }
  }

  const verifySessionMethod = async (): Promise<boolean> => {
    if (!session) return false
    
    try {
      const adminCheck = await verifyAdminStatus(session.access_token)
      return !!adminCheck
    } catch (error) {
      console.error('Session verification error:', error)
      return false
    }
  }

  return {
    user,
    session,
    loading,
    login,
    logout,
    verifySession: verifySessionMethod
  }
}

// Helper function to verify admin status
const verifyAdminStatus = async (accessToken: string): Promise<{ user: AdminUser } | null> => {
  try {
    const response = await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-auth/check-admin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    if (response.ok && data.success) {
      return { user: data.user }
    }
    return null
  } catch (error) {
    console.error('Admin verification error:', error)
    return null
  }
}

export { AdminAuthContext }