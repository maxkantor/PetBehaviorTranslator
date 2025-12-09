import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaPaw, FaUserShield, FaCrown, FaUsers, FaToggleOn, FaToggleOff, FaSync, FaCoins, FaGift, FaHistory, FaRedo, FaTrash, FaChartBar, FaCog, FaKey, FaEnvelope, FaSignOutAlt, FaHeadset, FaReply, FaCheckCircle } from 'react-icons/fa'
import { getUserId } from '../services/premiumService'
import { checkAdmin, getAllUsers, setPremiumStatus, setPremiumPlan, removePremiumStatus, grantCredits, getActivities, resetUserActivities, resetAllActivities, adminConnect, getAdminDashboard, updateAdminConfig, createOverrideToken, adminLogout, setMyCredits, setUserCredits, getAllSupportTickets, replyToSupportTicket } from '../services/adminService'
import { getCreditToken } from '../services/creditService'
import axios from 'axios'
import styles from './Admin.module.css'

function Admin() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [selectedPlan, setSelectedPlan] = useState('lifetime')
  const [creditsToGrant, setCreditsToGrant] = useState(100)
  const [grantingCredits, setGrantingCredits] = useState(null)
  const [userCustomCredits, setUserCustomCredits] = useState({}) // userId -> credit amount
  const [settingCredits, setSettingCredits] = useState(null) // userId being set
  const [activities, setActivities] = useState([])
  const [showActivities, setShowActivities] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showOverrideToken, setShowOverrideToken] = useState(false)
  const [configData, setConfigData] = useState({ freeSearchLimit: 5, tiers: [], adminEmails: [] })
  const [overrideForm, setOverrideForm] = useState({ targetUserId: '', targetEmail: '', credits: 0, expirySeconds: 86400 })
  const [supportTickets, setSupportTickets] = useState([])
  const [showSupportTickets, setShowSupportTickets] = useState(false)
  const [replyingToTicket, setReplyingToTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')

  const handleLogout = () => {
    adminLogout()
    navigate('/admin/login', { replace: true })
  }

  useEffect(() => {
    const initializeAdmin = async () => {
      const userId = getUserId()
      setCurrentUserId(userId)
      setLoading(true)
      try {
        // User is already authenticated via session (ProtectedAdminRoute handles that)
        // Just load dashboard data
        await loadDashboard()
        await loadUsers()
        await loadSupportTickets()
        setIsAdmin(true) // If they got here, they're authenticated
      } catch (error) {
        console.error('Admin initialization error:', error)
        if (error.response?.status === 401) {
          showMessage('Session expired. Please log in again.', 'error')
          handleLogout()
        } else {
          showMessage(`Failed to load admin dashboard: ${error.message}`, 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    initializeAdmin()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await getAdminDashboard()
      setDashboardData(data)
      if (data.summary) {
        setConfigData({
          freeSearchLimit: data.summary.freeSearchLimit || 5,
          tiers: data.summary.tiers || [],
          adminEmails: [] // Will be loaded separately if needed
        })
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      if (error.response?.status === 401) {
        setIsAdmin(false)
        showMessage('Access denied. Admin access required.', 'error')
      }
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data.users || [])
      console.log('Loaded users:', data.users)
    } catch (error) {
      console.error('Error loading users:', error)
      console.error('Error response:', error.response?.data)
      if (error.response?.status === 401) {
        showMessage('Access denied. You are not an admin. Set ADMIN_USER_ID environment variable to your user ID.', 'error')
        setIsAdmin(false)
      } else {
        showMessage(`Failed to load users: ${error.response?.data?.message || error.message}`, 'error')
      }
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
      await loadUsers() // Refresh user list
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

  const handleSetUserCredits = async (userId) => {
    const credits = userCustomCredits[userId] ?? 0
    if (credits < 0) {
      showMessage('Credits cannot be negative', 'error')
      return
    }
    setSettingCredits(userId)
    try {
      const token = getCreditToken()
      const result = await setUserCredits(userId, credits, token)
      showMessage(`Set ${userId} credits to ${credits}`, 'success')
      // Clear the input
      setUserCustomCredits({ ...userCustomCredits, [userId]: '' })
      await loadUsers() // Refresh user list
    } catch (error) {
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        showMessage('Failed to set credits: ' + (error.response?.data?.message || error.message), 'error')
      }
    } finally {
      setSettingCredits(null)
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

  const loadSupportTickets = async () => {
    try {
      const data = await getAllSupportTickets()
      setSupportTickets(data.tickets || [])
    } catch (error) {
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        console.error('Error loading support tickets:', error)
        // Don't show error message on initial load if tickets endpoint doesn't exist yet
      }
    }
  }

  const handleReplyToTicket = async (ticketId) => {
    if (!replyMessage.trim()) {
      showMessage('Please enter a reply message', 'error')
      return
    }

    setLoading(true)
    try {
      await replyToSupportTicket(ticketId, replyMessage.trim())
      showMessage('Reply sent successfully!', 'success')
      setReplyingToTicket(null)
      setReplyMessage('')
      await loadSupportTickets() // Refresh tickets
    } catch (error) {
      if (error.response?.status === 401) {
        showMessage('Access denied. Admin access required.', 'error')
      } else {
        showMessage('Failed to send reply: ' + (error.response?.data?.message || error.message), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentUser = users.find(u => u.userId === currentUserId)
  const isCurrentUserPremium = currentUser?.isPremium || false

  // If not admin and not loading, show access denied message
  if (!isAdmin && !loading && currentUserId) {
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

  // Show loading state
  if (loading && !isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <FaUserShield className={styles.adminIcon} />
          </div>
          <h1 className={styles.title}>Checking Admin Access...</h1>
          <p className={styles.subtitle}>Please wait...</p>
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
        <button
          onClick={handleLogout}
          className={styles.btnPrimary}
          style={{ marginTop: '1rem', background: '#dc3545' }}
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </div>
      )}


      {/* Self-Service: Set Your Credits */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaCoins /> Set Your Credits
        </h2>
        <div className={styles.card}>
          <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
            Choose your credit tier or set unlimited admin access:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  const token = getCreditToken()
                  const result = await setMyCredits(0, token)
                  if (result.token) {
                    localStorage.setItem('creditToken', result.token)
                    showMessage('Set to 0 credits successfully', 'success')
                    setTimeout(() => window.location.reload(), 1000)
                  }
                } catch (error) {
                  showMessage('Failed to set credits: ' + (error.response?.data?.message || error.message), 'error')
                } finally {
                  setLoading(false)
                }
              }}
              className={styles.btnPrimary}
              disabled={loading}
            >
              <FaCoins /> Set to 0 Credits
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  const token = getCreditToken()
                  const result = await setMyCredits(5, token)
                  if (result.token) {
                    localStorage.setItem('creditToken', result.token)
                    showMessage('Set to 5 credits successfully', 'success')
                    setTimeout(() => window.location.reload(), 1000)
                  }
                } catch (error) {
                  showMessage('Failed to set credits: ' + (error.response?.data?.message || error.message), 'error')
                } finally {
                  setLoading(false)
                }
              }}
              className={styles.btnPrimary}
              disabled={loading}
            >
              <FaCoins /> Set to 5 Credits
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  const token = getCreditToken()
                  const result = await setMyCredits(20, token)
                  if (result.token) {
                    localStorage.setItem('creditToken', result.token)
                    showMessage('Set to 20 credits successfully', 'success')
                    setTimeout(() => window.location.reload(), 1000)
                  }
                } catch (error) {
                  showMessage('Failed to set credits: ' + (error.response?.data?.message || error.message), 'error')
                } finally {
                  setLoading(false)
                }
              }}
              className={styles.btnPrimary}
              disabled={loading}
            >
              <FaCoins /> Set to 20 Credits
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  const token = getCreditToken()
                  const result = await setMyCredits(50, token)
                  if (result.token) {
                    localStorage.setItem('creditToken', result.token)
                    showMessage('Set to 50 credits successfully', 'success')
                    setTimeout(() => window.location.reload(), 1000)
                  }
                } catch (error) {
                  showMessage('Failed to set credits: ' + (error.response?.data?.message || error.message), 'error')
                } finally {
                  setLoading(false)
                }
              }}
              className={styles.btnPrimary}
              disabled={loading}
            >
              <FaCoins /> Set to 50 Credits
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  const token = getCreditToken()
                  const result = await setMyCredits(120, token)
                  if (result.token) {
                    localStorage.setItem('creditToken', result.token)
                    showMessage('Set to 120 credits successfully', 'success')
                    setTimeout(() => window.location.reload(), 1000)
                  }
                } catch (error) {
                  showMessage('Failed to set credits: ' + (error.response?.data?.message || error.message), 'error')
                } finally {
                  setLoading(false)
                }
              }}
              className={styles.btnPrimary}
              disabled={loading}
            >
              <FaCoins /> Set to 120 Credits
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true)
                  const result = await createOverrideToken(currentUserId, null, 0, 31536000) // 1 year expiry
                  if (result.token) {
                    localStorage.setItem('creditToken', result.token)
                    showMessage('Set to Admin (Unlimited) successfully', 'success')
                    window.location.reload()
                  }
                } catch (error) {
                  showMessage('Failed to set admin: ' + (error.response?.data?.message || error.message), 'error')
                } finally {
                  setLoading(false)
                }
              }}
              className={styles.btnPrimary}
              style={{ background: '#667eea', marginTop: '0.5rem' }}
              disabled={loading}
            >
              <FaUserShield /> Set to Admin (Unlimited)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaToggleOn /> Quick Actions
        </h2>
        
        <div className={styles.quickActions}>

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

      {/* Dashboard Summary */}
      {dashboardData && dashboardData.summary && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaChartBar /> Dashboard Summary
          </h2>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <h3>Today's Translations</h3>
              <p className={styles.summaryValue}>{dashboardData.summary.todaysTranslations || 0}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3>Today's Purchases</h3>
              <p className={styles.summaryValue}>{dashboardData.summary.todaysPurchases || 0}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3>Active Tokens (Approx)</h3>
              <p className={styles.summaryValue}>{dashboardData.summary.activeTokensApprox || 0}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3>Free Search Limit</h3>
              <p className={styles.summaryValue}>{dashboardData.summary.freeSearchLimit || 5}</p>
            </div>
          </div>
        </div>
      )}

      {/* Config Editor */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaCog /> Configuration
        </h2>
        <div className={styles.card}>
          <button
            onClick={() => setShowConfigEditor(!showConfigEditor)}
            className={styles.btnPrimary}
          >
            {showConfigEditor ? 'Hide' : 'Show'} Config Editor
          </button>
          {showConfigEditor && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Free Search Limit</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                  Number of free searches every user gets before needing to purchase credits
                </p>
                <label>Free Search Limit:</label>
                <input
                  type="number"
                  min="0"
                  value={configData.freeSearchLimit}
                  onChange={(e) => setConfigData({ ...configData, freeSearchLimit: parseInt(e.target.value) || 5 })}
                  style={{ marginLeft: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Credit Packs (Tiers)</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                  Configure the credit packs available for purchase. Users will see these on the Credits page.
                </p>
                <div style={{ marginBottom: '1rem' }}>
                  {configData.tiers && configData.tiers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {configData.tiers.map((tier, index) => (
                        <div key={index} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Pack Name (e.g., Starter Pack)"
                              value={tier.name || ''}
                              onChange={(e) => {
                                const newTiers = [...configData.tiers]
                                newTiers[index] = { ...newTiers[index], name: e.target.value }
                                setConfigData({ ...configData, tiers: newTiers })
                              }}
                              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', flex: '1', minWidth: '150px' }}
                            />
                            <input
                              type="text"
                              placeholder="Description"
                              value={tier.description || ''}
                              onChange={(e) => {
                                const newTiers = [...configData.tiers]
                                newTiers[index] = { ...newTiers[index], description: e.target.value }
                                setConfigData({ ...configData, tiers: newTiers })
                              }}
                              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', flex: '1', minWidth: '200px' }}
                            />
                            <input
                              type="number"
                              placeholder="Price ($)"
                              min="0"
                              step="0.01"
                              value={tier.price || ''}
                              onChange={(e) => {
                                const newTiers = [...configData.tiers]
                                newTiers[index] = { ...newTiers[index], price: parseFloat(e.target.value) || 0 }
                                setConfigData({ ...configData, tiers: newTiers })
                              }}
                              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
                            />
                            <input
                              type="number"
                              placeholder="Credits"
                              min="1"
                              value={tier.credits || ''}
                              onChange={(e) => {
                                const newTiers = [...configData.tiers]
                                newTiers[index] = { ...newTiers[index], credits: parseInt(e.target.value) || 0 }
                                setConfigData({ ...configData, tiers: newTiers })
                              }}
                              style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={tier.popular || false}
                                onChange={(e) => {
                                  const newTiers = [...configData.tiers]
                                  newTiers[index] = { ...newTiers[index], popular: e.target.checked }
                                  setConfigData({ ...configData, tiers: newTiers })
                                }}
                              />
                              Popular
                            </label>
                            <button
                              onClick={() => {
                                const newTiers = configData.tiers.filter((_, i) => i !== index)
                                setConfigData({ ...configData, tiers: newTiers })
                              }}
                              style={{ padding: '0.4rem 0.8rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                          {tier.price && tier.credits && (
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                              ${(tier.price / tier.credits).toFixed(3)} per credit
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ opacity: 0.7, fontStyle: 'italic' }}>No credit packs configured. Add one below.</p>
                  )}
                  <button
                    onClick={() => {
                      // Always allow adding new packs, even if there are incomplete ones
                      const newTier = {
                        id: configData.tiers.length > 0 ? Math.max(...configData.tiers.map(t => t.id || 0)) + 1 : 1,
                        name: '',
                        description: '',
                        price: 0,
                        credits: 0,
                        popular: false
                      }
                      setConfigData({ ...configData, tiers: [...configData.tiers, newTier] })
                    }}
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    + Add Credit Pack
                  </button>
                  {configData.tiers.some(t => !t.name || !t.description || t.price <= 0 || t.credits <= 0) && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: '0.8', fontStyle: 'italic' }}>
                      Note: Incomplete packs (with empty fields) will be removed when you save. You can add new packs anytime.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Admin Emails</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                  Email addresses that have admin access (comma-separated)
                </p>
                <label>Admin Emails:</label>
                <input
                  type="text"
                  value={configData.adminEmails.join(', ')}
                  onChange={(e) => setConfigData({ ...configData, adminEmails: e.target.value.split(',').map(e => e.trim()).filter(e => e) })}
                  placeholder="admin@example.com, admin2@example.com"
                  style={{ marginLeft: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '400px' }}
                />
              </div>

              <button
                onClick={async () => {
                  try {
                    // Validate tiers before saving - filter out incomplete ones
                    const validTiers = configData.tiers.filter(t => 
                      t.name && t.description && t.price > 0 && t.credits > 0
                    )
                    const incompleteTiers = configData.tiers.filter(t => 
                      !t.name || !t.description || t.price <= 0 || t.credits <= 0
                    )
                    
                    // Warn if there are incomplete tiers, but still allow saving valid ones
                    if (incompleteTiers.length > 0 && validTiers.length > 0) {
                      if (!window.confirm(`${incompleteTiers.length} incomplete credit pack(s) will be removed. Continue?`)) {
                        return
                      }
                    } else if (incompleteTiers.length > 0 && validTiers.length === 0) {
                      showMessage('Please fill in all fields for at least one credit pack (name, description, price > 0, credits > 0)', 'error')
                      return
                    }
                    
                    await updateAdminConfig({
                      freeSearchLimit: configData.freeSearchLimit,
                      tiers: validTiers.length > 0 ? validTiers : null,
                      adminEmails: configData.adminEmails
                    })
                    showMessage('Configuration updated successfully', 'success')
                    await loadDashboard()
                  } catch (error) {
                    showMessage('Failed to update configuration: ' + (error.response?.data?.message || error.message), 'error')
                  }
                }}
                className={styles.btnPrimary}
                style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
              >
                Save Configuration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Override Token Generator */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaKey /> Override Token Generator
        </h2>
        <div className={styles.card}>
          <button
            onClick={() => setShowOverrideToken(!showOverrideToken)}
            className={styles.btnPrimary}
          >
            {showOverrideToken ? 'Hide' : 'Show'} Override Token Form
          </button>
          {showOverrideToken && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Target User ID (optional):</label>
                <input
                  type="text"
                  value={overrideForm.targetUserId}
                  onChange={(e) => setOverrideForm({ ...overrideForm, targetUserId: e.target.value })}
                  placeholder="user_123"
                  style={{ marginLeft: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '200px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Target Email (optional):</label>
                <input
                  type="email"
                  value={overrideForm.targetEmail}
                  onChange={(e) => setOverrideForm({ ...overrideForm, targetEmail: e.target.value })}
                  placeholder="user@example.com"
                  style={{ marginLeft: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '250px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Credits to Grant:</label>
                <input
                  type="number"
                  min="0"
                  value={overrideForm.credits}
                  onChange={(e) => setOverrideForm({ ...overrideForm, credits: parseInt(e.target.value) || 0 })}
                  style={{ marginLeft: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Expiry (seconds):</label>
                <input
                  type="number"
                  min="60"
                  value={overrideForm.expirySeconds}
                  onChange={(e) => setOverrideForm({ ...overrideForm, expirySeconds: parseInt(e.target.value) || 86400 })}
                  style={{ marginLeft: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }}
                />
                <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  ({Math.floor(overrideForm.expirySeconds / 3600)} hours)
                </span>
              </div>
              <button
                onClick={async () => {
                  if (!overrideForm.targetUserId && !overrideForm.targetEmail) {
                    showMessage('Please provide either User ID or Email', 'error')
                    return
                  }
                  try {
                    const result = await createOverrideToken(
                      overrideForm.targetUserId || null,
                      overrideForm.targetEmail || null,
                      overrideForm.credits,
                      overrideForm.expirySeconds
                    )
                    showMessage(`Override token created! Token: ${result.token.substring(0, 30)}...`, 'success')
                    // Copy to clipboard if possible
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(result.token)
                      showMessage('Override token created and copied to clipboard!', 'success')
                    }
                  } catch (error) {
                    showMessage('Failed to create override token', 'error')
                  }
                }}
                className={styles.btnPrimary}
              >
                Generate Override Token
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Events */}
      {dashboardData && dashboardData.recentEvents && dashboardData.recentEvents.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FaHistory /> Recent Events ({dashboardData.recentEvents.length})
          </h2>
          <div className={styles.eventsList}>
            {dashboardData.recentEvents.map((event, idx) => (
              <div key={idx} className={styles.eventItem}>
                <div className={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <div className={styles.eventUser}>
                  {event.userId || 'N/A'}
                </div>
                <div className={styles.eventType}>
                  {event.eventType}
                </div>
                <div className={styles.eventStatus}>
                  {event.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Support Tickets Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaHeadset /> Support Tickets ({supportTickets.length})
        </h2>
        <div className={styles.card}>
          <div className={styles.cardActions}>
            <button 
              onClick={() => {
                setShowSupportTickets(!showSupportTickets)
                if (!showSupportTickets) {
                  loadSupportTickets()
                }
              }}
              className={styles.btnPrimary}
            >
              <FaHeadset /> {showSupportTickets ? 'Hide' : 'Show'} Support Tickets
            </button>
            <button 
              onClick={loadSupportTickets}
              className={styles.btnSecondary}
              disabled={loading}
            >
              <FaSync className={loading ? styles.spinning : ''} /> Refresh
            </button>
          </div>
          
          {showSupportTickets && (
            <div style={{ marginTop: '1.5rem' }}>
              {supportTickets.length === 0 ? (
                <p className={styles.emptyState}>No support tickets found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {supportTickets.map((ticket) => (
                    <div 
                      key={ticket.ticketId} 
                      style={{ 
                        padding: '1.5rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '12px',
                        border: ticket.status === 'Open' ? '2px solid #ff6b9d' : '2px solid #4ecdc4'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{ticket.subject}</h3>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              borderRadius: '12px', 
                              fontSize: '0.85rem',
                              background: ticket.priority === 'High' ? 'rgba(255, 107, 157, 0.3)' : 'rgba(78, 205, 196, 0.3)',
                              color: ticket.priority === 'High' ? '#ff6b9d' : '#4ecdc4'
                            }}>
                              {ticket.priority} Priority
                            </span>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              borderRadius: '12px', 
                              fontSize: '0.85rem',
                              background: ticket.status === 'Open' ? 'rgba(255, 107, 157, 0.3)' : 'rgba(78, 205, 196, 0.3)',
                              color: ticket.status === 'Open' ? '#ff6b9d' : '#4ecdc4'
                            }}>
                              {ticket.status}
                            </span>
                            {ticket.isPremium && (
                              <FaCrown style={{ color: '#ffe66d', fontSize: '1rem' }} title="Premium User" />
                            )}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                            <strong>Ticket ID:</strong> {ticket.ticketId}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                            <strong>From:</strong> {ticket.email} {ticket.userId && `(${ticket.userId})`}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                            <strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}
                          </div>
                          <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            <strong>Message:</strong>
                            <div style={{ marginTop: '0.5rem' }}>{ticket.message}</div>
                          </div>
                        </div>
                      </div>
                      
                      {replyingToTicket === ticket.ticketId ? (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Reply Message:
                          </label>
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Enter your reply..."
                            rows={6}
                            style={{ 
                              width: '100%', 
                              padding: '0.75rem', 
                              borderRadius: '8px', 
                              border: '2px solid #ccc',
                              fontFamily: 'inherit',
                              fontSize: '0.95rem',
                              marginBottom: '0.75rem'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleReplyToTicket(ticket.ticketId)}
                              className={styles.btnPrimary}
                              disabled={loading || !replyMessage.trim()}
                            >
                              <FaReply /> Send Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyingToTicket(null)
                                setReplyMessage('')
                              }}
                              className={styles.btnSecondary}
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReplyingToTicket(ticket.ticketId)
                            setReplyMessage('')
                          }}
                          className={styles.btnPrimary}
                          disabled={loading || ticket.status === 'Replied'}
                        >
                          <FaReply /> {ticket.status === 'Replied' ? 'Already Replied' : 'Reply to Ticket'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
                  <label>Grant Credits (Add):</label>
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

                {/* Set Custom Credits Section */}
                <div className={styles.creditsSection} style={{ marginTop: '0.5rem' }}>
                  <label>Set Credits (Exact Amount):</label>
                  <div className={styles.creditsInput}>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter amount"
                      value={userCustomCredits[user.userId] ?? ''}
                      onChange={(e) => setUserCustomCredits({ ...userCustomCredits, [user.userId]: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                      className={styles.creditsInputField}
                    />
                    <button 
                      onClick={() => handleSetUserCredits(user.userId)}
                      className={styles.btnCredits}
                      disabled={loading || settingCredits === user.userId}
                      style={{ background: '#667eea' }}
                    >
                      {settingCredits === user.userId ? (
                        <>
                          <FaSync className={styles.spinning} /> Setting...
                        </>
                      ) : (
                        <>
                          <FaCoins /> Set Credits
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

