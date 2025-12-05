import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaCoins, FaGift } from 'react-icons/fa'
import { getCreditBalance } from '../services/creditService'
import styles from './CreditBalanceIndicator.module.css'

function CreditBalanceIndicator() {
  const [balance, setBalance] = useState({
    freeSearchesRemaining: 0,
    creditsRemaining: 0,
    freeSearchesUsed: 0,
    freeSearchLimit: 5
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBalance()
  }, [])

  const loadBalance = async () => {
    try {
      const data = await getCreditBalance()
      setBalance(data)
    } catch (error) {
      console.error('Error loading balance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh balance (call this after using a credit)
  window.refreshCreditBalance = loadBalance

  if (loading) {
    return null
  }

  const hasFreeSearches = balance.freeSearchesRemaining > 0
  const hasCredits = balance.creditsRemaining > 0

  return (
    <div className={styles.container}>
      {/* Free Searches */}
      {hasFreeSearches && (
        <div className={styles.badge}>
          <FaGift className={styles.icon} />
          <span className={styles.count}>{balance.freeSearchesRemaining}</span>
          <span className={styles.label}>Free</span>
        </div>
      )}

      {/* Paid Credits */}
      <div className={`${styles.badge} ${hasCredits ? styles.hasCredits : styles.noCredits}`}>
        <FaCoins className={styles.icon} />
        <span className={styles.count}>{balance.creditsRemaining}</span>
        <span className={styles.label}>Credits</span>
      </div>

      {/* Buy Credits Link */}
      {!hasCredits && !hasFreeSearches && (
        <Link to="/credits" className={styles.buyLink}>
          Buy Credits
        </Link>
      )}
    </div>
  )
}

export default CreditBalanceIndicator


