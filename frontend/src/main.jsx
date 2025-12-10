import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initGoogleAnalytics, initMixpanel, loadAnalyticsConfig } from './services/analyticsService'

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



