import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FaPaw, FaCheckCircle, FaCrown } from 'react-icons/fa'
import axios from 'axios'
import styles from './PaymentSuccess.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [planDetails, setPlanDetails] = useState(null)

  useEffect(() => {
    const completePayment = async () => {
      const userId = searchParams.get('userId')
      const planId = searchParams.get('planId')

      if (!userId || !planId) {
        setMessage('Invalid payment parameters')
        setLoading(false)
        return
      }

      try {
        const response = await axios.post(`${API_URL}/api/payment/complete`, {
          userId,
          planId
        })

        if (response.data.success) {
          setSuccess(true)
          setMessage(response.data.message)
          setPlanDetails({
            planId: response.data.planId,
            expiresAt: response.data.expiresAt
          })
        }
      } catch (error) {
        console.error('Payment completion error:', error)
        setMessage(error.response?.data?.message || 'Failed to complete payment')
      } finally {
        setLoading(false)
      }
    }

    completePayment()
  }, [searchParams])

  const getPlanName = (planId) => {
    const names = {
      monthly: 'Monthly Premium',
      yearly: 'Yearly Premium',
      lifetime: 'Lifetime Premium'
    }
    return names[planId] || 'Premium'
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {loading ? (
          <>
            <div className={styles.spinner}></div>
            <h1>Processing your payment...</h1>
            <p>Please wait while we activate your premium access.</p>
          </>
        ) : success ? (
          <>
            <div className={styles.iconContainer}>
              <FaCheckCircle className={styles.successIcon} />
            </div>
            <h1 className={styles.title}>Payment Successful!</h1>
            <p className={styles.message}>{message}</p>
            
            {planDetails && (
              <div className={styles.planInfo}>
                <FaCrown className={styles.crownIcon} />
                <h2>{getPlanName(planDetails.planId)}</h2>
                {planDetails.expiresAt && planDetails.planId !== 'lifetime' && (
                  <p className={styles.expiryInfo}>
                    Valid until: {new Date(planDetails.expiresAt).toLocaleDateString()}
                  </p>
                )}
                {planDetails.planId === 'lifetime' && (
                  <p className={styles.lifetimeInfo}>
                    ✨ Lifetime access - yours forever!
                  </p>
                )}
              </div>
            )}

            <div className={styles.features}>
              <h3>What's included:</h3>
              <ul>
                <li><FaPaw /> Unlimited behavior translations</li>
                <li><FaPaw /> Priority support (24-hour response)</li>
                <li><FaPaw /> Advanced AI analysis with detailed insights</li>
                <li><FaPaw /> Prevention tips and expert recommendations</li>
              </ul>
            </div>

            <Link to="/" className={styles.homeButton}>
              <FaPaw />
              Start Using Premium Features
            </Link>
          </>
        ) : (
          <>
            <div className={styles.iconContainer}>
              <div className={styles.errorIcon}>❌</div>
            </div>
            <h1 className={styles.title}>Payment Failed</h1>
            <p className={styles.errorMessage}>{message}</p>
            <Link to="/premium" className={styles.retryButton}>
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentSuccess

