import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const CREDIT_TOKEN_KEY = 'creditToken'

/**
 * Stateless credit system service
 * All state is stored in a signed token in localStorage
 */

// Get the current credit token from localStorage
export const getCreditToken = () => {
  return localStorage.getItem(CREDIT_TOKEN_KEY)
}

// Save credit token to localStorage
export const saveCreditToken = (token) => {
  localStorage.setItem(CREDIT_TOKEN_KEY, token)
}

// Clear credit token from localStorage
export const clearCreditToken = () => {
  localStorage.removeItem(CREDIT_TOKEN_KEY)
}

// Get or create a credit token for a user
export const getOrCreateToken = async (userId) => {
  try {
    // Check if we already have a token
    const existingToken = getCreditToken()
    if (existingToken) {
      // Validate it
      const validation = await validateToken(existingToken)
      if (validation && validation.valid) {
        return {
          token: existingToken,
          ...validation
        }
      }
    }

    // Create new token
    const response = await axios.post(`${API_URL}/api/credits/get-token`, {
      userId
    })

    const { token } = response.data
    saveCreditToken(token)
    
    return response.data
  } catch (error) {
    console.error('Error getting/creating token:', error)
    throw error
  }
}

// Use a credit (either free search or paid credit)
export const useCredit = async () => {
  try {
    const token = getCreditToken()
    if (!token) {
      throw new Error('No credit token found')
    }

    const response = await axios.post(`${API_URL}/api/credits/use`, {
      creditToken: token
    })

    // Check if we got an error (NO_CREDITS)
    if (response.data.error === 'NO_CREDITS') {
      return {
        success: false,
        error: 'NO_CREDITS',
        message: response.data.message,
        ...response.data
      }
    }

    // Update token in localStorage
    if (response.data.token) {
      saveCreditToken(response.data.token)
    }

    return {
      success: true,
      ...response.data
    }
  } catch (error) {
    console.error('Error using credit:', error)
    throw error
  }
}

// Get available credit tiers
export const getCreditTiers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/credits/tiers`)
    return response.data
  } catch (error) {
    console.error('Error fetching credit tiers:', error)
    throw error
  }
}

// Purchase credits
export const purchaseCredits = async (tierId) => {
  try {
    const token = getCreditToken()
    if (!token) {
      throw new Error('No credit token found')
    }

    const response = await axios.post(`${API_URL}/api/credits/purchase`, {
      tierId,
      existingToken: token
    })

    return response.data
  } catch (error) {
    console.error('Error purchasing credits:', error)
    throw error
  }
}

// Complete credit purchase (called after payment success)
export const completeCreditPurchase = async (tierId, existingToken) => {
  try {
    const response = await axios.post(`${API_URL}/api/credits/complete-purchase`, {
      tierId,
      existingToken
    })

    // Update token in localStorage
    if (response.data.token) {
      saveCreditToken(response.data.token)
    }

    return response.data
  } catch (error) {
    console.error('Error completing credit purchase:', error)
    throw error
  }
}

// Validate current token and get state
export const validateToken = async (token) => {
  try {
    const response = await axios.post(`${API_URL}/api/credits/validate`, {
      creditToken: token || getCreditToken()
    })

    return response.data
  } catch (error) {
    console.error('Error validating token:', error)
    return null
  }
}

// Get current credit balance
export const getCreditBalance = async () => {
  try {
    const token = getCreditToken()
    if (!token) {
      return {
        freeSearchesRemaining: 0,
        creditsRemaining: 0,
        freeSearchesUsed: 0,
        freeSearchLimit: 5
      }
    }

    const validation = await validateToken(token)
    if (!validation || !validation.valid) {
      return {
        freeSearchesRemaining: 0,
        creditsRemaining: 0,
        freeSearchesUsed: 0,
        freeSearchLimit: 5
      }
    }

    return {
      freeSearchesRemaining: validation.freeSearchesRemaining || 0,
      creditsRemaining: validation.creditsRemaining || 0,
      freeSearchesUsed: validation.freeSearchesUsed || 0,
      freeSearchLimit: validation.freeSearchLimit || 5
    }
  } catch (error) {
    console.error('Error getting credit balance:', error)
    return {
      freeSearchesRemaining: 0,
      creditsRemaining: 0,
      freeSearchesUsed: 0,
      freeSearchLimit: 5
    }
  }
}


