import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaUserShield, FaCrown, FaUsers, FaToggleOn, FaToggleOff, FaSync } from 'react-icons/fa'
import { getUserId } from '../services/premiumService'
import { getAllUsers, setPremiumStatus, removePremiumStatus } from '../services/adminService'
import styles from './Admin.module.css'

function Admin() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  useEffect(() => {
    const userId = getUserId()
    setCurrentUserId(userId)
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data.users || [])
    } catch (error) {
      showMessage('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg, type) => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 3000)
  }

  const handleSetPremium = async (userId) => {
    setLoading(true)
    try {
      await setPremiumStatus(userId)
      showMessage(`Premium status granted to ${userId}`, 'success')
      await loadUsers()
    } catch (error) {
      showMessage('Failed to set premium status', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePremium = async (userId) => {
    setLoading(true)
    try {
      await removePremiumStatus(userId)
      showMessage(`Premium status removed from ${userId}`, 'success')
      await loadUsers()
    } catch (error) {
      showMessage('Failed to remove premium status', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMyStatus = async () => {
    const currentUser = users.find(u => u.userId === currentUserId)
    if (currentUser?.isPremium) {
      await handleRemovePremium(currentUserId)
    } else {
      await handleSetPremium(currentUserId)
    }
  }

  const currentUser = users.find(u => u.userId === currentUserId)
  const isCurrentUserPremium = currentUser?.isPremium || false

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          <FaUserShield className={styles.adminIcon} />
        </div>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>
          Manage users, credentials, and test premium features
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaToggleOn /> Quick Actions
        </h2>
        
        <div className={styles.quickActions}>
          {/* Current User Status */}
          <div className={styles.card}>
            <h3>Your Current Status</h3>
            <div className={styles.userInfo}>
              <p><strong>User ID:</strong></p>
              <code className={styles.userId}>{currentUserId}</code>
              <p className={styles.statusBadge}>
                {isCurrentUserPremium ? (
                  <span className={styles.premium}>
                    <FaCrown /> Premium
                  </span>
                ) : (
                  <span className={styles.free}>Free User</span>
                )}
              </p>
            </div>
            
            <button 
              onClick={handleToggleMyStatus}
              className={`${styles.toggleBtn} ${isCurrentUserPremium ? styles.btnDanger : styles.btnSuccess}`}
              disabled={loading}
            >
              {isCurrentUserPremium ? (
                <>
                  <FaToggleOff /> Switch to Free (Test Limits)
                </>
              ) : (
                <>
                  <FaToggleOn /> Switch to Premium (Test Features)
                </>
              )}
            </button>
          </div>

          {/* Refresh Button */}
          <div className={styles.card}>
            <h3>Refresh Data</h3>
            <p className={styles.cardDescription}>
              Reload all user data from the server
            </p>
            <button 
              onClick={loadUsers}
              className={styles.btnPrimary}
              disabled={loading}
            >
              <FaSync className={loading ? styles.spinning : ''} /> 
              {loading ? 'Loading...' : 'Refresh Users'}
            </button>
          </div>
        </div>
      </div>

      {/* All Users */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaUsers /> All Users ({users.length})
        </h2>
        
        <div className={styles.usersGrid}>
          {users.length === 0 && !loading && (
            <p className={styles.emptyState}>No users found</p>
          )}
          
          {users.map((user) => (
            <div key={user.userId} className={styles.userCard}>
              <div className={styles.userCardHeader}>
                <code className={styles.userCardId}>{user.userId}</code>
                {user.isPremium && (
                  <FaCrown className={styles.crownBadge} title="Premium User" />
                )}
              </div>
              
              <div className={styles.userStats}>
                <p><strong>Daily Count:</strong> {user.dailyCount || 0}</p>
                <p><strong>Status:</strong> {user.isPremium ? 'Premium' : 'Free'}</p>
                {user.premiumExpiresAt && (
                  <p className={styles.expiryDate}>
                    <strong>Expires:</strong> {new Date(user.premiumExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div className={styles.userActions}>
                {user.isPremium ? (
                  <button 
                    onClick={() => handleRemovePremium(user.userId)}
                    className={styles.btnSecondary}
                    disabled={loading}
                  >
                    Remove Premium
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSetPremium(user.userId)}
                    className={styles.btnPrimary}
                    disabled={loading}
                  >
                    Grant Premium
                  </button>
                )}
              </div>
              
              {user.userId === currentUserId && (
                <div className={styles.currentUserBadge}>
                  You
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Button */}
      <div className={styles.backButton}>
        <Link to="/" className={styles.btnBack}>
          <FaPaw /> Back to Translator
        </Link>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>&copy; 2025 Pet Behavior Translator. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Admin

