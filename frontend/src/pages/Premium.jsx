import { Link } from 'react-router-dom'
import { FaPaw, FaCrown } from 'react-icons/fa'
import styles from './Premium.module.css'

function Premium() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <FaCrown className={styles.crownIcon} />
        </div>
        <h1 className={styles.title}>Go Premium</h1>
        <p className={styles.subtitle}>
          Unlimited behavior translations — coming soon!
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <FaPaw className={styles.featureIcon} />
            <p>Unlimited translations</p>
          </div>
          <div className={styles.feature}>
            <FaPaw className={styles.featureIcon} />
            <p>Priority support</p>
          </div>
          <div className={styles.feature}>
            <FaPaw className={styles.featureIcon} />
            <p>Advanced behavior analysis</p>
          </div>
        </div>
        <Link to="/" className={styles.backButton}>
          <FaPaw />
          Back to Translator
        </Link>
      </div>
    </div>
  )
}

export default Premium



