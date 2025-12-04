import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://op6tatj304.execute-api.us-east-1.amazonaws.com/Prod'

// Generate a unique user ID (stored in localStorage)
export const getUserId = () => {
  let userId = localStorage.getItem('petBehaviorUserId')
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('petBehaviorUserId', userId)
  }
  return userId
}

// Get usage information
export const getUsage = async () => {
  try {
    const userId = getUserId()
    const response = await axios.get(`${API_URL}/api/usage/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching usage:', error)
    return { dailyCount: 0, isPremium: false, dailyLimit: 5, remaining: 5 }
  }
}

// Set premium status
export const setPremiumStatus = async (isPremium, expiresAt = null) => {
  try {
    const userId = getUserId()
    const response = await axios.post(`${API_URL}/api/premium/status`, {
      userId,
      isPremium,
      expiresAt
    })
    return response.data
  } catch (error) {
    console.error('Error setting premium status:', error)
    throw error
  }
}

// Check if user is premium
export const isPremium = async () => {
  const usage = await getUsage()
  return usage.isPremium || false
}

// Check if user can make more translations
export const canTranslate = async () => {
  const usage = await getUsage()
  if (usage.isPremium) return true
  return usage.remaining > 0
}

