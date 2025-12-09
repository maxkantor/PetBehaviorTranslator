import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaEnvelope, FaHeadset, FaCrown, FaCheckCircle } from 'react-icons/fa'
import { getUserId, isPremium } from '../services/premiumService'
import axios from 'axios'
import styles from './Support.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

function Support() {
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userIsPremium, setUserIsPremium] = useState(false)
  const [ticketId, setTicketId] = useState(null)
  const [errors, setErrors] = useState({})

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
    return (
      <div className={styles.container}>
        <div className={styles.content}>
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
            <Link to="/" className={styles.backButton}>
              <FaPaw />
              Back to Translator
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <FaHeadset className={styles.headerIcon} />
          <h1 className={styles.title}>Contact Support</h1>
          {userIsPremium && (
            <div className={styles.premiumBadge}>
              <FaCrown className={styles.crownIcon} />
              <span>Priority Support - 24hr Response</span>
            </div>
          )}
        </div>

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
        </form>

        <div className={styles.info}>
          <p>
            <strong>Response Times:</strong>
          </p>
          <ul>
            <li>
              <FaCrown className={styles.crownIcon} /> Premium: Within 24 hours
            </li>
            <li>Free: Within 48 hours</li>
          </ul>
        </div>

        <Link to="/" className={styles.backButton}>
          <FaPaw />
          Back to Translator
        </Link>
      </div>
    </div>
  )
}

export default Support

