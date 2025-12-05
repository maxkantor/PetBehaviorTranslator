import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaUserShield, FaCrown, FaUsers, FaToggleOn, FaToggleOff, FaSync, FaCoins, FaGift, FaHistory, FaRedo, FaTrash } from 'react-icons/fa'
import { getUserId } from '../services/premiumService'
import { checkAdmin, getAllUsers, setPremiumStatus, setPremiumPlan, removePremiumStatus, grantCredits, getActivities, resetUserActivities, resetAllActivities } from '../services/adminService'
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
  const [activities, setActivities] = useState([])
  const [showActivities, setShowActivities] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const initializeAdmin = async () => {
      const userId = getUserId()
      setCurrentUserId(userId)
      try {
        // Check if user is admin first
        const adminStatus = await checkAdmin()
        setIsAdmin(adminStatus)
        
        if (!adminStatus) {
          showMessage('Access denied. Admin access required. Set ADMIN_USER_ID environment variable to your user ID.', 'error')
          return
        }
        
        await loadUsers()
      } catch (error) {
        if (error.response?.status === 401) {
          showMessage('Access denied. Admin access required. Set ADMIN_USER_ID environment variable to your user ID.', 'error')
          setIsAdmin(false)
        } else {
          console.error('Failed to initialize admin:', error)
          showMessage('Failed to load admin dashboard', 'error')
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
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        showMessage('Failed to grant credits', 'error')
      }
    } finally {
      setGrantingCredits(null)
    }
  }

  const loadActivities = async () => {
    try {
      const data = await getActivities()
      setActivities(data.activities || [])
    } catch (error) {
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        showMessage('Failed to load activities', 'error')
      }
    }
  }

  const handleResetUser = async (userId) => {
    if (!window.confirm(`Reset activities for user ${userId}?`)) {
      return
    }
    setLoading(true)
    try {
      await resetUserActivities(userId)
      showMessage(`Activities reset for user ${userId}`, 'success')
      await loadUsers()
      await loadActivities()
    } catch (error) {
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        showMessage('Failed to reset user activities', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetAll = async () => {
    if (!window.confirm('Reset ALL user activities? This cannot be undone.')) {
      return
    }
    setLoading(true)
    try {
      await resetAllActivities()
      showMessage('All user activities reset', 'success')
      await loadUsers()
      await loadActivities()
    } catch (error) {
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        showMessage('Failed to reset all activities', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentUser = users.find(u => u.userId === currentUserId)
  const isCurrentUserPremium = currentUser?.isPremium || false

  // If not admin, show access denied message
  if (!isAdmin && !loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <FaUserShield className={styles.adminIcon} />
          </div>
          <h1 className={styles.title}>Access Denied</h1>
          <p className={styles.subtitle}>
            Admin access required. Set ADMIN_USER_ID environment variable to your user ID.
          </p>
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'left', maxWidth: '600px', margin: '1rem auto' }}>
            <p style={{ marginBottom: '0.5rem' }}><strong>Your User ID:</strong></p>
            <code style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '4px', display: 'block', wordBreak: 'break-all' }}>{currentUserId}</code>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.9 }}>
              Copy this User ID and set it as the <code>ADMIN_USER_ID</code> environment variable in your Lambda function configuration.
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
              After setting the environment variable, redeploy your Lambda function and refresh this page.
            </p>
          </div>
          <Link to="/" className={styles.btnBack} style={{ marginTop: '2rem' }}>
            <FaPaw /> Back to Translator
          </Link>
        </div>
      </div>
    )
  }

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

          {/* Activity Log */}
          <div className={styles.card}>
            <h3>Activity Log</h3>
            <p className={styles.cardDescription}>
              View and manage user activities
            </p>
            <div className={styles.cardActions}>
              <button 
                onClick={() => {
                  setShowActivities(!showActivities)
                  if (!showActivities) {
                    loadActivities()
                  }
                }}
                className={styles.btnPrimary}
              >
                <FaHistory /> {showActivities ? 'Hide' : 'Show'} Activities
              </button>
              <button 
                onClick={handleResetAll}
                className={styles.btnDanger}
                disabled={loading}
              >
                <FaTrash /> Reset All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activities Section */}
      {showActivities && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaHistory /> Activity Log ({activities.length})
          </h2>
          <div className={styles.activitiesList}>
            {activities.length === 0 ? (
              <p className={styles.emptyState}>No activities found</p>
            ) : (
              activities.map((activity, idx) => (
                <div key={idx} className={styles.activityItem}>
                  <div className={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                  <div className={styles.activityUser}>
                    <strong>{activity.userId}</strong>
                  </div>
                  <div className={styles.activityAction}>
                    {activity.action}
                  </div>
                  {activity.details && (
                    <div className={styles.activityDetails}>
                      {activity.details}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

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

                {/* Reset Activities Button */}
                <button 
                  onClick={() => handleResetUser(user.userId)}
                  className={styles.btnSecondary}
                  disabled={loading}
                  title="Reset this user's daily count"
                >
                  <FaRedo /> Reset Activities
                </button>
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

