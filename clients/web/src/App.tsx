import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Login } from './pages/login'
import { Register } from './pages/register'
import { Chat } from './pages/chat'
import { ProtectedRoute } from './components/ProtectedRoute'
import { IncomingCallModal, CallScreen, ErrorBoundary } from '@chat/ui'
import { env } from '@chat/shared'

function App() {
  useEffect(() => {
    document.title = 'Chat App'

    if (env.isDevelopment) {
      console.log('=== Environment Configuration ===')
      console.log('API Base URL:', env.apiBaseUrl)
      console.log('WebSocket URL:', env.wsUrl)
      console.log('Mode:', env.isDevelopment ? 'Development' : 'Production')
      console.log('================================')
    }
  }, [])

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <ErrorBoundary scope="app">
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ErrorBoundary scope="chat-page">
                    <Chat />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        <IncomingCallModal />
        <CallScreen />
      </ErrorBoundary>
    </>
  )
}

export default App
