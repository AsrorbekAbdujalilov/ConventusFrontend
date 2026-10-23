import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProfileView } from '../components/ProfileView'
import type { UserProfile } from '../api/types'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, handleLogout } = useAuth()

  const handleProfileUpdated = useCallback(
    (updated: UserProfile) => {
      setUser(updated)
    },
    [setUser]
  )

  const handleBackToHome = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleLogoutClick = useCallback(async () => {
    await handleLogout()
    navigate('/')
  }, [handleLogout, navigate])

  const handleRequireLogin = useCallback(() => {
    navigate('/auth')
  }, [navigate])

  return (
    <ProfileView
      user={user}
      onProfileUpdated={handleProfileUpdated}
      onBackToHome={handleBackToHome}
      onLogout={handleLogoutClick}
      onRequireLogin={handleRequireLogin}
    />
  )
}
