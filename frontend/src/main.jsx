import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initGoogleAnalytics, initMixpanel, loadAnalyticsConfig } from './services/analyticsService'

// Suppress Mixpanel initialization errors globally
const originalError = window.console.error
window.console.error = function(...args) {
  const message = args[0]?.toString() || ''
  // Suppress Mixpanel "not initialized" errors
  if (message.includes('mixpanel') && (message.includes('not initialized') || message.includes('object not initialized'))) {
    return // Silently ignore
  }
  originalError.apply(console, args)
}

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



