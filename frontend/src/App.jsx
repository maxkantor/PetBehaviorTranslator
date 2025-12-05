import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Premium from './pages/Premium'
import Support from './pages/Support'
import Admin from './pages/Admin'
import PaymentSuccess from './pages/PaymentSuccess'
import MockCheckout from './pages/MockCheckout'
import Credits from './pages/Credits'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/support" element={<Support />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/mock-checkout" element={<MockCheckout />} />
      <Route path="/credits" element={<Credits />} />
      <Route path="/credits/mock-checkout" element={<MockCheckout />} />
      <Route path="/credits/success" element={<PaymentSuccess />} />
    </Routes>
  )
}

export default App



