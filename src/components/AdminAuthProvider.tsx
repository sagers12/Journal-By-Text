import { AdminAuthContext, useAdminAuthState } from '@/hooks/useAdminAuth'

interface AdminAuthProviderProps {
  children: React.ReactNode
}

export const AdminAuthProvider = ({ children }: AdminAuthProviderProps) => {
  const auth = useAdminAuthState()

  return (
    <AdminAuthContext.Provider value={auth}>
      {children}
    </AdminAuthContext.Provider>
  )
}