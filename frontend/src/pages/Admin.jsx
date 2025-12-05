import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaUserShield, FaCrown, FaUsers, FaToggleOn, FaToggleOff, FaSync, FaCoins, FaGift } from 'react-icons/fa'
import { getUserId } from '../services/premiumService'
import { getAllUsers, setPremiumStatus, setPremiumPlan, removePremiumStatus, grantCredits } from '../services/adminService'
import { getCreditToken } from '../services/creditService'
import styles from './Admin.module.css'

function Admin() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [selectedPlan, setSelectedPlan] = useState('lifetime')
  const [creditsToGrant, setCreditsToGrant] = useState(100)
  const [grantingCredits, setGrantingCredits] = useState(null)

  useEffect(() => {
    const initializeAdmin = async () => {
      const userId = getUserId()
      setCurrentUserId(userId)
      await loadUsers()
      // Automatically set current user as admin/premium if not already
      const data = await getAllUsers()
      const currentUser = data.users?.find(u => u.userId === userId)
      if (!currentUser?.isPremium) {
        try {
          await setPremiumStatus(userId)
          showMessage('You have been set as admin/premium', 'success')
          await loadUsers()
        } catch (error) {
          console.error('Failed to set admin status:', error)
        }
      }
    }
    initializeAdmin()
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

  const handleSetPremiumPlan = async (userId, planId) => {
    setLoading(true)
    try {
      await setPremiumPlan(userId, planId)
      showMessage(`Premium ${planId} plan granted to ${userId}`, 'success')
      await loadUsers()
    } catch (error) {
      showMessage('Failed to set premium plan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleGrantCredits = async (userId) => {
    setGrantingCredits(userId)
    try {
      const token = getCreditToken()
      const result = await grantCredits(userId, creditsToGrant, token)
      showMessage(`Granted ${creditsToGrant} credits to ${userId}. New token: ${result.token.substring(0, 20)}...`, 'success')
      // If granting to current user, update their token
      if (userId === currentUserId && result.token) {
        localStorage.setItem('creditToken', result.token)
      }
    } catch (error) {
      showMessage('Failed to grant credits', 'error')
    } finally {
      setGrantingCredits(null)
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
                  <>
                    <button 
                      onClick={() => handleRemovePremium(user.userId)}
                      className={styles.btnSecondary}
                      disabled={loading}
                    >
                      Remove Premium
                    </button>
                    <div className={styles.planSelector}>
                      <label>Set Plan:</label>
                      <select 
                        value={selectedPlan} 
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className={styles.planSelect}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                      <button 
                        onClick={() => handleSetPremiumPlan(user.userId, selectedPlan)}
                        className={styles.btnPrimary}
                        disabled={loading}
                      >
                        <FaCrown /> Set Plan
                      </button>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => handleSetPremium(user.userId)}
                    className={styles.btnPrimary}
                    disabled={loading}
                  >
                    Grant Premium
                  </button>
                )}
                
                {/* Grant Credits Section */}
                <div className={styles.creditsSection}>
                  <label>Grant Credits:</label>
                  <div className={styles.creditsInput}>
                    <input
                      type="number"
                      min="1"
                      value={creditsToGrant}
                      onChange={(e) => setCreditsToGrant(parseInt(e.target.value) || 100)}
                      className={styles.creditsInputField}
                    />
                    <button 
                      onClick={() => handleGrantCredits(user.userId)}
                      className={styles.btnCredits}
                      disabled={loading || grantingCredits === user.userId}
                    >
                      {grantingCredits === user.userId ? (
                        <>
                          <FaSync className={styles.spinning} /> Granting...
                        </>
                      ) : (
                        <>
                          <FaCoins /> Grant Credits
                        </>
                      )}
                    </button>
                  </div>
                </div>
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

