import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '../services/authService'

interface PrivateRouteProps {
  children: ReactNode
}

/**
 * Private Route Guard
 * Checks if user is authenticated before allowing access
 * Redirects to login page if not authenticated
 */
export default function PrivateRoute({ children }: PrivateRouteProps) {
  const authenticated = isAuthenticated()

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
