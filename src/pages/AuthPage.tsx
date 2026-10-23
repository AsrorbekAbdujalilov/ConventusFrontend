import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthView } from '../components/AuthView'
import type { UserProfile } from '../api/types'

export function AuthPage() {
  const navigate = useNavigate()
  const { setUser, syncPalettes } = useAuth()

  const handleSuccess = useCallback(
    async (newUser: UserProfile) => {
      setUser(newUser)
      // Sync custom themes from DB and apply this user's active palette
      await syncPalettes(newUser.active_palette_id)
      navigate('/')
    },
    [setUser, syncPalettes, navigate]
  )

  return (
    <AuthView
      initialMode="login"
      onSuccess={handleSuccess}
      onSwitchToHome={() => navigate('/')}
    />
  )
}
