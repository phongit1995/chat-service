import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@chat/shared'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loadUser } = useAuthStore()

  useEffect(() => {
    loadUser()
  }, [loadUser])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
