import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initGoogleAnalytics, initMixpanel, loadAnalyticsConfig } from './services/analyticsService'

// Suppress Mixpanel initialization errors globally
const originalError = window.console.error
const originalWarn = window.console.warn

// Override console.error to filter Mixpanel errors
window.console.error = function(...args) {
  const message = args[0]?.toString() || ''
  const fullMessage = args.map(arg => String(arg)).join(' ')
  
  // Suppress Mixpanel "not initialized" errors
  if (fullMessage.toLowerCase().includes('mixpanel') && 
      (fullMessage.toLowerCase().includes('not initialized') || 
       fullMessage.toLowerCase().includes('object not initialized'))) {
    return // Silently ignore
  }
  originalError.apply(console, args)
}

// Also override console.warn for Mixpanel warnings
window.console.warn = function(...args) {
  const fullMessage = args.map(arg => String(arg)).join(' ')
  
  // Suppress Mixpanel warnings
  if (fullMessage.toLowerCase().includes('mixpanel') && 
      fullMessage.toLowerCase().includes('not initialized')) {
    return // Silently ignore
  }
  originalWarn.apply(console, args)
}

// Add global error event listener to catch uncaught errors
window.addEventListener('error', (event) => {
  const message = event.message || ''
  if (message.toLowerCase().includes('mixpanel') && 
      message.toLowerCase().includes('not initialized')) {
    event.preventDefault()
    event.stopPropagation()
    return false
  }
}, true)

// Load analytics config from backend, then initialize
loadAnalyticsConfig().then(() => {
  initGoogleAnalytics()
  initMixpanel()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)



