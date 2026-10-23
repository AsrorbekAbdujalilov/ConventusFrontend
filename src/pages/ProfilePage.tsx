import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ProfileView } from '../components/ProfileView'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, handleLogout } = useAuth()

  return (
    <ProfileView
      user={user}
      onProfileUpdated={(updated) => setUser(updated)}
      onBackToHome={() => navigate('/')}
      onLogout={async () => {
        await handleLogout()
        navigate('/')
      }}
      onRequireLogin={() => navigate('/auth')}
    />
  )
}
