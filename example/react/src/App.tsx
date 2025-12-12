import { Routes, Route, Navigate } from 'react-router-dom'
import TopPage from './pages/TopPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/en/top" replace />} />
      <Route path="/:locale/top" element={<TopPage />} />
    </Routes>
  )
}

export default App
