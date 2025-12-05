import axios from 'axios'
import { getUserId } from './premiumService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Helper to add admin user ID to requests
const getAdminParams = () => {
  const userId = getUserId()
  return { params: { adminUserId: userId } }
}

// Get all users (admin endpoint) - ADMIN ONLY
export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/admin/users`, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

// Get activity log - ADMIN ONLY
export const getActivities = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/admin/activities`, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error fetching activities:', error)
    throw error
  }
}

// Reset user activities - ADMIN ONLY
export const resetUserActivities = async (targetUserId) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/reset-user/${targetUserId}`, {}, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error resetting user activities:', error)
    throw error
  }
}

// Reset all activities - ADMIN ONLY
export const resetAllActivities = async () => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/reset-all`, {}, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error resetting all activities:', error)
    throw error
  }
}

// Set premium status for a user (admin endpoint) - ADMIN ONLY
export const setPremiumStatus = async (userId) => {
  try {
    const adminUserId = getUserId()
    const response = await axios.post(`${API_URL}/api/admin/set-premium/${userId}?adminUserId=${adminUserId}`)
    return response.data
  } catch (error) {
    console.error('Error setting premium status:', error)
    throw error
  }
}

// Set premium status with specific plan - ADMIN ONLY
export const setPremiumPlan = async (userId, planId) => {
  try {
    const adminUserId = getUserId()
    const response = await axios.post(`${API_URL}/api/admin/set-premium-plan/${userId}?adminUserId=${adminUserId}`, {
      planId
    })
    return response.data
  } catch (error) {
    console.error('Error setting premium plan:', error)
    throw error
  }
}

// Remove premium status from a user (admin endpoint) - ADMIN ONLY
export const removePremiumStatus = async (userId) => {
  try {
    const adminUserId = getUserId()
    const response = await axios.post(`${API_URL}/api/admin/remove-premium/${userId}?adminUserId=${adminUserId}`)
    return response.data
  } catch (error) {
    console.error('Error removing premium status:', error)
    throw error
  }
}

// Grant credits to a user - ADMIN ONLY
export const grantCredits = async (userId, credits, existingToken = null) => {
  try {
    const adminUserId = getUserId()
    const response = await axios.post(`${API_URL}/api/admin/grant-credits/${userId}?adminUserId=${adminUserId}`, {
      credits,
      existingToken
    })
    return response.data
  } catch (error) {
    console.error('Error granting credits:', error)
    throw error
  }
}

// Reset user activities - ADMIN ONLY
export const resetUserActivities = async (targetUserId) => {
  try {
    const adminUserId = getUserId()
    const response = await axios.post(`${API_URL}/api/admin/reset-user/${targetUserId}?adminUserId=${adminUserId}`)
    return response.data
  } catch (error) {
    console.error('Error resetting user activities:', error)
    throw error
  }
}

// Reset all activities - ADMIN ONLY
export const resetAllActivities = async () => {
  try {
    const adminUserId = getUserId()
    const response = await axios.post(`${API_URL}/api/admin/reset-all?adminUserId=${adminUserId}`)
    return response.data
  } catch (error) {
    console.error('Error resetting all activities:', error)
    throw error
  }
}

