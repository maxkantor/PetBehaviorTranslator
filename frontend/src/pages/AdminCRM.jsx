import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FaPaw, FaUserShield, FaCrown, FaUsers, FaSync, FaCoins, FaHistory, 
  FaChartBar, FaCog, FaSignOutAlt, FaHeadset, FaReply, FaCopy, FaSearch,
  FaFilter, FaSort, FaUser, FaEnvelope, FaCalendar, FaDollarSign, FaCreditCard,
  FaCheckCircle, FaTimesCircle, FaEdit, FaTrash, FaEye, FaChevronRight,
  FaChevronLeft, FaArrowUp, FaArrowDown, FaTicketAlt, FaShoppingCart,
  FaPlus, FaSave, FaGift, FaTimes
} from 'react-icons/fa'
import { getUserId } from '../services/premiumService'
import { 
  getAllUsers, setPremiumStatus, removePremiumStatus, grantCredits, 
  getActivities, resetUserActivities, adminConnect, getAdminDashboard, 
  updateAdminConfig, adminLogout, setUserCredits, getAllSupportTickets, 
  replyToSupportTicket, getStripeActivities 
} from '../services/adminService'
import styles from './AdminCRM.module.css'

function AdminCRM() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [supportTickets, setSupportTickets] = useState([])
  const [stripeActivities, setStripeActivities] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  
  // CRM State
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, premium, free
  const [sortBy, setSortBy] = useState('recent') // recent, name, credits, activity
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // User management state
  const [userCredits, setUserCredits] = useState({})
  const [grantingCredits, setGrantingCredits] = useState(null)
  const [settingCredits, setSettingCredits] = useState(null)
  const [grantAmount, setGrantAmount] = useState('')
  const [setAmount, setSetAmount] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  
  // Settings state
  const [pricingTiers, setPricingTiers] = useState([])
  const [freeSearchLimit, setFreeSearchLimit] = useState(5)
  const [savingConfig, setSavingConfig] = useState(false)
  const [authChecked, setAuthChecked] = useState(false) // Track if we've checked auth
  
  // Reply modal state
  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [replyingToTicket, setReplyingToTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    initializeAdmin()
  }, [])

  const initializeAdmin = async () => {
    const userId = getUserId()
    setCurrentUserId(userId)
    
    // Only show loading on first load, not on refresh
    const isFirstLoad = !authChecked
    if (isFirstLoad) {
      setLoading(true)
    }
    
    try {
      const email = localStorage.getItem('userEmail')
      if (email) {
        try {
          await adminConnect()
        } catch (connectError) {
          console.warn('Admin connect failed:', connectError)
          // Continue anyway - session token should be enough
        }
      }
      
      // Load all data in parallel
      // Use Promise.allSettled to ensure all requests complete even if some fail
      const results = await Promise.allSettled([
        loadDashboard(),
        loadUsers(isFirstLoad), // Show loading only on initial load
        loadSupportTickets(),
        loadStripeActivities()
      ])
      
      // Check if any critical request failed
      const hasCriticalError = results.some((result, index) => {
        if (result.status === 'rejected') {
          const error = result.reason
          // Only treat 401 as critical
          return error?.response?.status === 401
        }
        return false
      })
      
      if (hasCriticalError) {
        setIsAdmin(false)
        setAuthChecked(true)
        showMessage('Session expired. Please log in again.', 'error')
        setTimeout(() => handleLogout(), 2000)
      } else {
        setIsAdmin(true)
        setAuthChecked(true) // Mark auth as checked
      }
    } catch (error) {
      console.error('Admin initialization error:', error)
      setAuthChecked(true) // Mark auth as checked even on error
      if (error.response?.status === 401) {
        setIsAdmin(false)
        showMessage('Session expired. Please log in again.', 'error')
        setTimeout(() => handleLogout(), 2000)
      } else {
        // For other errors, still allow access (might be temporary)
        // Preserve existing admin status if we had it
        if (isAdmin) {
          // Keep admin access, just show warning
          console.warn('Some data failed to load, but preserving existing data')
        } else {
          setIsAdmin(true) // Assume admin if we got here
        }
        if (isFirstLoad) {
          showMessage(`Failed to load dashboard: ${error.response?.data?.message || error.message}`, 'error')
        }
      }
    } finally {
      if (isFirstLoad) {
        setLoading(false)
      }
    }
  }

  const loadDashboard = async () => {
    try {
      const data = await getAdminDashboard()
      // Only update if we got valid data
      if (data) {
        setDashboardData(data)
        if (data.recentEvents) {
          setRecentEvents(data.recentEvents)
        }
        // Load pricing tiers and free search limit for settings
        if (data.summary) {
          if (data.summary.freeSearchLimit !== undefined) {
            setFreeSearchLimit(data.summary.freeSearchLimit)
          }
          if (data.summary.tiers) {
            // Only update tiers if we got them (even if empty array)
            setPricingTiers(data.summary.tiers)
          }
        }
      }
      // If data is null/undefined but no error, keep existing dashboard data
    } catch (error) {
      console.error('Error loading dashboard:', error)
      // Don't clear existing data on error - preserve what we have
      if (!dashboardData) {
        showMessage('Failed to load dashboard data', 'error')
      } else {
        console.warn('Could not refresh dashboard, but preserving existing data')
      }
    }
  }

  const loadUsers = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    try {
      const data = await getAllUsers()
      // Only update if we got valid data
      if (data && data.users !== undefined) {
        const newUsers = data.users || []
        // Always update users if we got a response (even if empty array)
        setUsers(newUsers)
        
        // Preserve existing credit data for users that still exist
        const preservedCredits = { ...userCredits }
        const updatedCredits = {}
        newUsers.forEach(user => {
          // Keep existing credit data if we have it
          if (preservedCredits[user.userId]) {
            updatedCredits[user.userId] = preservedCredits[user.userId]
          }
        })
        if (Object.keys(updatedCredits).length > 0) {
          setUserCredits(updatedCredits)
        }
      }
      // If data is null/undefined but no error, keep existing users
    } catch (error) {
      console.error('Error loading users:', error)
      // Don't clear existing data on error - preserve what we have
      if (users.length === 0) {
        // Only show error if we have no existing data
        showMessage('Failed to load users', 'error')
      } else {
        console.warn('Could not refresh users, but preserving existing data')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  const loadSupportTickets = async (preserveExisting = true) => {
    try {
      const data = await getAllSupportTickets()
      // Only update if we got valid data
      if (data && data.tickets !== undefined) {
        setSupportTickets(data.tickets)
      } else if (!preserveExisting) {
        // Only clear if explicitly requested and no data
        setSupportTickets([])
      }
      // If data is null/undefined but no error, keep existing tickets
    } catch (error) {
      console.error('Error loading support tickets:', error)
      // Don't clear existing data on error - preserve what we have
      if (!preserveExisting && supportTickets.length === 0) {
        // Only show error if we have no existing data and not preserving
        console.warn('Could not load support tickets')
      }
    }
  }

  const loadStripeActivities = async (preserveExisting = true) => {
    try {
      const data = await getStripeActivities()
      // Only update if we got valid data
      if (data && data.activities !== undefined) {
        setStripeActivities(data.activities)
      } else if (!preserveExisting) {
        // Only clear if explicitly requested and no data
        setStripeActivities([])
      }
      // If data is null/undefined but no error, keep existing activities
    } catch (error) {
      console.error('Error loading Stripe activities:', error)
      // Don't clear existing data on error - preserve what we have
      if (!preserveExisting && stripeActivities.length === 0) {
        // Only show error if we have no existing data and not preserving
        console.warn('Could not load Stripe activities')
      }
    }
  }

  const showMessage = (msg, type) => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 5000)
  }

  const handleLogout = () => {
    adminLogout()
    navigate('/admin/login', { replace: true })
  }

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let filtered = [...users]
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user => 
        user.userId?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      )
    }
    
    // Status filter
    if (filterStatus === 'premium') {
      filtered = filtered.filter(user => user.isPremium)
    } else if (filterStatus === 'free') {
      filtered = filtered.filter(user => !user.isPremium)
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'name':
          aVal = (a.email || a.userId || '').toLowerCase()
          bVal = (b.email || b.userId || '').toLowerCase()
          break
        case 'credits':
          aVal = userCredits[a.userId]?.credits || 0
          bVal = userCredits[b.userId]?.credits || 0
          break
        case 'activity':
          aVal = a.dailyCount || 0
          bVal = b.dailyCount || 0
          break
        case 'recent':
        default:
          // Sort by most recent activity (would need timestamp field)
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
    
    return filtered
  }, [users, searchQuery, filterStatus, sortBy, sortOrder, userCredits])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(start, start + itemsPerPage)
  }, [filteredUsers, currentPage, itemsPerPage])

  const handleGrantCredits = async (userId, amount) => {
    setGrantingCredits(userId)
    try {
      const result = await grantCredits(userId, amount, null)
      showMessage(`Granted ${amount} credits to user`, 'success')
      // Refresh users without showing loading spinner
      await loadUsers(false)
      if (result.creditsRemaining !== undefined) {
        setUserCredits(prev => ({
          ...prev,
          [userId]: { credits: result.creditsRemaining }
        }))
      }
    } catch (error) {
      showMessage('Failed to grant credits', 'error')
    } finally {
      setGrantingCredits(null)
    }
  }

  const handleSetCredits = async (userId, amount) => {
    setSettingCredits(userId)
    try {
      const result = await setUserCredits(userId, amount, null)
      showMessage(`Set user credits to ${amount}`, 'success')
      // Refresh users without showing loading spinner
      await loadUsers(false)
      if (result.creditsRemaining !== undefined) {
        setUserCredits(prev => ({
          ...prev,
          [userId]: { credits: result.creditsRemaining }
        }))
      }
    } catch (error) {
      showMessage('Failed to set credits', 'error')
    } finally {
      setSettingCredits(null)
    }
  }

  const handleReplyToTicket = async (ticketId, replyMessage) => {
    try {
      setSendingReply(true)
      await replyToSupportTicket(ticketId, replyMessage)
      showMessage('Reply sent successfully!', 'success')
      setReplyModalOpen(false)
      setReplyingToTicket(null)
      setReplyMessage('')
      await loadSupportTickets(true) // preserve existing
    } catch (error) {
      showMessage('Failed to send reply', 'error')
    } finally {
      setSendingReply(false)
    }
  }

  const openReplyModal = (ticket) => {
    setReplyingToTicket(ticket)
    setReplyMessage('')
    setReplyModalOpen(true)
  }

  const closeReplyModal = () => {
    setReplyModalOpen(false)
    setReplyingToTicket(null)
    setReplyMessage('')
  }

  const handleTogglePremium = async (userId, isPremium) => {
    try {
      if (isPremium) {
        await removePremiumStatus(userId)
        showMessage('Premium status removed', 'success')
      } else {
        await setPremiumStatus(userId)
        showMessage('Premium status granted', 'success')
      }
      // Refresh users without showing loading spinner
      await loadUsers(false)
    } catch (error) {
      showMessage('Failed to update premium status', 'error')
    }
  }

  // Show loading while checking authentication
  if (!authChecked || (loading && !isAdmin)) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FaSync className={styles.spinner} />
          <p>Checking Admin Access...</p>
        </div>
      </div>
    )
  }

  // Only show access denied after we've checked auth and confirmed no access
  if (!isAdmin && authChecked) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <FaUserShield className={styles.icon} />
          <h1>Access Denied</h1>
          <p>Admin access required</p>
          <Link to="/" className={styles.btnBack}>Back to App</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <FaUserShield className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Admin CRM</h1>
              <p className={styles.headerSubtitle}>Customer Relationship Management</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button onClick={handleLogout} className={styles.btnLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Message Alert */}
      {message && (
        <div className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <FaChartBar /> Dashboard
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> Users ({users.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'support' ? styles.active : ''}`}
          onClick={() => setActiveTab('support')}
        >
          <FaHeadset /> Support ({supportTickets.filter(t => t.status === 'Open').length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'transactions' ? styles.active : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <FaCreditCard /> Transactions ({stripeActivities.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FaCog /> Settings
        </button>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className={styles.dashboard}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(78, 205, 196, 0.1)' }}>
                  <FaUsers style={{ color: '#4ecdc4' }} />
                </div>
                <div className={styles.statContent}>
                  <h3>Total Users</h3>
                  <p className={styles.statValue}>{users.length}</p>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(255, 230, 109, 0.1)' }}>
                  <FaCrown style={{ color: '#ffe66d' }} />
                </div>
                <div className={styles.statContent}>
                  <h3>Premium Users</h3>
                  <p className={styles.statValue}>{users.filter(u => u.isPremium).length}</p>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(255, 107, 157, 0.1)' }}>
                  <FaHeadset style={{ color: '#ff6b9d' }} />
                </div>
                <div className={styles.statContent}>
                  <h3>Open Tickets</h3>
                  <p className={styles.statValue}>{supportTickets.filter(t => t.status === 'Open').length}</p>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                  <FaDollarSign style={{ color: '#667eea' }} />
                </div>
                <div className={styles.statContent}>
                  <h3>Today's Revenue</h3>
                  <p className={styles.statValue}>
                    ${stripeActivities
                      .filter(a => a.eventType === 'PURCHASE' && a.status === 'SUCCESS')
                      .filter(a => {
                        const date = new Date(a.timestamp)
                        const today = new Date()
                        return date.toDateString() === today.toDateString()
                      })
                      .reduce((sum, a) => sum + (a.amount || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {dashboardData?.summary && (
              <div className={styles.dashboardSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2>Today's Activity</h2>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.activityGrid}>
                  <div className={styles.activityCard}>
                    <FaHistory />
                    <div>
                      <h4>Translations (Today)</h4>
                      <p>{dashboardData.summary.todaysTranslations || 0}</p>
                    </div>
                  </div>
                  <div className={styles.activityCard}>
                    <FaShoppingCart />
                    <div>
                      <h4>Purchases (Today)</h4>
                      <p>{dashboardData.summary.todaysPurchases || 0}</p>
                    </div>
                  </div>
                  <div className={styles.activityCard}>
                    <FaCoins />
                    <div>
                      <h4>Active Tokens</h4>
                      <p>{dashboardData.summary.activeTokensApprox || 0}</p>
                    </div>
                  </div>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                  Note: Historical data is preserved. Check the Users, Support, and Transactions tabs for complete historical records.
                </p>
              </div>
            )}

            {/* Analytics Charts */}
            <div className={styles.dashboardSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Analytics & Trends</h2>
              </div>
              
              <div className={styles.chartsGrid}>
                {/* User Growth Chart */}
                <div className={styles.chartCard}>
                  <h3>User Growth (Last 7 Days)</h3>
                  <div className={styles.chartContainer}>
                    {(() => {
                      const last7Days = Array.from({ length: 7 }, (_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - (6 - i))
                        return date.toISOString().split('T')[0]
                      })
                      
                      const userCounts = last7Days.map(date => {
                        return recentEvents.filter(e => {
                          const eventDate = new Date(e.timestamp).toISOString().split('T')[0]
                          return eventDate === date && e.eventType === 'USER_CREATED'
                        }).length
                      })
                      
                      const maxCount = Math.max(...userCounts, 1)
                      
                      return (
                        <div className={styles.barChart}>
                          {last7Days.map((date, i) => {
                            const height = (userCounts[i] / maxCount) * 100
                            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
                            return (
                              <div key={date} className={styles.barChartItem}>
                                <div className={styles.barChartBar}>
                                  <div 
                                    className={styles.barChartFill}
                                    style={{ height: `${height}%` }}
                                    title={`${userCounts[i]} users`}
                                  />
                                </div>
                                <span className={styles.barChartLabel}>{dayName}</span>
                                <span className={styles.barChartValue}>{userCounts[i]}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Revenue Chart */}
                <div className={styles.chartCard}>
                  <h3>Revenue (Last 7 Days)</h3>
                  <div className={styles.chartContainer}>
                    {(() => {
                      const last7Days = Array.from({ length: 7 }, (_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - (6 - i))
                        return date.toISOString().split('T')[0]
                      })
                      
                      const revenue = last7Days.map(date => {
                        return stripeActivities
                          .filter(a => {
                            const eventDate = new Date(a.timestamp).toISOString().split('T')[0]
                            return eventDate === date && a.status === 'SUCCESS' && (a.eventType === 'PURCHASE' || a.eventType === 'PREMIUM_PURCHASE')
                          })
                          .reduce((sum, a) => sum + (a.amount || 0), 0)
                      })
                      
                      const maxRevenue = Math.max(...revenue, 1)
                      
                      return (
                        <div className={styles.barChart}>
                          {last7Days.map((date, i) => {
                            const height = (revenue[i] / maxRevenue) * 100
                            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
                            return (
                              <div key={date} className={styles.barChartItem}>
                                <div className={styles.barChartBar}>
                                  <div 
                                    className={styles.barChartFill}
                                    style={{ height: `${height}%`, background: 'linear-gradient(to top, #4ecdc4, #44a08d)' }}
                                    title={`$${revenue[i].toFixed(2)}`}
                                  />
                                </div>
                                <span className={styles.barChartLabel}>{dayName}</span>
                                <span className={styles.barChartValue}>${revenue[i].toFixed(0)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Activity Breakdown */}
                <div className={styles.chartCard}>
                  <h3>Activity Breakdown (Last 30 Days)</h3>
                  <div className={styles.chartContainer}>
                    {(() => {
                      const last30Days = recentEvents.filter(e => {
                        const eventDate = new Date(e.timestamp)
                        const thirtyDaysAgo = new Date()
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                        return eventDate >= thirtyDaysAgo
                      })
                      
                      const activityCounts = {
                        'TRANSLATION': last30Days.filter(e => e.eventType === 'TRANSLATION').length,
                        'PURCHASE': last30Days.filter(e => e.eventType === 'PURCHASE' || e.eventType === 'PREMIUM_PURCHASE').length,
                        'SUPPORT': last30Days.filter(e => e.eventType === 'SUPPORT_TICKET').length,
                        'USER_CREATED': last30Days.filter(e => e.eventType === 'USER_CREATED').length
                      }
                      
                      const total = Object.values(activityCounts).reduce((sum, count) => sum + count, 0)
                      const maxCount = Math.max(...Object.values(activityCounts), 1)
                      
                      return (
                        <div className={styles.pieChart}>
                          {Object.entries(activityCounts).map(([type, count], i) => {
                            const percentage = total > 0 ? (count / total) * 100 : 0
                            const colors = ['#667eea', '#4ecdc4', '#ffe66d', '#ff6b9d']
                            return (
                              <div key={type} className={styles.pieChartItem}>
                                <div className={styles.pieChartBar}>
                                  <div 
                                    className={styles.pieChartFill}
                                    style={{ 
                                      width: `${percentage}%`,
                                      background: colors[i % colors.length]
                                    }}
                                  />
                                </div>
                                <div className={styles.pieChartLabel}>
                                  <span className={styles.pieChartDot} style={{ background: colors[i % colors.length] }} />
                                  <span>{type.replace('_', ' ')}</span>
                                  <span className={styles.pieChartValue}>{count} ({percentage.toFixed(1)}%)</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Translation Trends */}
                <div className={styles.chartCard}>
                  <h3>Translation Trends (Last 7 Days)</h3>
                  <div className={styles.chartContainer}>
                    {(() => {
                      const last7Days = Array.from({ length: 7 }, (_, i) => {
                        const date = new Date()
                        date.setDate(date.getDate() - (6 - i))
                        return date.toISOString().split('T')[0]
                      })
                      
                      const translationCounts = last7Days.map(date => {
                        return recentEvents.filter(e => {
                          const eventDate = new Date(e.timestamp).toISOString().split('T')[0]
                          return eventDate === date && e.eventType === 'TRANSLATION'
                        }).length
                      })
                      
                      const maxCount = Math.max(...translationCounts, 1)
                      
                      return (
                        <div className={styles.lineChart}>
                          <svg viewBox="0 0 400 200" className={styles.lineChartSvg}>
                            <polyline
                              fill="none"
                              stroke="#667eea"
                              strokeWidth="3"
                              points={last7Days.map((date, i) => {
                                const x = (i / (last7Days.length - 1)) * 380 + 10
                                const y = 190 - (translationCounts[i] / maxCount) * 170
                                return `${x},${y}`
                              }).join(' ')}
                            />
                            {last7Days.map((date, i) => {
                              const x = (i / (last7Days.length - 1)) * 380 + 10
                              const y = 190 - (translationCounts[i] / maxCount) * 170
                              return (
                                <circle key={date} cx={x} cy={y} r="4" fill="#667eea" />
                              )
                            })}
                          </svg>
                          <div className={styles.lineChartLabels}>
                            {last7Days.map((date, i) => {
                              const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
                              return (
                                <span key={date} className={styles.lineChartLabel}>
                                  {dayName}<br/>{translationCounts[i]}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.dashboardSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Recent Users</h2>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Showing {Math.min(5, users.length)} of {users.length} total users
                </span>
              </div>
              {users.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No users found. Users will appear here after they use the app.</p>
              ) : (
                <div className={styles.recentUsers}>
                  {users.slice(0, 5).map(user => (
                    <div key={user.userId} className={styles.recentUserCard}>
                      <div className={styles.recentUserInfo}>
                        <FaUser />
                        <div>
                          <strong>{user.email || user.userId}</strong>
                          <span>{user.isPremium ? '⭐ Premium' : 'Free'} • Activity: {user.dailyCount || 0}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setActiveTab('users')
                        }}
                        className={styles.btnView}
                      >
                        <FaEye /> View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={styles.usersTab}>
            {/* User List View */}
            {!selectedUser ? (
              <>
                {/* Search and Filters */}
                <div className={styles.toolbar}>
                  <div className={styles.searchBox}>
                    <FaSearch />
                    <input
                      type="text"
                      placeholder="Search users by ID or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className={styles.filters}>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="all">All Users</option>
                      <option value="premium">Premium</option>
                      <option value="free">Free</option>
                    </select>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={styles.filterSelect}
                    >
                      <option value="recent">Recent</option>
                      <option value="name">Name</option>
                      <option value="credits">Credits</option>
                      <option value="activity">Activity</option>
                    </select>
                    
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className={styles.btnSort}
                    >
                      <FaSort /> {sortOrder === 'asc' ? <FaArrowUp /> : <FaArrowDown />}
                    </button>
                    
                    <button 
                      onClick={async () => {
                        setRefreshing(true)
                        try {
                          // Refresh all data in parallel, preserving existing data
                          await Promise.allSettled([
                            loadUsers(false),
                            loadDashboard(),
                            loadSupportTickets(true), // preserve existing
                            loadStripeActivities(true) // preserve existing
                          ])
                        } finally {
                          setRefreshing(false)
                        }
                      }} 
                      className={styles.btnRefresh}
                      disabled={refreshing}
                    >
                      <FaSync className={refreshing ? styles.spinning : ''} /> 
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <div className={styles.usersTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Status</th>
                        <th>Credits</th>
                        <th>Activity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map(user => (
                        <tr key={user.userId}>
                          <td>
                            <div className={styles.userCell}>
                              <FaUser />
                              <div>
                                <strong>{user.email || user.userId}</strong>
                                <span>{user.userId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${user.isPremium ? styles.badgePremium : styles.badgeFree}`}>
                              {user.isPremium ? '⭐ Premium' : 'Free'}
                            </span>
                          </td>
                          <td>
                            {userCredits[user.userId]?.credits ?? 'N/A'}
                          </td>
                          <td>{user.dailyCount || 0}</td>
                          <td>
                            <div className={styles.actionButtons}>
                              <button
                                onClick={() => setSelectedUser(user)}
                                className={styles.btnAction}
                                title="View Details"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={() => handleTogglePremium(user.userId, user.isPremium)}
                                className={styles.btnAction}
                                title={user.isPremium ? "Remove Premium" : "Grant Premium"}
                              >
                                {user.isPremium ? <FaTimesCircle /> : <FaCrown />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <FaChevronLeft /> Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next <FaChevronRight />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* User Detail View */
              <div className={styles.userDetail}>
                <div className={styles.userDetailHeader}>
                  <button onClick={() => setSelectedUser(null)} className={styles.btnBack}>
                    <FaChevronLeft /> Back to Users
                  </button>
                  <div className={styles.userDetailInfo}>
                    <FaUser className={styles.userDetailAvatar} />
                    <div>
                      <h2>{selectedUser.email || selectedUser.userId}</h2>
                      <p>{selectedUser.userId}</p>
                      <span className={`${styles.badge} ${selectedUser.isPremium ? styles.badgePremium : styles.badgeFree}`}>
                        {selectedUser.isPremium ? '⭐ Premium' : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.userDetailContent}>
                  <div className={styles.userDetailSection}>
                    <h3>Quick Actions</h3>
                    <div className={styles.quickActionsGrid}>
                      <button
                        onClick={() => handleTogglePremium(selectedUser.userId, selectedUser.isPremium)}
                        className={styles.btnQuickAction}
                      >
                        {selectedUser.isPremium ? <FaTimesCircle /> : <FaCrown />}
                        {selectedUser.isPremium ? 'Remove Premium' : 'Grant Premium'}
                      </button>
                      <button
                        onClick={() => handleGrantCredits(selectedUser.userId, 10)}
                        className={styles.btnQuickAction}
                        disabled={grantingCredits === selectedUser.userId}
                      >
                        <FaCoins /> Grant 10 Credits
                      </button>
                      <button
                        onClick={() => handleGrantCredits(selectedUser.userId, 50)}
                        className={styles.btnQuickAction}
                        disabled={grantingCredits === selectedUser.userId}
                      >
                        <FaCoins /> Grant 50 Credits
                      </button>
                    </div>
                  </div>

                  <div className={styles.userDetailSection}>
                    <h3>Credit Management</h3>
                    <div className={styles.creditManagement}>
                      <div className={styles.creditInputGroup}>
                        <label>Grant Credits (Add to existing)</label>
                        <div className={styles.creditInputRow}>
                          <input
                            type="number"
                            min="1"
                            placeholder="Amount"
                            value={grantAmount}
                            onChange={(e) => setGrantAmount(e.target.value)}
                            className={styles.creditInput}
                          />
                          <button 
                            className={styles.btnPrimary}
                            onClick={() => {
                              const amount = parseInt(grantAmount)
                              if (amount > 0) {
                                handleGrantCredits(selectedUser.userId, amount)
                                setGrantAmount('')
                              }
                            }}
                            disabled={!grantAmount || grantingCredits === selectedUser.userId}
                          >
                            {grantingCredits === selectedUser.userId ? (
                              <><FaSync className={styles.spinning} /> Granting...</>
                            ) : (
                              <><FaCoins /> Grant</>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className={styles.creditInputGroup}>
                        <label>Set Credits (Exact amount)</label>
                        <div className={styles.creditInputRow}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount"
                            value={setAmount}
                            onChange={(e) => setSetAmount(e.target.value)}
                            className={styles.creditInput}
                          />
                          <button 
                            className={styles.btnPrimary}
                            onClick={() => {
                              const amount = parseInt(setAmount)
                              if (amount >= 0) {
                                handleSetCredits(selectedUser.userId, amount)
                                setSetAmount('')
                              }
                            }}
                            disabled={setAmount === '' || settingCredits === selectedUser.userId}
                          >
                            {settingCredits === selectedUser.userId ? (
                              <><FaSync className={styles.spinning} /> Setting...</>
                            ) : (
                              <><FaCoins /> Set</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.userDetailSection}>
                    <h3>User Information</h3>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <strong>User ID:</strong>
                        <code>{selectedUser.userId}</code>
                      </div>
                      <div className={styles.infoItem}>
                        <strong>Email:</strong>
                        <span>{selectedUser.email || 'N/A'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <strong>Status:</strong>
                        <span>{selectedUser.isPremium ? 'Premium' : 'Free'}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <strong>Daily Count:</strong>
                        <span>{selectedUser.dailyCount || 0}</span>
                      </div>
                      {selectedUser.premiumExpiresAt && (
                        <div className={styles.infoItem}>
                          <strong>Premium Expires:</strong>
                          <span>{new Date(selectedUser.premiumExpiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className={styles.supportTab}>
            <div className={styles.supportHeader}>
              <h2>Support Tickets</h2>
              <button 
                onClick={async () => {
                  setRefreshing(true)
                  try {
                    await loadSupportTickets(true) // preserve existing
                  } finally {
                    setRefreshing(false)
                  }
                }} 
                className={styles.btnRefresh}
                disabled={refreshing}
              >
                <FaSync className={refreshing ? styles.spinning : ''} /> 
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className={styles.ticketsList}>
              {supportTickets.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                  No support tickets found. All historical tickets will appear here.
                </p>
              ) : (
                supportTickets.map(ticket => (
                  <div key={ticket.ticketId} className={styles.ticketCard}>
                    <div className={styles.ticketHeader}>
                      <div>
                        <h3>{ticket.subject}</h3>
                        <p>From: {ticket.email} {ticket.userId && `(${ticket.userId})`}</p>
                      </div>
                      <div className={styles.ticketBadges}>
                        <span className={`${styles.badge} ${ticket.status === 'Open' ? styles.badgeWarning : styles.badgeSuccess}`}>
                          {ticket.status}
                        </span>
                        <span className={`${styles.badge} ${ticket.priority === 'High' ? styles.badgeDanger : styles.badgeInfo}`}>
                          {ticket.priority} Priority
                        </span>
                      </div>
                    </div>
                    <div className={styles.ticketBody}>
                      <p>{ticket.message}</p>
                      <div className={styles.ticketMeta}>
                        <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
                        <span>Ticket ID: {ticket.ticketId}</span>
                      </div>
                    </div>
                    {ticket.status === 'Open' && (
                      <div className={styles.ticketActions}>
                        <button 
                          className={styles.btnPrimary}
                          onClick={() => openReplyModal(ticket)}
                        >
                          <FaReply /> Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className={styles.transactionsTab}>
            <div className={styles.transactionsHeader}>
              <h2>Payment Transactions</h2>
              <button 
                onClick={async () => {
                  setRefreshing(true)
                  try {
                    await loadStripeActivities(true) // preserve existing
                  } finally {
                    setRefreshing(false)
                  }
                }} 
                className={styles.btnRefresh}
                disabled={refreshing}
              >
                <FaSync className={refreshing ? styles.spinning : ''} /> 
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className={styles.transactionsList}>
              {stripeActivities.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                  No transactions found. All historical transactions will appear here.
                </p>
              ) : (
                stripeActivities.map((activity, idx) => (
                  <div key={idx} className={styles.transactionCard}>
                    <div className={styles.transactionHeader}>
                      <div>
                        <h3>
                          {activity.eventType === 'PURCHASE' ? '💳 Purchase' : 
                           activity.eventType === 'PREMIUM_PURCHASE' ? '⭐ Premium Purchase' : 
                           '↩️ Refund'}
                        </h3>
                        <p>{activity.customerName || activity.email || activity.userId}</p>
                      </div>
                      <div>
                        <span className={`${styles.badge} ${activity.status === 'SUCCESS' ? styles.badgeSuccess : styles.badgeDanger}`}>
                          {activity.status}
                        </span>
                        {activity.amount !== null && (
                          <p className={styles.transactionAmount}>
                            {activity.currency || 'USD'} ${activity.amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.transactionBody}>
                      <div className={styles.transactionInfo}>
                        <div>
                          <strong>Date:</strong> {new Date(activity.timestamp).toLocaleString()}
                        </div>
                        {activity.last4Digits && (
                          <div>
                            <strong>Card:</strong> •••• {activity.last4Digits}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            <div className={styles.settingsHeader}>
              <h2>Settings & Configuration</h2>
              <button
                onClick={async () => {
                  setRefreshing(true)
                  await loadDashboard()
                  setRefreshing(false)
                }}
                className={styles.btnRefresh}
                disabled={refreshing}
              >
                <FaSync className={refreshing ? styles.spinning : ''} /> 
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* Free Search Limit */}
            <div className={styles.settingsSection}>
              <h3>
                <FaGift /> Free Search Limit
              </h3>
              <p className={styles.settingsDescription}>
                Number of free searches every user gets before needing to purchase credits
              </p>
              <div className={styles.settingsInputGroup}>
                <label>Free Searches per User:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={freeSearchLimit}
                  onChange={(e) => setFreeSearchLimit(parseInt(e.target.value) || 5)}
                  className={styles.settingsInput}
                />
              </div>
            </div>

            {/* Pricing Tiers */}
            <div className={styles.settingsSection}>
              <div className={styles.settingsSectionHeader}>
                <h3>
                  <FaDollarSign /> Credit Pricing Tiers
                </h3>
                <button
                  onClick={() => {
                    const newTier = {
                      id: pricingTiers.length > 0 ? Math.max(...pricingTiers.map(t => t.id || 0)) + 1 : 1,
                      name: '',
                      description: '',
                      price: 0,
                      credits: 0,
                      popular: false
                    }
                    setPricingTiers([...pricingTiers, newTier])
                  }}
                  className={styles.btnAdd}
                >
                  <FaPlus /> Add Tier
                </button>
              </div>
              <p className={styles.settingsDescription}>
                Configure the credit packs available for purchase. Users will see these on the Credits page.
              </p>

              {pricingTiers.length === 0 ? (
                <p className={styles.emptyState}>No pricing tiers configured. Add one to get started.</p>
              ) : (
                <div className={styles.tiersList}>
                  {pricingTiers.map((tier, index) => (
                    <div key={index} className={styles.tierCard}>
                      <div className={styles.tierHeader}>
                        <h4>Tier #{tier.id || index + 1}</h4>
                        {tier.popular && (
                          <span className={styles.popularBadge}>⭐ Popular</span>
                        )}
                        <button
                          onClick={() => {
                            const newTiers = pricingTiers.filter((_, i) => i !== index)
                            setPricingTiers(newTiers)
                          }}
                          className={styles.btnDelete}
                          title="Remove Tier"
                        >
                          <FaTrash />
                        </button>
                      </div>
                      
                      <div className={styles.tierForm}>
                        <div className={styles.tierFormRow}>
                          <div className={styles.tierFormField}>
                            <label>Pack Name *</label>
                            <input
                              type="text"
                              placeholder="e.g., Starter Pack"
                              value={tier.name || ''}
                              onChange={(e) => {
                                const newTiers = [...pricingTiers]
                                newTiers[index] = { ...newTiers[index], name: e.target.value }
                                setPricingTiers(newTiers)
                              }}
                              className={styles.tierInput}
                            />
                          </div>
                          
                          <div className={styles.tierFormField}>
                            <label>Description *</label>
                            <input
                              type="text"
                              placeholder="e.g., Perfect for occasional use"
                              value={tier.description || ''}
                              onChange={(e) => {
                                const newTiers = [...pricingTiers]
                                newTiers[index] = { ...newTiers[index], description: e.target.value }
                                setPricingTiers(newTiers)
                              }}
                              className={styles.tierInput}
                            />
                          </div>
                        </div>

                        <div className={styles.tierFormRow}>
                          <div className={styles.tierFormField}>
                            <label>Price ($) *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={tier.price || ''}
                              onChange={(e) => {
                                const newTiers = [...pricingTiers]
                                newTiers[index] = { ...newTiers[index], price: parseFloat(e.target.value) || 0 }
                                setPricingTiers(newTiers)
                              }}
                              className={styles.tierInput}
                            />
                          </div>
                          
                          <div className={styles.tierFormField}>
                            <label>Credits *</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="0"
                              value={tier.credits || ''}
                              onChange={(e) => {
                                const newTiers = [...pricingTiers]
                                newTiers[index] = { ...newTiers[index], credits: parseInt(e.target.value) || 0 }
                                setPricingTiers(newTiers)
                              }}
                              className={styles.tierInput}
                            />
                          </div>
                          
                          <div className={styles.tierFormField}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={tier.popular || false}
                                onChange={(e) => {
                                  const newTiers = [...pricingTiers]
                                  newTiers[index] = { ...newTiers[index], popular: e.target.checked }
                                  setPricingTiers(newTiers)
                                }}
                              />
                              Mark as Popular
                            </label>
                          </div>
                        </div>

                        {tier.price > 0 && tier.credits > 0 && (
                          <div className={styles.tierPriceInfo}>
                            <FaCoins /> ${(tier.price / tier.credits).toFixed(3)} per credit
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className={styles.settingsActions}>
              <button
                onClick={async () => {
                  // Validate tiers before saving
                  const validTiers = pricingTiers.filter(t => 
                    t.name && t.description && t.price > 0 && t.credits > 0
                  )
                  const incompleteTiers = pricingTiers.filter(t => 
                    !t.name || !t.description || t.price <= 0 || t.credits <= 0
                  )
                  
                  if (incompleteTiers.length > 0 && validTiers.length > 0) {
                    if (!window.confirm(`${incompleteTiers.length} incomplete tier(s) will be removed. Continue?`)) {
                      return
                    }
                  } else if (incompleteTiers.length > 0 && validTiers.length === 0) {
                    showMessage('Please fill in all fields for at least one tier (name, description, price > 0, credits > 0)', 'error')
                    return
                  }
                  
                  setSavingConfig(true)
                  try {
                    await updateAdminConfig({
                      freeSearchLimit: freeSearchLimit,
                      tiers: validTiers.length > 0 ? validTiers : null
                    })
                    showMessage('Configuration saved successfully!', 'success')
                    // Remove incomplete tiers from state
                    if (incompleteTiers.length > 0) {
                      setPricingTiers(validTiers)
                    }
                    // Reload dashboard to get updated config
                    await loadDashboard()
                  } catch (error) {
                    showMessage('Failed to save configuration: ' + (error.response?.data?.message || error.message), 'error')
                  } finally {
                    setSavingConfig(false)
                  }
                }}
                className={styles.btnSave}
                disabled={savingConfig}
              >
                {savingConfig ? (
                  <>
                    <FaSync className={styles.spinning} /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>
          <FaPaw /> Back to Translator
        </Link>
        <p>&copy; 2025 Pet Behavior Translator. All rights reserved.</p>
      </footer>

      {/* Reply Modal */}
      {replyModalOpen && replyingToTicket && (
        <div className={styles.modalOverlay} onClick={closeReplyModal}>
          <div className={styles.replyModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Reply to Support Ticket</h3>
              <button className={styles.modalClose} onClick={closeReplyModal}>
                <FaTimesCircle />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.ticketInfo}>
                <p><strong>Subject:</strong> {replyingToTicket.subject}</p>
                <p><strong>From:</strong> {replyingToTicket.email}</p>
                <p><strong>Ticket ID:</strong> {replyingToTicket.ticketId}</p>
              </div>
              <div className={styles.replyForm}>
                <label>Your Reply *</label>
                <textarea
                  className={styles.replyTextarea}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Enter your reply message..."
                  rows={8}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnSecondary}
                onClick={closeReplyModal}
                disabled={sendingReply}
              >
                Cancel
              </button>
              <button 
                className={styles.btnPrimary}
                onClick={() => handleReplyToTicket(replyingToTicket.ticketId, replyMessage)}
                disabled={!replyMessage.trim() || sendingReply}
              >
                {sendingReply ? (
                  <><FaSync className={styles.spinning} /> Sending...</>
                ) : (
                  <><FaReply /> Send Reply</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCRM

