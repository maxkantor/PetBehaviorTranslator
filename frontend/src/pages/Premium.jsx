import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaCrown, FaCopyright, FaHeart, FaCheck, FaSpinner } from 'react-icons/fa'
import axios from 'axios'
import { getUserId } from '../services/premiumService'
import styles from './Premium.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function Premium() {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$9.99',
      period: '/month',
      description: 'Perfect for trying out premium features',
      popular: false
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$99.99',
      period: '/year',
      description: 'Best value - Save $20!',
      popular: true,
      savings: 'Save 17%'
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '$199.99',
      period: 'one-time',
      description: 'Pay once, use forever',
      popular: false
    }
  ]

  const handlePurchase = async (planId) => {
    setLoading(true)
    setSelectedPlan(planId)
    setMessage('')
    
    try {
      const userId = getUserId()
      const response = await axios.post(`${API_URL}/api/payment/create-checkout`, {
        userId,
        planId
      })
      
      if (response.data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkoutUrl
      }
    } catch (error) {
      console.error('Payment error:', error)
      setMessage(error.response?.data?.message || 'Failed to initiate payment. Please try again.')
      setMessageType('error')
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  return (
    <div className={styles.container}>
      {/* Decorative Pet Images */}
      <img 
        src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&h=300&fit=crop&crop=face" 
        alt="Cute puppy" 
        className={styles.petImage}
        loading="lazy"
      />
      <img 
        src="https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=300&h=300&fit=crop&crop=face" 
        alt="Adorable kitten" 
        className={styles.petImage}
        loading="lazy"
        style={{ top: '10%', right: '5%', animationDelay: '1s' }}
      />
      
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <FaCrown className={styles.crownIcon} />
        </div>
        <h1 className={styles.title}>Go Premium</h1>
        <p className={styles.subtitle}>
          Get unlimited translations, priority support, and advanced analysis!
        </p>

        {/* Message Alert */}
        {message && (
          <div className={`${styles.message} ${styles[messageType]}`}>
            {message}
          </div>
        )}

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <FaPaw className={styles.featureIcon} />
            <div>
              <p><strong>Unlimited translations</strong></p>
              <p className={styles.featureDesc}>No daily limits - translate as much as you need</p>
            </div>
          </div>
          <div className={styles.feature}>
            <FaPaw className={styles.featureIcon} />
            <div>
              <p><strong>Priority support</strong></p>
              <p className={styles.featureDesc}>24-hour response time vs 48 hours for free users</p>
            </div>
          </div>
          <div className={styles.feature}>
            <FaPaw className={styles.featureIcon} />
            <div>
              <p><strong>Advanced behavior analysis</strong></p>
              <p className={styles.featureDesc}>Detailed insights, prevention tips, and expert recommendations</p>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className={styles.pricingSection}>
          <h2 className={styles.pricingTitle}>Choose Your Plan</h2>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                className={`${styles.pricingCard} ${plan.popular ? styles.popularCard : ''}`}
              >
                {plan.popular && (
                  <div className={styles.popularBadge}>
                    <FaCrown /> Most Popular
                  </div>
                )}
                {plan.savings && (
                  <div className={styles.savingsBadge}>{plan.savings}</div>
                )}
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
                </div>
                <p className={styles.planDescription}>{plan.description}</p>
                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={loading}
                  className={`${styles.purchaseButton} ${plan.popular ? styles.popularButton : ''}`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <>
                      <FaSpinner className={styles.spinning} /> Processing...
                    </>
                  ) : (
                    <>
                      <FaCheck /> Get {plan.name}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className={styles.securePayment}>
            🔒 Secure payment powered by Stripe
          </p>
        </div>

        <Link to="/" className={styles.backButton}>
          <FaPaw />
          Back to Translator
        </Link>
        
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.copyright}>
              <FaCopyright className={styles.copyrightIcon} />
              <span>{new Date().getFullYear()} Pet Behavior Translator. All rights reserved.</span>
              <span className={styles.madeWith}>
                Made with <FaHeart className={styles.heartIcon} /> for pet lovers
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default Premium



