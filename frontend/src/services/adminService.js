import axios from 'axios'
import { getUserId } from './premiumService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Helper to get user email (if available)
const getUserEmail = () => {
  // Try to get from localStorage or other source
  return localStorage.getItem('userEmail') || null
}

// Helper to add admin user ID and email to requests
const getAdminParams = () => {
  const userId = getUserId()
  const email = getUserEmail()
  const params = { adminUserId: userId }
  if (email) {
    params.email = email
  }
  return { params }
}

// Check if current user is admin
export const checkAdmin = async () => {
  try {
    const userId = getUserId()
    console.log('Checking admin status for user:', userId)
    const response = await axios.get(`${API_URL}/api/admin/check`, { params: { userId } })
    console.log('Admin check response:', response.data)
    return response.data.isAdmin || false
  } catch (error) {
    console.error('Error checking admin status:', error)
    console.error('Error response:', error.response?.data)
    return false
  }
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

// ============================================================================
// NEW ADMIN ENDPOINTS - Enhanced Admin System
// ============================================================================

// POST /admin/login - Login with username/password
export const adminLogin = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/login`, {
      username,
      password
    })
    return response.data
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

// Check if admin session is valid
export const checkAdminSession = () => {
  const sessionToken = localStorage.getItem('adminSessionToken')
  const expiresAt = localStorage.getItem('adminSessionExpiresAt')
  
  if (!sessionToken || !expiresAt) {
    return false
  }
  
  // Check if session expired
  const now = Math.floor(Date.now() / 1000)
  const expiry = parseInt(expiresAt, 10)
  
  if (now >= expiry) {
    // Session expired, clear it
    localStorage.removeItem('adminSessionToken')
    localStorage.removeItem('adminSessionExpiresAt')
    return false
  }
  
  return true
}

// Logout admin (clear session)
export const adminLogout = () => {
  localStorage.removeItem('adminSessionToken')
  localStorage.removeItem('adminSessionExpiresAt')
}

// POST /admin/connect - Connect as admin and get admin token
export const adminConnect = async () => {
  try {
    const userId = getUserId()
    const email = getUserEmail()
    const response = await axios.post(`${API_URL}/api/admin/connect`, {
      userId,
      email
    })
    
    // Store admin token if provided
    if (response.data.adminToken) {
      localStorage.setItem('adminToken', response.data.adminToken)
    }
    
    return response.data
  } catch (error) {
    console.error('Error connecting as admin:', error)
    throw error
  }
}

// GET /admin/dashboard - Get dashboard data
export const getAdminDashboard = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/admin/dashboard`, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error fetching admin dashboard:', error)
    throw error
  }
}

// POST /admin/config - Update admin configuration
export const updateAdminConfig = async (config) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/config`, config, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error updating admin config:', error)
    throw error
  }
}

// POST /admin/set-my-credits - Set current admin's credits to specific amount
export const setMyCredits = async (credits, existingToken = null) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/set-my-credits`, {
      credits,
      existingToken
    }, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error setting credits:', error)
    throw error
  }
}

// POST /admin/set-user-credits/{userId} - Set specific user's credits to exact amount (ADMIN ONLY)
export const setUserCredits = async (userId, credits, existingToken = null) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/set-user-credits/${userId}`, {
      credits,
      existingToken
    }, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error setting user credits:', error)
    throw error
  }
}

// POST /admin/override-token - Create override token for a user
export const createOverrideToken = async (targetUserId, targetEmail, credits, expirySeconds) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/override-token`, {
      targetUserId,
      targetEmail,
      credits,
      expirySeconds
    }, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error creating override token:', error)
    throw error
  }
}

