import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, require: requiredPerm }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="full-center">
      <div className="spinner" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (!profile) return null

  if (requiredPerm && !profile) return <Navigate to="/no-access" replace />

  return children
}
