import { useState, useEffect, createContext, useContext } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  last_login_at: string | null
}

interface AdminAuthContextType {
  user: AdminUser | null
  session: Session | null
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
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Check for existing session on load
  useEffect(() => {
    const initializeAuth = async () => {
      // Get the current Supabase session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (currentSession) {
        // Check if this user is an admin
        const { data: adminUser, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', currentSession.user.id)
          .eq('is_active', true)
          .single()
        
        if (adminUser && !error) {
          setSession(currentSession)
          setUser(adminUser)
        }
      }
      setLoading(false)
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && event === 'SIGNED_IN') {
          // Check if this user is an admin
          const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', session.user.id)
            .eq('is_active', true)
            .single()
          
          if (adminUser && !error) {
            setSession(session)
            setUser(adminUser)
          } else {
            setSession(null)
            setUser(null)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
        }
      }
    )

    initializeAuth()

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      // Use regular Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        })
        return false
      }

      if (data.session) {
        // Check if this user is an admin
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', data.session.user.id)
          .eq('is_active', true)
          .single()
        
        if (adminError || !adminUser) {
          await supabase.auth.signOut()
          toast({
            title: "Access Denied",
            description: "You do not have admin access to this dashboard.",
            variant: "destructive"
          })
          return false
        }

        // Update last login
        await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', adminUser.id)

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
      await supabase.auth.signOut()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      })
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      })
    }
  }

  const verifySessionMethod = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) return false
    
    // Check if user is still an admin
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', session.user.id)
      .eq('is_active', true)
      .single()
    
    return !error && !!adminUser
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


export { AdminAuthContext }