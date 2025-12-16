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
  
  // Include session token in headers if available
  const sessionToken = localStorage.getItem('adminSessionToken')
  const config = { params }
  
  if (sessionToken) {
    config.headers = {
      'Authorization': `Bearer ${sessionToken}`,
      'X-Admin-Session-Token': sessionToken
    }
  }
  
  return config
}

// Check if current user is admin
export const checkAdmin = async () => {
  try {
    const userId = getUserId()
    const sessionToken = localStorage.getItem('adminSessionToken')
    const expiresAt = localStorage.getItem('adminSessionExpiresAt')
    
    // Check if session is expired locally first
    if (sessionToken && expiresAt) {
      const now = Math.floor(Date.now() / 1000)
      const expiry = parseInt(expiresAt, 10)
      if (now >= expiry) {
        console.log('Admin session expired locally, clearing token')
        localStorage.removeItem('adminSessionToken')
        localStorage.removeItem('adminSessionExpiresAt')
        // Continue to check anyway - backend will handle it
      }
    }
    
    console.log('Checking admin status for user:', userId, 'has session token:', !!sessionToken, 'expires at:', expiresAt)
    
    // Build request with session token in headers
    const config = {
      params: { userId }, // Send userId in params
      headers: {}
    }
    
    // Include session token if available
    if (sessionToken) {
      config.headers['Authorization'] = `Bearer ${sessionToken}`
      config.headers['X-Admin-Session-Token'] = sessionToken
    }
    
    const response = await axios.get(`${API_URL}/api/admin/check`, config)
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
    const response = await axios.post(`${API_URL}/api/admin/grant-credits/${userId}`, {
      credits,
      existingToken
    }, getAdminParams())
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
    // Check if we already have a valid session token
    const hasValidSession = checkAdminSession()
    if (hasValidSession) {
      console.log('Already have valid admin session, skipping adminConnect')
      return { success: true, message: 'Already connected via session token' }
    }
    
    const email = getUserEmail()
    if (!email) {
      // If no email but we have session token, that's okay - session token is enough
      const sessionToken = localStorage.getItem('adminSessionToken')
      if (sessionToken) {
        console.log('No email but have session token - session token is sufficient')
        return { success: true, message: 'Using existing session token' }
      }
      throw new Error('Email is required for admin access. Please set your email first.')
    }
    
    // For admin, we don't need the regular userId - backend will generate consistent one from email
    const response = await axios.post(`${API_URL}/api/admin/connect`, {
      userId: null, // Not required for admin
      email: email
    })
    
    // Store admin token if provided
    if (response.data.adminToken) {
      localStorage.setItem('adminToken', response.data.adminToken)
    }
    
    // Store the consistent admin user ID returned from backend
    if (response.data.adminUserId) {
      localStorage.setItem('petBehaviorUserId', response.data.adminUserId)
      localStorage.setItem('adminUserId', response.data.adminUserId)
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

// GET /api/support/tickets - Get all support tickets (admin only)
export const getAllSupportTickets = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/support/tickets`, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    throw error
  }
}

// POST /api/support/reply - Reply to a support ticket (admin only)
export const replyToSupportTicket = async (ticketId, replyMessage) => {
  try {
    const response = await axios.post(`${API_URL}/api/support/reply`, {
      ticketId,
      replyMessage
    }, getAdminParams())
    return response.data
  } catch (error) {
    console.error('Error replying to support ticket:', error)
    throw error
  }
}

