import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Get all users (admin endpoint)
export const getAllUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/admin/users`)
    return response.data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

// Set premium status for a user (admin endpoint)
export const setPremiumStatus = async (userId) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/set-premium/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error setting premium status:', error)
    throw error
  }
}

// Remove premium status from a user (admin endpoint)
export const removePremiumStatus = async (userId) => {
  try {
    const response = await axios.post(`${API_URL}/api/admin/remove-premium/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error removing premium status:', error)
    throw error
  }
}

