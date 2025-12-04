import { useSearchParams, useNavigate } from 'react-router-dom'
import { FaCreditCard, FaLock } from 'react-icons/fa'
import styles from './MockCheckout.module.css'

function MockCheckout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const userId = searchParams.get('userId')
  const planId = searchParams.get('planId')
  const price = searchParams.get('price')
  const name = searchParams.get('name')
  const successUrl = searchParams.get('success')
  const cancelUrl = searchParams.get('cancel')

  const handlePay = () => {
    // Simulate successful payment
    window.location.href = decodeURIComponent(successUrl)
  }

  const handleCancel = () => {
    window.location.href = decodeURIComponent(cancelUrl)
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <FaLock className={styles.lockIcon} />
          <h1>Secure Checkout</h1>
          <p className={styles.subtitle}>Demo Payment Page</p>
        </div>

        <div className={styles.orderSummary}>
          <h2>Order Summary</h2>
          <div className={styles.planDetails}>
            <div className={styles.planName}>{decodeURIComponent(name)}</div>
            <div className={styles.planPrice}>${price}</div>
          </div>
        </div>

        <div className={styles.demoNotice}>
          <p><strong>⚠️ Demo Mode</strong></p>
          <p>This is a demonstration checkout page. In production, this would integrate with Stripe for secure payment processing.</p>
          <p>Click "Complete Payment" to simulate a successful purchase.</p>
        </div>

        <div className={styles.paymentForm}>
          <div className={styles.formGroup}>
            <label>Card Number</label>
            <div className={styles.inputWithIcon}>
              <FaCreditCard />
              <input type="text" placeholder="4242 4242 4242 4242" disabled />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Expiry</label>
              <input type="text" placeholder="MM/YY" disabled />
            </div>
            <div className={styles.formGroup}>
              <label>CVC</label>
              <input type="text" placeholder="123" disabled />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handlePay} className={styles.payButton}>
            Complete Payment (Demo)
          </button>
          <button onClick={handleCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>

        <div className={styles.secureInfo}>
          <FaLock /> Powered by Stripe (Demo)
        </div>
      </div>
    </div>
  )
}

export default MockCheckout

