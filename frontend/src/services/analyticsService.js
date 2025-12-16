// Analytics Service - Google Analytics & Mixpanel Integration
// This helps track user behavior to optimize monetization

// These will be loaded from the backend API
let GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
let MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || ''
let MIXPANEL_INITIALIZED = false // Track if Mixpanel has been successfully initialized

// Load analytics config from backend API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export const loadAnalyticsConfig = async () => {
  try {
    const response = await fetch(`${API_URL}/api/config/analytics`)
    if (response.ok) {
      const config = await response.json()
      if (config.gaMeasurementId) {
        GA_MEASUREMENT_ID = config.gaMeasurementId
      }
      if (config.mixpanelToken && config.mixpanelToken.trim() !== '') {
        MIXPANEL_TOKEN = config.mixpanelToken
      }
    }
  } catch (error) {
    console.log('Failed to load analytics config from API, using environment variables:', error)
    // Fall back to environment variables if API fails
  }
  
  // Final check - if still no token, ensure it's empty string
  if (!MIXPANEL_TOKEN || MIXPANEL_TOKEN.trim() === '') {
    MIXPANEL_TOKEN = ''
  }
}

// Initialize Google Analytics (GA4)
export const initGoogleAnalytics = () => {
  if (!GA_MEASUREMENT_ID) {
    console.log('Google Analytics not configured (VITE_GA_MEASUREMENT_ID not set)')
    return
  }

  // Load gtag script
  const script1 = document.createElement('script')
  script1.async = true
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script1)

  const script2 = document.createElement('script')
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      page_path: window.location.pathname
    });
  `
  document.head.appendChild(script2)

  console.log('Google Analytics initialized')
}

// Initialize Mixpanel
export const initMixpanel = () => {
  // STRICT check - only proceed if token exists and is not empty
  // This prevents the script from loading at all if no token
  const token = MIXPANEL_TOKEN?.trim() || ''
  if (!token || token === '' || token === 'undefined' || token === 'null') {
    // Remove any existing Mixpanel scripts if no token
    const existingScripts = document.querySelectorAll('script[src*="mixpanel"]')
    existingScripts.forEach(script => script.remove())
    
    // Clear Mixpanel from window if it exists
    if (window.mixpanel) {
      try {
        delete window.mixpanel
      } catch (e) {
        // Ignore
      }
    }
    
    MIXPANEL_INITIALIZED = false
    // Absolutely do not load Mixpanel if no valid token
    return
  }

  // Check if Mixpanel is already loaded and initialized
  if (window.mixpanel && MIXPANEL_INITIALIZED) {
    return // Already initialized
  }

  // Check if Mixpanel script is already in the page
  const existingScript = document.querySelector('script[src*="mixpanel"]')
  if (existingScript && !window.mixpanel) {
    // Script is loading but not ready yet - wait for it
    const checkExisting = setInterval(() => {
      if (window.mixpanel && typeof window.mixpanel.init === 'function') {
        clearInterval(checkExisting)
        try {
          window.mixpanel.init(token, {
            track_pageview: true,
            persistence: 'localStorage'
          })
          MIXPANEL_INITIALIZED = true
        } catch (error) {
          MIXPANEL_INITIALIZED = false
        }
      }
    }, 100)
    
    // Stop checking after 2 seconds
    setTimeout(() => clearInterval(checkExisting), 2000)
    return
  }

  // Only load script if not already present
  if (!existingScript) {
    // Load Mixpanel script
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
    
    script.onload = () => {
      // Wait a moment for Mixpanel to be available
      setTimeout(() => {
        if (window.mixpanel && typeof window.mixpanel.init === 'function') {
          try {
            window.mixpanel.init(token, {
              track_pageview: true,
              persistence: 'localStorage'
            })
            MIXPANEL_INITIALIZED = true
          } catch (error) {
            MIXPANEL_INITIALIZED = false
          }
        } else {
          MIXPANEL_INITIALIZED = false
        }
      }, 200)
    }
    
    script.onerror = () => {
      MIXPANEL_INITIALIZED = false
    }
    
    document.head.appendChild(script)
  }
}

// Track page view
export const trackPageView = (pageName, pagePath) => {
  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath || window.location.pathname,
      page_title: pageName
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Page View', {
        page_name: pageName,
        page_path: pagePath || window.location.pathname
      })
    } catch (error) {
      // Silently fail
    }
  }
}

// Track translation event (key monetization event)
export const trackTranslation = (userId, behaviorLength, hasCredits, isFreeSearch) => {
  const eventData = {
    user_id: userId,
    behavior_length: behaviorLength,
    has_credits: hasCredits,
    is_free_search: isFreeSearch,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'translation', {
      event_category: 'engagement',
      event_label: isFreeSearch ? 'free_search' : 'paid_search',
      value: hasCredits ? 1 : 0,
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Translation', eventData)
      if (window.mixpanel.people && typeof window.mixpanel.people.set === 'function') {
        window.mixpanel.people.set(userId, {
          last_translation: new Date().toISOString(),
          total_translations: (window.mixpanel.people.get(userId)?.total_translations || 0) + 1
        })
      }
    } catch (error) {
      // Silently fail
    }
  }
}

// Track credit purchase (key revenue event)
export const trackCreditPurchase = (userId, tierId, tierName, price, credits) => {
  const eventData = {
    user_id: userId,
    tier_id: tierId,
    tier_name: tierName,
    price: price,
    credits: credits,
    price_per_credit: price / credits,
    timestamp: new Date().toISOString()
  }

  // Google Analytics - Enhanced Ecommerce
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'purchase', {
      transaction_id: `credit_${tierId}_${Date.now()}`,
      value: price,
      currency: 'USD',
      items: [{
        item_id: tierId,
        item_name: tierName,
        price: price,
        quantity: 1
      }],
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Credit Purchase', eventData)
      if (window.mixpanel.people && typeof window.mixpanel.people.increment === 'function') {
        window.mixpanel.people.increment(userId, {
          total_spent: price,
          total_credits_purchased: credits,
          purchase_count: 1
        })
      }
    } catch (error) {
      // Silently fail
    }
  }
}

// Track premium purchase (key revenue event)
export const trackPremiumPurchase = (userId, planId, planName, price) => {
  const eventData = {
    user_id: userId,
    plan_id: planId,
    plan_name: planName,
    price: price,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'purchase', {
      transaction_id: `premium_${planId}_${Date.now()}`,
      value: price,
      currency: 'USD',
      items: [{
        item_id: planId,
        item_name: planName,
        price: price,
        quantity: 1
      }],
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Premium Purchase', eventData)
      if (window.mixpanel.people && typeof window.mixpanel.people.set === 'function') {
        window.mixpanel.people.set(userId, {
          is_premium: true,
          premium_plan: planId,
          total_spent: (window.mixpanel.people.get(userId)?.total_spent || 0) + price
        })
      }
    } catch (error) {
      // Silently fail
    }
  }
}

// Track credit balance low (conversion opportunity)
export const trackCreditLow = (userId, creditsRemaining) => {
  const eventData = {
    user_id: userId,
    credits_remaining: creditsRemaining,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'credit_low', {
      event_category: 'engagement',
      value: creditsRemaining,
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Credit Low', eventData)
    } catch (error) {
      // Silently fail
    }
  }
}

// Track out of credits (high conversion opportunity)
export const trackOutOfCredits = (userId) => {
  const eventData = {
    user_id: userId,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'out_of_credits', {
      event_category: 'conversion',
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Out of Credits', eventData)
    } catch (error) {
      // Silently fail
    }
  }
}

// Track button clicks (to optimize UI)
export const trackButtonClick = (buttonName, location, userId = null) => {
  const eventData = {
    button_name: buttonName,
    location: location,
    user_id: userId,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'button_click', {
      event_category: 'ui_interaction',
      event_label: buttonName,
      location: location,
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Button Click', eventData)
    } catch (error) {
      // Silently fail
    }
  }
}

// Track user signup/identification
export const identifyUser = (userId, email = null, properties = {}) => {
  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('set', { user_id: userId })
    if (email) {
      window.gtag('set', { user_email: email })
    }
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.identify === 'function') {
    try {
      window.mixpanel.identify(userId)
      if (email && window.mixpanel.people && typeof window.mixpanel.people.set === 'function') {
        window.mixpanel.people.set(userId, {
          email: email,
          ...properties
        })
      }
    } catch (error) {
      // Silently fail
    }
  }
}

// Track funnel step (for conversion optimization)
export const trackFunnelStep = (stepName, stepNumber, userId = null) => {
  const eventData = {
    step_name: stepName,
    step_number: stepNumber,
    user_id: userId,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'funnel_step', {
      event_category: 'conversion',
      event_label: stepName,
      value: stepNumber,
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Funnel Step', eventData)
    } catch (error) {
      // Silently fail
    }
  }
}

// Track error (to understand issues affecting conversions)
export const trackError = (errorType, errorMessage, userId = null) => {
  const eventData = {
    error_type: errorType,
    error_message: errorMessage,
    user_id: userId,
    timestamp: new Date().toISOString()
  }

  // Google Analytics
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'exception', {
      description: errorMessage,
      fatal: false,
      user_id: userId
    })
  }

  // Mixpanel - only use if properly initialized
  if (MIXPANEL_INITIALIZED && window.mixpanel && typeof window.mixpanel.track === 'function') {
    try {
      window.mixpanel.track('Error', eventData)
    } catch (error) {
      // Silently fail
    }
  }
}

