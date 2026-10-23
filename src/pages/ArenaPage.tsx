import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArenaView } from '../components/ArenaView'

export function ArenaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const tabParam = searchParams.get('tab')
  const editParam = searchParams.get('edit') || undefined
  const initialTab =
    tabParam === 'create' || editParam ? 'create'
    : tabParam === 'decks' || tabParam === 'library' ? 'decks'
    : tabParam === 'host' ? 'host'
    : tabParam === 'join' ? 'join'
    : 'create'

  return (
    <ArenaView
      user={user}
      initialTab={initialTab as 'join' | 'host' | 'decks' | 'create'}
      initialEditQuizId={editParam}
      onRequireLogin={() => navigate('/auth')}
      onBackToHome={() => navigate('/')}
    />
  )
}
