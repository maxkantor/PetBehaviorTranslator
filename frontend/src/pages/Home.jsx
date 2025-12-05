import { useState, useEffect } from 'react'
import { FaPaw, FaBone, FaCat, FaDog, FaHeart, FaLightbulb, FaListOl, FaExclamationTriangle, FaShoppingCart, FaCopyright, FaCrown, FaHeadset, FaUserShield, FaCoins } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { getUserId } from '../services/premiumService'
import { getOrCreateToken, useCredit, getCreditBalance } from '../services/creditService'
import CreditBalanceIndicator from '../components/CreditBalanceIndicator'
import styles from './Home.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const presetBehaviors = [
  { text: 'Barking at night', icon: <FaDog /> },
  { text: 'Puppy biting hands', icon: <FaBone /> },
  { text: 'Cat meowing at 5AM', icon: <FaCat /> },
  { text: 'Litter box issues', icon: <FaPaw /> },
]

function Home() {
  const [behavior, setBehavior] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(null)
  const [creditBalance, setCreditBalance] = useState({ 
    freeSearchesRemaining: 0, 
    creditsRemaining: 0, 
    freeSearchesUsed: 0, 
    freeSearchLimit: 5 
  })
  const [loadingBalance, setLoadingBalance] = useState(true)

  // Load credit balance on component mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const userId = getUserId()
        // Get or create token if needed
        await getOrCreateToken(userId)
        // Load balance
        const balance = await getCreditBalance()
        setCreditBalance(balance)
      } catch (error) {
        console.error('Error loading credit balance:', error)
      } finally {
        setLoadingBalance(false)
      }
    }
    loadBalance()
  }, [])

  const handleTranslate = async () => {
    if (!behavior.trim()) {
      setError('Please describe your pet\'s behavior')
      return
    }

    // Check if user has credits available
    const hasFreeSearches = creditBalance.freeSearchesRemaining > 0
    const hasCredits = creditBalance.creditsRemaining > 0
    
    if (!hasFreeSearches && !hasCredits) {
      setError('No free searches or credits remaining. Please purchase credits to continue.')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // Use a credit before making the translation request
      const creditResult = await useCredit()
      
      if (!creditResult.success || creditResult.error === 'NO_CREDITS') {
        setError(creditResult.message || 'No credits available. Please purchase credits to continue.')
        // Refresh balance
        const balance = await getCreditBalance()
        setCreditBalance(balance)
        setLoading(false)
        return
      }

      // Update balance from credit result
      setCreditBalance({
        freeSearchesRemaining: creditResult.freeSearchLimit - creditResult.freeSearchesUsed,
        creditsRemaining: creditResult.creditsRemaining || 0,
        freeSearchesUsed: creditResult.freeSearchesUsed || 0,
        freeSearchLimit: creditResult.freeSearchLimit || 5
      })

      // Make translation request (no userId needed for credit system)
      const response = await axios.post(`${API_URL}/api/translate`, {
        behavior: behavior.trim()
      })
      setResults(response.data)
      setError(null)
      setRetryAfterSeconds(null)
      
      // Refresh balance after successful translation
      const balance = await getCreditBalance()
      setCreditBalance(balance)
    } catch (err) {
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to translate behavior. Please try again.'
      setError(errorMessage)
      
      // Extract retry-after information if available
      if (err.response?.status === 429 && err.response?.data?.extensions?.retryAfterSeconds) {
        const seconds = Math.floor(err.response.data.extensions.retryAfterSeconds)
        setRetryAfterSeconds(seconds)
      } else {
        setRetryAfterSeconds(null)
      }
      
      // Refresh balance on error
      const balance = await getCreditBalance()
      setCreditBalance(balance)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetClick = (presetText) => {
    setBehavior(presetText)
  }

  // Countdown timer for rate limit
  useEffect(() => {
    if (retryAfterSeconds !== null && retryAfterSeconds > 0) {
      const timer = setInterval(() => {
        setRetryAfterSeconds(prev => {
          if (prev <= 1) {
            return null
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [retryAfterSeconds])

  const formatTime = (seconds) => {
    if (seconds === null || seconds <= 0) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  return (
    <div className={styles.container}>
      {/* Decorative Pet Images - Specific Breeds */}
      {/* These use SVG placeholders. Replace with actual images in /public/images/ */}
      {/* Old English Sheepdog Puppy */}
      <img 
        src="/images/oes-puppy.jpg" 
        alt="Old English Sheepdog puppy" 
        className={`${styles.petImage} ${styles.puppy1}`}
        loading="lazy"
        onError={(e) => {
          if (!e.target.dataset.fallback) {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ff6b9d" width="400" height="400"/%3E%3Ctext fill="white" font-family="system-ui" font-size="24" font-weight="bold" x="50%25" y="48%25" text-anchor="middle"%3E🐕%3C/text%3E%3Ctext fill="white" font-family="system-ui" font-size="16" x="50%25" y="58%25" text-anchor="middle"%3EOES Puppy%3C/text%3E%3C/svg%3E';
            e.target.dataset.fallback = 'true';
          }
        }}
      />
      {/* German Shepherd Puppy */}
      <img 
        src="/images/german-shepherd-puppy.jpg" 
        alt="German Shepherd puppy" 
        className={`${styles.petImage} ${styles.puppy2}`}
        loading="lazy"
        onError={(e) => {
          if (!e.target.dataset.fallback) {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%234ecdc4" width="400" height="400"/%3E%3Ctext fill="white" font-family="system-ui" font-size="24" font-weight="bold" x="50%25" y="48%25" text-anchor="middle"%3E🐕%3C/text%3E%3Ctext fill="white" font-family="system-ui" font-size="14" x="50%25" y="58%25" text-anchor="middle"%3EGerman Shepherd%3C/text%3E%3C/svg%3E';
            e.target.dataset.fallback = 'true';
          }
        }}
      />
      {/* Doberman Puppy */}
      <img 
        src="/images/doberman-puppy.jpg" 
        alt="Doberman puppy" 
        className={`${styles.petImage} ${styles.puppy3}`}
        loading="lazy"
        onError={(e) => {
          if (!e.target.dataset.fallback) {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%2395e1d3" width="400" height="400"/%3E%3Ctext fill="white" font-family="system-ui" font-size="24" font-weight="bold" x="50%25" y="48%25" text-anchor="middle"%3E🐕%3C/text%3E%3Ctext fill="white" font-family="system-ui" font-size="16" x="50%25" y="58%25" text-anchor="middle"%3EDoberman%3C/text%3E%3C/svg%3E';
            e.target.dataset.fallback = 'true';
          }
        }}
      />
      {/* Sphynx Kitten */}
      <img 
        src="/images/sphynx-kitten.jpg" 
        alt="Sphynx kitten" 
        className={`${styles.petImage} ${styles.kitten1}`}
        loading="lazy"
        onError={(e) => {
          if (!e.target.dataset.fallback) {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ffe66d" width="400" height="400"/%3E%3Ctext fill="white" font-family="system-ui" font-size="24" font-weight="bold" x="50%25" y="48%25" text-anchor="middle"%3E🐱%3C/text%3E%3Ctext fill="white" font-family="system-ui" font-size="16" x="50%25" y="58%25" text-anchor="middle"%3ESphynx%3C/text%3E%3C/svg%3E';
            e.target.dataset.fallback = 'true';
          }
        }}
      />
      {/* Maine Coon Kitten */}
      <img 
        src="/images/maine-coon-kitten.jpg" 
        alt="Maine Coon kitten" 
        className={`${styles.petImage} ${styles.kitten2}`}
        loading="lazy"
        onError={(e) => {
          if (!e.target.dataset.fallback) {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ff8fb3" width="400" height="400"/%3E%3Ctext fill="white" font-family="system-ui" font-size="24" font-weight="bold" x="50%25" y="48%25" text-anchor="middle"%3E🐱%3C/text%3E%3Ctext fill="white" font-family="system-ui" font-size="14" x="50%25" y="58%25" text-anchor="middle"%3EMaine Coon%3C/text%3E%3C/svg%3E';
            e.target.dataset.fallback = 'true';
          }
        }}
      />
      {/* Siamese Kitten */}
      <img 
        src="/images/siamese-kitten.jpg" 
        alt="Siamese kitten" 
        className={`${styles.petImage} ${styles.kitten3}`}
        loading="lazy"
        onError={(e) => {
          if (!e.target.dataset.fallback) {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23667eea" width="400" height="400"/%3E%3Ctext fill="white" font-family="system-ui" font-size="24" font-weight="bold" x="50%25" y="48%25" text-anchor="middle"%3E🐱%3C/text%3E%3Ctext fill="white" font-family="system-ui" font-size="16" x="50%25" y="58%25" text-anchor="middle"%3ESiamese%3C/text%3E%3C/svg%3E';
            e.target.dataset.fallback = 'true';
          }
        }}
      />
      
      <div className={styles.header}>
        <h1 className={styles.title}>
          <FaPaw className={styles.titleIcon} />
          AI Pet Behavior Translator
        </h1>
        <p className={styles.subtitle}>
          Type what your pet is doing — get instant answers.
        </p>
        
        {/* Credit Balance Display */}
        <div className={styles.usageDisplay}>
          <CreditBalanceIndicator />
          {!loadingBalance && creditBalance.freeSearchesRemaining === 0 && creditBalance.creditsRemaining === 0 && (
            <Link to="/credits" className={styles.upgradeLink}>
              Buy Credits
            </Link>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.inputSection}>
          <textarea
            className={styles.textarea}
            placeholder="Describe your pet's behavior... e.g., 'My dog barks every time someone knocks on the door'"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            rows={6}
          />

          <div className={styles.presets}>
            <p className={styles.presetsLabel}>Quick actions:</p>
            <div className={styles.presetButtons}>
              {presetBehaviors.map((preset, idx) => (
                <button
                  key={idx}
                  className={styles.presetButton}
                  onClick={() => handlePresetClick(preset.text)}
                >
                  <span className={styles.presetIcon}>{preset.icon}</span>
                  {preset.text}
                </button>
              ))}
            </div>
          </div>

          <button
            className={styles.translateButton}
            onClick={handleTranslate}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaPaw className={styles.spinningPaw} />
                Translating...
              </>
            ) : (
              <>
                <FaPaw />
                Translate Behavior
              </>
            )}
          </button>
        </div>

        {error && (
          <div className={styles.errorCard}>
            <p>{error}</p>
            {error.toLowerCase().includes('rate limit') && (
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                {retryAfterSeconds !== null && retryAfterSeconds > 0 && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '0.75rem', 
                    background: '#fff3cd', 
                    border: '1px solid #ffc107', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#856404' }}>
                      ⏱️ Try again in: {formatTime(retryAfterSeconds)}
                    </p>
                  </div>
                )}
                <p><strong>💡 Tips:</strong></p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Wait a few minutes before trying again</li>
                  <li>Free tier accounts have lower rate limits</li>
                  <li>Consider upgrading your OpenAI plan for higher limits</li>
                </ul>
                {retryAfterSeconds === null || retryAfterSeconds === 0 ? (
                  <button
                    onClick={handleTranslate}
                    disabled={loading || !behavior.trim()}
                    style={{
                      marginTop: '1rem',
                      padding: '0.75rem 1.5rem',
                      background: '#4ecdc4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: loading || !behavior.trim() ? 'not-allowed' : 'pointer',
                      opacity: loading || !behavior.trim() ? 0.6 : 1
                    }}
                  >
                    🔄 Retry Now
                  </button>
                ) : null}
              </div>
            )}
            {(error.toLowerCase().includes('billing') || error.toLowerCase().includes('quota') || error.toLowerCase().includes('payment')) && (
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                <p><strong>💳 Billing Issue:</strong></p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Your OpenAI account may need payment information</li>
                  <li>Check your billing at <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4' }}>platform.openai.com/account/billing</a></li>
                  <li>Add credits or update your payment method</li>
                </ul>
              </div>
            )}
            {!error.toLowerCase().includes('rate limit') && 
             !error.toLowerCase().includes('billing') && 
             !error.toLowerCase().includes('quota') && 
             !error.toLowerCase().includes('payment') &&
             (error.toLowerCase().includes('openai') || error.toLowerCase().includes('api')) && (
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                <p><strong>🔍 Troubleshooting:</strong></p>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Check your OpenAI API key is correct</li>
                  <li>Verify your account status at <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4' }}>platform.openai.com</a></li>
                  <li>Check OpenAI status at <a href="https://status.openai.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4' }}>status.openai.com</a></li>
                </ul>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className={styles.results}>
            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>
                <FaPaw className={styles.resultIcon} />
                Likely Cause
              </h3>
              <p className={styles.resultText}>{results.cause}</p>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>
                <FaLightbulb className={styles.resultIcon} />
                Quick Fix
              </h3>
              <p className={styles.resultText}>{results.quickFix}</p>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>
                <FaListOl className={styles.resultIcon} />
                Step-by-Step Fix
              </h3>
              <ul className={styles.stepsList}>
                {results.steps.map((step, idx) => (
                  <li key={idx}>
                    <span className={styles.stepNumber}>{idx + 1}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>
                <FaExclamationTriangle className={styles.resultIcon} />
                Vet Warning Signs
              </h3>
              <p className={styles.resultText}>{results.vetWarning}</p>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>
                <FaShoppingCart className={styles.resultIcon} />
                Recommended Products
              </h3>
              <ul className={styles.productsList}>
                {results.products.map((product, idx) => (
                  <li key={idx}>
                    {product.url ? (
                      <a 
                        href={product.url} 
                        className={styles.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          // Track affiliate link clicks (optional analytics)
                          if (product.isAffiliateLink && window.gtag) {
                            window.gtag('event', 'affiliate_click', {
                              'product_name': product.name,
                              'link_url': product.url
                            });
                          }
                        }}
                      >
                        <FaHeart className={styles.productIcon} />
                        {product.name}
                        <span className={styles.externalLinkIcon}> ↗</span>
                      </a>
                    ) : (
                      <span className={styles.productText}>
                        <FaHeart className={styles.productIcon} />
                        {product.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium Features: Advanced Insights */}
            {results.isPremium && results.advancedInsights && (
              <div className={styles.resultCard}>
                <h3 className={styles.resultTitle}>
                  <FaCrown className={styles.resultIcon} />
                  Advanced Insights
                </h3>
                <p className={styles.resultText}>{results.advancedInsights}</p>
              </div>
            )}

            {/* Premium Features: Prevention Tips */}
            {results.isPremium && results.preventionTips && (
              <div className={styles.resultCard}>
                <h3 className={styles.resultTitle}>
                  <FaPaw className={styles.resultIcon} />
                  Prevention Tips
                </h3>
                <p className={styles.resultText}>{results.preventionTips}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <Link to="/credits" className={styles.premiumLink}>
              <FaCoins />
              Buy Credits
            </Link>
            <Link to="/support" className={styles.supportLink}>
              <FaHeadset />
              Contact Support
            </Link>
            <Link to="/admin" className={styles.adminLink}>
              <FaPaw />
              Admin Dashboard
            </Link>
          </div>

          <div className={styles.copyright}>
            <FaCopyright className={styles.copyrightIcon} />
            <span>{new Date().getFullYear()} Pet Behavior Translator. All rights reserved.</span>
            <span className={styles.madeWith}>
              Made with <FaHeart className={styles.heartIcon} /> for pet lovers
            </span>
            <span className={styles.affiliateDisclaimer}>
              We may earn commissions from qualifying purchases.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home



