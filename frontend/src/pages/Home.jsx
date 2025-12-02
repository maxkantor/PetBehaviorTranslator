import { useState, useEffect } from 'react'
import { FaPaw, FaBone, FaCat, FaDog } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import axios from 'axios'
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

  const handleTranslate = async () => {
    if (!behavior.trim()) {
      setError('Please describe your pet\'s behavior')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await axios.post(`${API_URL}/api/translate`, {
        behavior: behavior.trim()
      })
      setResults(response.data)
      setError(null)
      setRetryAfterSeconds(null)
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
      <div className={styles.header}>
        <h1 className={styles.title}>
          <FaPaw className={styles.titleIcon} />
          AI Pet Behavior Translator
        </h1>
        <p className={styles.subtitle}>
          Type what your pet is doing — get instant answers.
        </p>
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
              <h3 className={styles.resultTitle}>🐾 Likely Cause</h3>
              <p className={styles.resultText}>{results.cause}</p>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>⚡ Quick Fix</h3>
              <p className={styles.resultText}>{results.quickFix}</p>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>📋 Step-by-Step Fix</h3>
              <ul className={styles.stepsList}>
                {results.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>⚠️ Vet Warning Signs</h3>
              <p className={styles.resultText}>{results.vetWarning}</p>
            </div>

            <div className={styles.resultCard}>
              <h3 className={styles.resultTitle}>🛒 Recommended Products</h3>
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
                        {product.name}
                        <span className={styles.externalLinkIcon}> ↗</span>
                      </a>
                    ) : (
                      <span className={styles.productText}>{product.name}</span>
                    )}
                  </li>
                ))}
              </ul>
              {results.products.some(p => p.isAffiliateLink) && (
                <p className={styles.affiliateDisclaimer}>
                  * As an Amazon Associate, we earn from qualifying purchases
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <Link to="/premium" className={styles.premiumLink}>
          🐾 Go Premium — Unlimited translations
        </Link>
      </footer>
    </div>
  )
}

export default Home



