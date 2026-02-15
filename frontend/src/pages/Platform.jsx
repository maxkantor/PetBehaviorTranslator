import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FaPaw, FaSpinner, FaExclamationTriangle } from 'react-icons/fa'
import SEOHead from '../components/SEOHead'
import styles from './Platform.module.css'

const CENTRAL_PLATFORM_URL = 'https://mk-ai-global-page.s3.us-east-1.amazonaws.com/platform/index.html'
const LOAD_TIMEOUT_MS = 8000

function Platform() {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const iframeRef = useRef(null)
  const timeoutRef = useRef(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    const handleLoad = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      loadedRef.current = true
      setLoading(false)
      setLoadFailed(false)
    }

    const handleError = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setLoading(false)
      setLoadFailed(true)
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      if (!loadedRef.current) {
        setLoading(false)
        setLoadFailed(true)
      }
    }, LOAD_TIMEOUT_MS)

    const iframe = iframeRef.current
    if (iframe) {
      iframe.addEventListener('load', handleLoad)
      iframe.addEventListener('error', handleError)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (iframe) {
        iframe.removeEventListener('load', handleLoad)
        iframe.removeEventListener('error', handleError)
      }
    }
  }, [])

  return (
    <>
      <SEOHead
        title="Platform - MK AI & Performance Systems"
        description="MK AI & Performance Systems - Centralized AI authority platform."
        keywords="MK AI, performance systems, AI platform"
      />
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Platform</h1>
            <span className={styles.subtitle}>MK AI & Performance Systems</span>
          </div>
          <Link to="/" className={styles.backButton}>
            <FaPaw />
            Back to Translator
          </Link>
        </div>

        <div className={styles.iframeContainer}>
          {loading && !loadFailed && (
            <div className={styles.loadingOverlay}>
              <FaSpinner className={styles.spinner} />
              <p>Loading platform...</p>
            </div>
          )}

          {loadFailed ? (
            <div className={styles.fallback}>
              <FaExclamationTriangle className={styles.fallbackIcon} />
              <p className={styles.fallbackMessage}>
                Unable to load platform page. Open in a new tab.
              </p>
              <a
                href={CENTRAL_PLATFORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.fallbackLink}
              >
                Open Platform Page
              </a>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={CENTRAL_PLATFORM_URL}
              title="MK AI & Performance Systems"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              allow="clipboard-read; clipboard-write"
              className={styles.iframe}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default Platform
