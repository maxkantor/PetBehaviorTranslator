import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { checkAdmin } from '../services/adminService'
import { FaUserShield } from 'react-icons/fa'

function ProtectedAdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(null) // null = checking, true = admin, false = not admin
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const adminStatus = await checkAdmin()
        setIsAdmin(adminStatus)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    verifyAdmin()
  }, [])

  if (loading || isAdmin === null) {
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

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedAdminRoute
