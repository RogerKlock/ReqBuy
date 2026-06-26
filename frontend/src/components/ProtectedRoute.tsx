import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import LoadingSpinner from './ui/LoadingSpinner'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
