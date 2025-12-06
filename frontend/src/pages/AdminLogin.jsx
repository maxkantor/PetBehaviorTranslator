import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUserShield, FaLock, FaUser, FaSpinner } from 'react-icons/fa'
import { adminLogin } from '../services/adminService'
import styles from './AdminLogin.module.css'

function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await adminLogin(username, password)
      if (result.success) {
        // Store session token
        if (result.sessionToken) {
          localStorage.setItem('adminSessionToken', result.sessionToken)
          localStorage.setItem('adminSessionExpiresAt', result.expiresAt?.toString() || '')
        }
        // Redirect to admin dashboard
        navigate('/admin', { replace: true })
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.iconContainer}>
          <FaUserShield className={styles.icon} />
        </div>
        <h1 className={styles.title}>Admin Login</h1>
        <p className={styles.subtitle}>Enter your credentials to access the admin dashboard</p>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              <FaUser className={styles.inputIcon} />
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className={styles.input}
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              <FaLock className={styles.inputIcon} />
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={styles.input}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <FaSpinner className={styles.spinner} />
                Logging in...
              </>
            ) : (
              <>
                <FaUserShield />
                Login
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
