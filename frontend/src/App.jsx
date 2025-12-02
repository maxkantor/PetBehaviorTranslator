import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Premium from './pages/Premium'
import Support from './pages/Support'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/support" element={<Support />} />
    </Routes>
  )
}

export default App



