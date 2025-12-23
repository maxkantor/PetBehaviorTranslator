import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaEnvelope, FaHeadset, FaCrown, FaCheckCircle } from 'react-icons/fa'
import { getUserId, isPremium } from '../services/premiumService'
import axios from 'axios'
import SEOHead from '../components/SEOHead'
import styles from './Support.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function Support({ onClose }) {
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userIsPremium, setUserIsPremium] = useState(false)
  const [ticketId, setTicketId] = useState(null)
  const [errors, setErrors] = useState({})
  const isModal = !!onClose

  const faqItems = [
    {
      question: 'How does the AI analysis work?',
      answer: 'Our AI reviews the behavior you describe, finds patterns, and provides communication tips and next steps.'
    },
    {
      question: 'Do insights expire?',
      answer: 'No. Your insights stay available, and you can unlock more anytime.'
    },
    {
      question: 'How fast is the response?',
      answer: 'Premium: within 24 hours. Free: within 48 hours.'
    },
    {
      question: 'What should I include in my message?',
      answer: 'Include context (what happened, when, any patterns) and what outcome you want (reassurance, plan, or review).'
    }
  ]

  // Check premium status on mount
  useEffect(() => {
    const checkPremium = async () => {
      const premium = await isPremium()
      setUserIsPremium(premium)
    }
    checkPremium()
  }, [])

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Reset errors
    const newErrors = {}
    
    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Validate subject
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required'
    }
    
    // Validate message
    if (!message.trim()) {
      newErrors.message = 'Message is required'
    }
    
    // If there are errors, set them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Clear errors if validation passes
    setErrors({})
    setLoading(true)

    try {
      const userId = getUserId()
      const response = await axios.post(`${API_URL}/api/support/contact`, {
        userId: userId,
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim()
      })

      setTicketId(response.data.ticketId)
      setSubmitted(true)
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (error) {
      alert('Failed to submit support request. Please try again.')
      console.error('Support error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    const successContent = (
      <div className={styles.modal}>
        <div className={styles.successContainer}>
          <FaCheckCircle className={styles.successIcon} />
          <h1 className={styles.title}>Support Request Submitted!</h1>
          <p className={styles.subtitle}>
            {userIsPremium 
              ? "Priority support ticket created! We'll respond within 24 hours."
              : "Support ticket created! We'll respond within 48 hours."}
          </p>
          {ticketId && (
            <p className={styles.ticketId}>
              Ticket ID: <strong>{ticketId}</strong>
            </p>
          )}
          {onClose ? (
            <button onClick={onClose} className={styles.backToApp}>
              <FaPaw />
              Back to Translator
            </button>
          ) : (
            <Link to="/" className={styles.backToApp}>
              <FaPaw />
              Back to Translator
            </Link>
          )}
        </div>
      </div>
    )

    if (isModal) {
      return successContent
    }

    return (
      <>
        <SEOHead 
          title="Support Request Submitted - Pet Behavior Translator"
          description="Your support request has been submitted successfully. We'll get back to you soon!"
          keywords="pet translator support, pet behavior help"
        />
        <div className={styles.container}>
          <div className={styles.content}>
            {successContent}
          </div>
        </div>
      </>
    )
  }

  const modalContent = (
    <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.headerText}>
              <FaHeadset className={styles.headerIcon} />
              <div>
                <h1 className={styles.title}>Need Help?</h1>
                <p className={styles.subtitle}>FAQs on the left, message us on the right.</p>
              </div>
            </div>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.faqColumn}>
              <h3 className={styles.columnTitle}>Frequently Asked Questions</h3>
              <div className={styles.faqList}>
                {faqItems.map((item, idx) => (
                  <div key={idx} className={styles.faqItem}>
                    <h4>{item.question}</h4>
                    <p>{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formColumn}>
              {userIsPremium && (
                <div className={styles.premiumBadge}>
                  <FaCrown className={styles.crownIcon} />
                  <span>Priority Support - 24hr Response</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>
                    <FaEnvelope className={styles.labelIcon} />
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) {
                        setErrors({ ...errors, email: '' })
                      }
                    }}
                    placeholder="your@email.com"
                    required
                  />
                  {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="subject" className={styles.label}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value)
                      if (errors.subject) {
                        setErrors({ ...errors, subject: '' })
                      }
                    }}
                    placeholder="What's this about?"
                    required
                  />
                  {errors.subject && <span className={styles.errorMessage}>{errors.subject}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      if (errors.message) {
                        setErrors({ ...errors, message: '' })
                      }
                    }}
                    placeholder="Describe your question or issue..."
                    rows={8}
                    required
                  />
                  {errors.message && <span className={styles.errorMessage}>{errors.message}</span>}
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading || !email.trim() || !subject.trim() || !message.trim()}
                >
                  {loading ? (
                    <>
                      <FaPaw className={styles.spinningPaw} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaEnvelope />
                      Send Message
                    </>
                  )}
                </button>

                <div className={styles.responseTimes}>
                  <strong>Response Times</strong>
                  <span><FaCrown className={styles.crownIcon} /> Premium: within 24 hours</span>
                  <span>Free: within 48 hours</span>
                </div>
              </form>
            </div>
          </div>
          <div className={styles.modalFooter}>
            {onClose ? (
              <button onClick={onClose} className={styles.backToApp}>
                <FaPaw />
                Back to Translator
              </button>
            ) : (
              <Link to="/" className={styles.backToApp}>
                <FaPaw />
                Back to Translator
              </Link>
            )}
          </div>
        </div>
  )

  if (isModal) {
    return modalContent
  }

  return (
    <>
      <SEOHead 
        title="Support & Contact - Pet Behavior Translator"
        description="Get help with the Pet Behavior Translator. Contact our support team for questions, feedback, or technical assistance."
        keywords="pet translator support, pet behavior help, contact pet translator"
      />
      <div className={styles.overlay} role="dialog" aria-modal="true">
        {modalContent}
      </div>
    </>
  )
}

export default Support

