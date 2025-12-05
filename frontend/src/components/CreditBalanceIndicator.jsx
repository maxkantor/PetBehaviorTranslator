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

  const hasFreeSearches = balance.freeSearchesRemaining > 0
  const hasCredits = balance.creditsRemaining > 0

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.badge}>
          <span className={styles.label}>Loading...</span>
        </div>
      </div>
    )
  }

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

      {/* Paid Credits - Always show, even if 0 */}
      <div className={`${styles.badge} ${hasCredits ? styles.hasCredits : styles.noCredits}`}>
        <FaCoins className={styles.icon} />
        <span className={styles.count}>{balance.creditsRemaining}</span>
        <span className={styles.label}>Credits</span>
      </div>

      {/* Show free searches remaining message */}
      {!hasFreeSearches && !hasCredits && balance.freeSearchesUsed >= balance.freeSearchLimit && (
        <div className={styles.badge} style={{ background: 'rgba(255, 193, 7, 0.2)', color: '#856404' }}>
          <span className={styles.label}>Free searches used up</span>
        </div>
      )}
    </div>
  )
}

export default CreditBalanceIndicator


