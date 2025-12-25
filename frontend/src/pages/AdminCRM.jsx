import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FaPaw, FaUserShield, FaCrown, FaUsers, FaSync, FaCoins, FaHistory, 
  FaChartBar, FaCog, FaSignOutAlt, FaHeadset, FaReply, FaCopy, FaSearch,
  FaFilter, FaSort, FaUser, FaEnvelope, FaCalendar, FaDollarSign, FaCreditCard,
  FaCheckCircle, FaTimesCircle, FaEdit, FaTrash, FaEye, FaChevronRight,
  FaChevronLeft, FaArrowUp, FaArrowDown, FaTicketAlt, FaShoppingCart
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

  useEffect(() => {
    initializeAdmin()
  }, [])

  const initializeAdmin = async () => {
    const userId = getUserId()
    setCurrentUserId(userId)
    setLoading(true)
    try {
      const email = localStorage.getItem('userEmail')
      if (email) {
        try {
          await adminConnect()
        } catch (connectError) {
          console.warn('Admin connect failed:', connectError)
        }
      }
      await Promise.all([
        loadDashboard(),
        loadUsers(),
        loadSupportTickets(),
        loadStripeActivities()
      ])
      setIsAdmin(true)
    } catch (error) {
      console.error('Admin initialization error:', error)
      if (error.response?.status === 401) {
        showMessage('Session expired. Please log in again.', 'error')
        handleLogout()
      } else {
        showMessage(`Failed to load dashboard: ${error.response?.data?.message || error.message}`, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadDashboard = async () => {
    try {
      const data = await getAdminDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      showMessage('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadSupportTickets = async () => {
    try {
      const data = await getAllSupportTickets()
      setSupportTickets(data.tickets || [])
    } catch (error) {
      console.error('Error loading support tickets:', error)
    }
  }

  const loadStripeActivities = async () => {
    try {
      const data = await getStripeActivities()
      setStripeActivities(data.activities || [])
    } catch (error) {
      console.error('Error loading Stripe activities:', error)
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
      await loadUsers()
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
      await loadUsers()
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
      await replyToSupportTicket(ticketId, replyMessage)
      showMessage('Reply sent successfully!', 'success')
      await loadSupportTickets()
    } catch (error) {
      showMessage('Failed to send reply', 'error')
    }
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
      await loadUsers()
    } catch (error) {
      showMessage('Failed to update premium status', 'error')
    }
  }

  if (!isAdmin && !loading) {
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

  if (loading && !isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FaSync className={styles.spinner} />
          <p>Loading...</p>
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
                <h2>Today's Activity</h2>
                <div className={styles.activityGrid}>
                  <div className={styles.activityCard}>
                    <FaHistory />
                    <div>
                      <h4>Translations</h4>
                      <p>{dashboardData.summary.todaysTranslations || 0}</p>
                    </div>
                  </div>
                  <div className={styles.activityCard}>
                    <FaShoppingCart />
                    <div>
                      <h4>Purchases</h4>
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
              </div>
            )}

            <div className={styles.dashboardSection}>
              <h2>Recent Users</h2>
              <div className={styles.recentUsers}>
                {users.slice(0, 5).map(user => (
                  <div key={user.userId} className={styles.recentUserCard}>
                    <div className={styles.recentUserInfo}>
                      <FaUser />
                      <div>
                        <strong>{user.email || user.userId}</strong>
                        <span>{user.isPremium ? '⭐ Premium' : 'Free'}</span>
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
                    
                    <button onClick={loadUsers} className={styles.btnRefresh}>
                      <FaSync /> Refresh
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
              <button onClick={loadSupportTickets} className={styles.btnRefresh}>
                <FaSync /> Refresh
              </button>
            </div>
            
            <div className={styles.ticketsList}>
              {supportTickets.map(ticket => (
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
                        onClick={() => {
                          const reply = prompt('Enter your reply:')
                          if (reply && reply.trim()) {
                            handleReplyToTicket(ticket.ticketId, reply)
                          }
                        }}
                      >
                        <FaReply /> Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className={styles.transactionsTab}>
            <div className={styles.transactionsHeader}>
              <h2>Payment Transactions</h2>
              <button onClick={loadStripeActivities} className={styles.btnRefresh}>
                <FaSync /> Refresh
              </button>
            </div>
            
            <div className={styles.transactionsList}>
              {stripeActivities.map((activity, idx) => (
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
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            <h2>Settings</h2>
            <p>Configuration options will be available here.</p>
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
    </div>
  )
}

export default AdminCRM

