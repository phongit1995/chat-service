import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Chat } from './pages/Chat'
import { ProtectedRoute } from './components/ProtectedRoute'
import env from './config/env'

function App() {
  useEffect(() => {
    document.title = env.appName

    if (env.isDevelopment) {
      console.log('=== Environment Configuration ===')
      console.log('API Base URL:', env.apiBaseUrl)
      console.log('WebSocket URL:', env.wsUrl)
      console.log('App Name:', env.appName)
      console.log('Mode:', env.isDevelopment ? 'Development' : 'Production')
      console.log('================================')
    }
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
