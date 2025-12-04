import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Premium from './pages/Premium'
import Support from './pages/Support'
import Admin from './pages/Admin'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/support" element={<Support />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default App



