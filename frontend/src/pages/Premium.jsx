import { Link } from 'react-router-dom'
import { FaPaw, FaCrown, FaCopyright, FaHeart } from 'react-icons/fa'
import styles from './Premium.module.css'

function Premium() {
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



