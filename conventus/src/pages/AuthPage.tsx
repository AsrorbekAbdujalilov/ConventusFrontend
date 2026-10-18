import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthView } from '../components/AuthView'

export function AuthPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()

  return (
    <AuthView
      initialMode="login"
      onSuccess={(newUser) => {
        setUser(newUser)
        navigate('/')
      }}
      onSwitchToHome={() => navigate('/')}
    />
  )
}
