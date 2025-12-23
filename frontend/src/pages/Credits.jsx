import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaCoins, FaCrown, FaCopyright, FaHeart, FaCheck, FaSpinner, FaGift } from 'react-icons/fa'
import { getCreditTiers, purchaseCredits, getCreditToken } from '../services/creditService'
import SEOHead from '../components/SEOHead'
import styles from './Credits.module.css'

function Credits({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [tiers, setTiers] = useState([])
  const [loadingTiers, setLoadingTiers] = useState(true)
  const isModal = !!onClose

  useEffect(() => {
    // Reset loading state when component mounts (e.g., when user comes back from checkout)
    setLoading(false)
    setSelectedTier(null)
    loadTiers()
  }, [])

  const loadTiers = async () => {
    try {
      const response = await getCreditTiers()
      setTiers(response.tiers || [])
    } catch (error) {
      console.error('Error loading credit tiers:', error)
      setMessage('Failed to load credit packages. Please try again.')
      setMessageType('error')
    } finally {
      setLoadingTiers(false)
    }
  }

  const handlePurchase = async (tierId) => {
    setLoading(true)
    setSelectedTier(tierId)
    setMessage('')
    
    try {
      const token = getCreditToken()
      if (!token) {
        setMessage('Please refresh the page and try again.')
        setMessageType('error')
        setLoading(false)
        setSelectedTier(null)
        return
      }

      const response = await purchaseCredits(tierId)
      
      if (response.checkoutUrl) {
        // Reset state before redirecting (in case user comes back)
        setLoading(false)
        setSelectedTier(null)
        // Small delay to ensure state resets before navigation
        setTimeout(() => {
          window.location.href = response.checkoutUrl
        }, 100)
      } else {
        setLoading(false)
        setSelectedTier(null)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      setMessage(error.response?.data?.message || 'Failed to initiate purchase. Please try again.')
      setMessageType('error')
      setLoading(false)
      setSelectedTier(null)
    }
  }

  const modalContent = (
    <div className={styles.content}>
        <div className={styles.iconContainer}>
          <FaCoins className={styles.coinIcon} />
        </div>
        <h1 className={styles.title}>Buy Credits</h1>
        <p className={styles.subtitle}>
          Purchase credits to continue translating pet behaviors after your free searches are used up!
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
            <FaGift className={styles.featureIcon} />
            <div>
              <p><strong>5 Free Searches</strong></p>
              <p className={styles.featureDesc}>Start with 5 free translations - no credit card required</p>
            </div>
          </div>
          <div className={styles.feature}>
            <FaCoins className={styles.featureIcon} />
            <div>
              <p><strong>Credits Never Expire</strong></p>
              <p className={styles.featureDesc}>Use your credits whenever you need them</p>
            </div>
          </div>
          <div className={styles.feature}>
            <FaCrown className={styles.featureIcon} />
            <div>
              <p><strong>Same Quality Analysis</strong></p>
              <p className={styles.featureDesc}>All translations use the same advanced AI analysis</p>
            </div>
          </div>
        </div>

        {/* Credit Tiers */}
        <div className={styles.pricingSection}>
          <h2 className={styles.pricingTitle}>Choose Your Credit Pack</h2>
          {loadingTiers ? (
            <div className={styles.loading}>
              <FaSpinner className={styles.spinning} />
              <p>Loading credit packages...</p>
            </div>
          ) : (
            <div className={styles.pricingGrid}>
              {tiers.map((tier) => (
                <div 
                  key={tier.id} 
                  className={`${styles.pricingCard} ${tier.popular ? styles.popularCard : ''}`}
                >
                  {tier.popular && (
                    <div className={styles.popularBadge}>
                      <FaCrown /> Most Popular
                    </div>
                  )}
                  <h3 className={styles.planName}>{tier.name}</h3>
                  <div className={styles.planPrice}>
                    <span className={styles.price}>${tier.price}</span>
                    <span className={styles.period}>one-time</span>
                  </div>
                  <div className={styles.creditsAmount}>
                    <FaCoins className={styles.creditsIcon} />
                    <span className={styles.creditsNumber}>{tier.credits}</span>
                    <span className={styles.creditsLabel}>Credits</span>
                  </div>
                  <p className={styles.planDescription}>{tier.description}</p>
                  <div className={styles.pricePerCredit}>
                    ${(tier.price / tier.credits).toFixed(3)} per credit
                  </div>
                  <button
                    onClick={() => handlePurchase(tier.id)}
                    disabled={loading}
                    className={`${styles.purchaseButton} ${tier.popular ? styles.popularButton : ''}`}
                  >
                    {loading && selectedTier === tier.id ? (
                      <>
                        <FaSpinner className={styles.spinning} /> Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck /> Get {tier.name}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className={styles.securePayment}>
            🔒 Secure payment powered by Stripe
          </p>
        </div>

        {onClose ? (
          <button onClick={onClose} className={styles.backButton}>
            <FaCoins />
            Back to Translator
          </button>
        ) : (
          <Link to="/" className={styles.backButton}>
            <FaCoins />
            Back to Translator
          </Link>
        )}
        
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
  )

  if (isModal) {
    return modalContent
  }

  return (
    <>
      <SEOHead 
        title="Buy Credits - Pet Behavior Translator"
        description="Purchase credit packages to continue using our AI pet behavior translator. Affordable pricing with multiple tier options for all your pet behavior questions."
        keywords="buy pet translator credits, pet behavior credits, purchase pet translator"
      />
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
        style={{ top: '10%', right: '5%', animationDelay: '1s' }}
        loading="lazy"
      />
      
      <div className={styles.overlay}>
        {modalContent}
      </div>
    </div>
    </>
  )
}

export default Credits

