import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, session, loading } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if we're done loading and there's no valid session
    if (!loading && (!user || !session)) {
      navigate('/admin/login', { replace: true })
    }
  }, [user, session, loading, navigate])

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading admin dashboard...</div>
      </div>
    )
  }

  // Don't render children if no auth
  if (!user || !session) {
    return null
  }

  return <>{children}</>
}