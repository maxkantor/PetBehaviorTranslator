import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { checkAdminSession } from '../services/adminService'
import { FaUserShield } from 'react-icons/fa'

function ProtectedAdminRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking, true = authenticated, false = not authenticated
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user has valid admin session
    const hasSession = checkAdminSession()
    setIsAuthenticated(hasSession)
    setLoading(false)
  }, [])

  if (loading || isAuthenticated === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <FaUserShield style={{ fontSize: '4rem', marginBottom: '20px' }} />
        <h2>Checking Admin Access...</h2>
        <p>Please wait...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login page
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default ProtectedAdminRoute

