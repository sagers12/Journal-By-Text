import { useState, useEffect, createContext, useContext } from 'react'
import { useToast } from '@/hooks/use-toast'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  last_login_at: string | null
}

interface AdminAuthContextType {
  user: AdminUser | null
  session: string | null
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
  const [session, setSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Check for existing session on load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedSession = localStorage.getItem('admin_session_token')
      const storedUser = localStorage.getItem('admin_user')
      
      if (storedSession && storedUser) {
        try {
          const isValid = await verifySession(storedSession)
          if (isValid) {
            setSession(storedSession)
            setUser(JSON.parse(storedUser))
          } else {
            // Clear invalid session
            localStorage.removeItem('admin_session_token')
            localStorage.removeItem('admin_user')
          }
        } catch (error) {
          console.error('Session verification error:', error)
          localStorage.removeItem('admin_session_token')
          localStorage.removeItem('admin_user')
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      const response = await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive"
        })
        return false
      }

      if (data.success) {
        setUser(data.user)
        setSession(data.session_token)
        
        // Store in localStorage
        localStorage.setItem('admin_session_token', data.session_token)
        localStorage.setItem('admin_user', JSON.stringify(data.user))
        
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in to the admin dashboard."
        })
        return true
      }

      return false
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
      const sessionToken = localStorage.getItem('admin_session_token')
      
      if (sessionToken) {
        await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state regardless of API call success
      setUser(null)
      setSession(null)
      localStorage.removeItem('admin_session_token')
      localStorage.removeItem('admin_user')
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      })
    }
  }

  const verifySessionMethod = async (): Promise<boolean> => {
    const sessionToken = localStorage.getItem('admin_session_token')
    if (!sessionToken) return false
    
    return await verifySession(sessionToken)
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

// Helper function to verify session with API
const verifySession = async (sessionToken: string): Promise<boolean> => {
  try {
    const response = await fetch('https://zfxdjbpjxpgreymebpsr.supabase.co/functions/v1/admin-auth/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return response.ok && data.success
  } catch (error) {
    console.error('Session verification error:', error)
    return false
  }
}

export { AdminAuthContext }