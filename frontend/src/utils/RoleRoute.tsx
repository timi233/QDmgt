import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Result, Button } from 'antd'
import { isAuthenticated, getCurrentUser } from '../services/authService'
import { useNavigate } from 'react-router-dom'

interface RoleRouteProps {
  children: ReactNode
  allowedRoles: string[]
}

/**
 * Role-based Route Guard
 * Checks if user has required role before allowing access
 * Admin role has access to all routes
 * Shows 403 error if user lacks required role
 */
export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()
  const user = getCurrentUser()

  // First check authentication
  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  // Admin has access to all routes
  if (user?.role === 'admin') {
    return <>{children}</>
  }

  // Then check role
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Result
          status="403"
          title="403"
          subTitle="Sorry, you do not have permission to access this page."
          extra={
            <Button type="primary" onClick={() => navigate('/workspace')}>
              Back to Workspace
            </Button>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}
