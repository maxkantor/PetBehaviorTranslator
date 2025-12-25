import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Premium from './pages/Premium'
import Support from './pages/Support'
import AdminCRM from './pages/AdminCRM'
import AdminLogin from './pages/AdminLogin'
import PaymentSuccess from './pages/PaymentSuccess'
import MockCheckout from './pages/MockCheckout'
import Credits from './pages/Credits'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import { trackPageView } from './services/analyticsService'
import './App.css'

function AppContent() {
  const location = useLocation()

  useEffect(() => {
    // Track page views on route change
    const pageName = location.pathname === '/' ? 'Home' : location.pathname.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    trackPageView(pageName, location.pathname)
  }, [location])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/support" element={<Support />} />
      {/* Redirect /login to /admin/login */}
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/login/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <AdminCRM />
        </ProtectedAdminRoute>
      } />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/mock-checkout" element={<MockCheckout />} />
      <Route path="/credits" element={<Credits />} />
      <Route path="/credits/mock-checkout" element={<MockCheckout />} />
      <Route path="/credits/success" element={<PaymentSuccess />} />
    </Routes>
  )
}

function App() {
  return <AppContent />
}

export default App



