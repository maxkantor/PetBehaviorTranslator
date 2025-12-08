import { useEffect, useState } from 'react'
import { useSearchParams, Link, useLocation } from 'react-router-dom'
import { FaPaw, FaCheckCircle, FaCrown, FaCoins } from 'react-icons/fa'
import axios from 'axios'
import { getCreditToken, completeCreditPurchase } from '../services/creditService'
import styles from './PaymentSuccess.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [planDetails, setPlanDetails] = useState(null)
  const [isCreditPurchase, setIsCreditPurchase] = useState(false)

  useEffect(() => {
    const completePayment = async () => {
      // Check if this is a credit purchase (from /credits/success)
      const isCredit = location.pathname.includes('/credits/success')
      setIsCreditPurchase(isCredit)

      // Check if this is a Stripe checkout (has session_id)
      const sessionId = searchParams.get('session_id')
      const isStripe = !!sessionId

      if (isCredit) {
        // Handle credit purchase
        const tierId = parseInt(searchParams.get('tierId'))
        const token = searchParams.get('token') || getCreditToken()

        if (!tierId || !token) {
          setMessage('Invalid credit purchase parameters')
          setLoading(false)
          return
        }

        try {
          // If Stripe session, pass sessionId; otherwise use regular flow
          const requestData = isStripe 
            ? { tierId, existingToken: token, sessionId }
            : { tierId, existingToken: token }
          
          const response = await axios.post(`${API_URL}/api/credits/complete-purchase`, requestData)

          if (response.data.success) {
            // Save the updated token to localStorage
            if (response.data.token) {
              localStorage.setItem('creditToken', response.data.token)
            }
            
            setSuccess(true)
            setMessage(response.data.message)
            setPlanDetails({
              tierId: response.data.tierName,
              creditsAdded: response.data.creditsAdded,
              creditsRemaining: response.data.creditsRemaining
            })
            
            // Refresh credit balance display
            if (window.refreshCreditBalance) {
              window.refreshCreditBalance()
            }
          }
        } catch (error) {
          console.error('Credit purchase completion error:', error)
          setMessage(error.response?.data?.message || 'Failed to complete credit purchase')
        } finally {
          setLoading(false)
        }
      } else {
        // Handle premium purchase
        const userId = searchParams.get('userId')
        const planId = searchParams.get('planId')

        if (!userId || !planId) {
          setMessage('Invalid payment parameters')
          setLoading(false)
          return
        }

        try {
          // If Stripe session, pass sessionId; otherwise use regular flow
          const requestData = isStripe
            ? { userId, planId, sessionId }
            : { userId, planId }
          
          const response = await axios.post(`${API_URL}/api/payment/complete`, requestData)

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
    }

    completePayment()
  }, [searchParams, location])

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
            <p>Please wait while we {isCreditPurchase ? 'add credits to your account' : 'activate your premium access'}.</p>
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
                {isCreditPurchase ? (
                  <>
                    <FaCoins className={styles.crownIcon} />
                    <h2>{planDetails.tierId}</h2>
                    <p className={styles.creditsInfo}>
                      ✨ {planDetails.creditsAdded} credits added to your account!
                    </p>
                    <p className={styles.creditsRemaining}>
                      Total credits: {planDetails.creditsRemaining}
                    </p>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}

            {!isCreditPurchase && (
              <div className={styles.features}>
                <h3>What's included:</h3>
                <ul>
                  <li><FaPaw /> Unlimited behavior translations</li>
                  <li><FaPaw /> Priority support (24-hour response)</li>
                  <li><FaPaw /> Advanced AI analysis with detailed insights</li>
                  <li><FaPaw /> Prevention tips and expert recommendations</li>
                </ul>
              </div>
            )}

            <Link to="/" className={styles.homeButton}>
              {isCreditPurchase ? (
                <>
                  <FaCoins />
                  Start Translating
                </>
              ) : (
                <>
                  <FaPaw />
                  Start Using Premium Features
                </>
              )}
            </Link>
          </>
        ) : (
          <>
            <div className={styles.iconContainer}>
              <div className={styles.errorIcon}>❌</div>
            </div>
            <h1 className={styles.title}>Payment Failed</h1>
            <p className={styles.errorMessage}>{message}</p>
            <Link to={isCreditPurchase ? "/credits" : "/premium"} className={styles.retryButton}>
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentSuccess


