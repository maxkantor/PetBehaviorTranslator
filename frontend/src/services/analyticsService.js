// Analytics Service - Google Analytics & Mixpanel Integration
// This helps track user behavior to optimize monetization

// These will be loaded from the backend API
let GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
let MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN || ''

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
      if (config.mixpanelToken) {
        MIXPANEL_TOKEN = config.mixpanelToken
      }
    }
  } catch (error) {
    console.log('Failed to load analytics config from API, using environment variables:', error)
    // Fall back to environment variables if API fails
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
  if (!MIXPANEL_TOKEN) {
    console.log('Mixpanel not configured (VITE_MIXPANEL_TOKEN not set)')
    return
  }

  // Load Mixpanel script
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
  script.onload = () => {
    if (window.mixpanel) {
      window.mixpanel.init(MIXPANEL_TOKEN, {
        track_pageview: true,
        persistence: 'localStorage'
      })
      console.log('Mixpanel initialized')
    }
  }
  document.head.appendChild(script)
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Page View', {
      page_name: pageName,
      page_path: pagePath || window.location.pathname
    })
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Translation', eventData)
    window.mixpanel.people.set(userId, {
      last_translation: new Date().toISOString(),
      total_translations: (window.mixpanel.people.get(userId)?.total_translations || 0) + 1
    })
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Credit Purchase', eventData)
    window.mixpanel.people.increment(userId, {
      total_spent: price,
      total_credits_purchased: credits,
      purchase_count: 1
    })
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Premium Purchase', eventData)
    window.mixpanel.people.set(userId, {
      is_premium: true,
      premium_plan: planId,
      total_spent: (window.mixpanel.people.get(userId)?.total_spent || 0) + price
    })
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Credit Low', eventData)
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Out of Credits', eventData)
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Button Click', eventData)
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.identify(userId)
    if (email) {
      window.mixpanel.people.set(userId, {
        email: email,
        ...properties
      })
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Funnel Step', eventData)
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

  // Mixpanel
  if (window.mixpanel && MIXPANEL_TOKEN) {
    window.mixpanel.track('Error', eventData)
  }
}

