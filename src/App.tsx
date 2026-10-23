import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { AuthPage } from './pages/AuthPage'
import { ArenaPage } from './pages/ArenaPage'
import { ArenaLivePage } from './pages/ArenaLivePage'
import { ProfilePage } from './pages/ProfilePage'
import './App.css'

function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, handleLogout } = useAuth()
  const isLiveGame = location.pathname.startsWith('/arena/live')

  return (
    <div className={`app-container ${isLiveGame ? 'game-mode-full' : ''}`}>
      {!isLiveGame && (
        <Navbar
          user={user}
          onLoginClick={() => navigate('/auth')}
          onRegisterClick={() => navigate('/auth')}
          onLogout={async () => {
            await handleLogout()
            navigate('/')
          }}
          onProfileClick={() => navigate('/profile')}
        />
      )}

      <main className={isLiveGame ? 'game-main-full' : 'main-content'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/authentication" element={<AuthPage />} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/arena/live/:code" element={<ArenaLivePage />} />
          <Route path="/arena/live" element={<ArenaLivePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          {/* Fallback: redirect unknown routes to home */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {!isLiveGame && <Footer />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
