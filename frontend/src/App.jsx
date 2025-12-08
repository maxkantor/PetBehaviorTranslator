import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Premium from './pages/Premium'
import Support from './pages/Support'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import PaymentSuccess from './pages/PaymentSuccess'
import MockCheckout from './pages/MockCheckout'
import Credits from './pages/Credits'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import './App.css'

function App() {
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
          <Admin />
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

export default App



