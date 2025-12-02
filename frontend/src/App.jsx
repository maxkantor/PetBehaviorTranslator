import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Premium from './pages/Premium'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/premium" element={<Premium />} />
    </Routes>
  )
}

export default App



