import { useState } from 'react'
import { FaEnvelope, FaKey, FaCheckCircle, FaSpinner } from 'react-icons/fa'
import { getUserId } from '../services/premiumService'
import { sendRestoreCode, verifyAndRestoreCredits } from '../services/creditService'
import styles from './RestoreCredits.module.css'

function RestoreCredits({ onRestored }) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const handleSendCode = async () => {
    if (!email.includes('@')) {
      setError('Enter the email you used at checkout.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await sendRestoreCode(email.trim())
      setStep('code')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send a restore code for that email.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await verifyAndRestoreCredits(email.trim(), code.trim(), getUserId())
      setSuccess(result)
      setStep('success')
      onRestored?.(result)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not restore credits. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.card}>
      <h3>Restore purchased credits</h3>
      <p>Bought credits on another phone or browser? Use the email from your Stripe receipt.</p>

      {step === 'email' && (
        <>
          <label htmlFor="restore-email">Purchase email</label>
          <input
            id="restore-email"
            type="email"
            value={email}
            placeholder="you@email.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
          />
          {error && <div className={styles.error}>{error}</div>}
          <button onClick={handleSendCode} disabled={loading || !email}>
            {loading ? <FaSpinner className={styles.spin} /> : <FaEnvelope />}
            {loading ? 'Sending…' : 'Send restore code'}
          </button>
        </>
      )}

      {step === 'code' && (
        <>
          <p className={styles.hint}>We sent a 6-digit code to {email}.</p>
          <label htmlFor="restore-code">Verification code</label>
          <input
            id="restore-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            placeholder="000000"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            <button onClick={handleVerify} disabled={loading || code.length !== 6}>
              {loading ? <FaSpinner className={styles.spin} /> : <FaKey />}
              {loading ? 'Restoring…' : 'Verify and restore'}
            </button>
            <button className={styles.secondary} onClick={() => { setStep('email'); setError('') }} disabled={loading}>
              Use a different email
            </button>
          </div>
        </>
      )}

      {step === 'success' && success && (
        <div className={styles.success}>
          <FaCheckCircle />
          <strong>Credits restored</strong>
          <p>{success.creditsRemaining} credits are now on this device.</p>
          <button className={styles.secondary} onClick={() => { setStep('email'); setCode(''); setSuccess(null) }}>
            Restore another purchase
          </button>
        </div>
      )}
    </div>
  )
}

export default RestoreCredits
