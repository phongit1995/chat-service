import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Login } from './pages/login'
import { Register } from './pages/register'
import { Chat } from './pages/chat'
import { ProtectedRoute } from './components/ProtectedRoute'
import { IncomingCallModal, CallScreen } from '@chat/ui'
import { env } from '@chat/shared'
import { TitleBar } from './components/TitleBar'

function App() {
  useEffect(() => {
    document.title = 'Chat'
    if (env.isDevelopment) {
      console.log('API:', env.apiBaseUrl, 'WS:', env.wsUrl)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <TitleBar />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '12px',
            padding: '16px',
          },
        }}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
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
      </div>
      <IncomingCallModal />
      <CallScreen />
    </div>
  )
}

export default App
