import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArenaView } from '../components/ArenaView'

export function ArenaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const initialTab =
    tabParam === 'create' ? 'create'
    : tabParam === 'decks' || tabParam === 'library' ? 'decks'
    : tabParam === 'host' ? 'host'
    : 'join'

  return (
    <ArenaView
      user={user}
      initialTab={initialTab as 'join' | 'host' | 'decks' | 'create'}
      onRequireLogin={() => navigate('/auth')}
      onBackToHome={() => navigate('/')}
    />
  )
}
