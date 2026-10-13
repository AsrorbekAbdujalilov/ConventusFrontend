import { ApiDashboard } from './components/ApiDashboard'
import './App.css'

function App() {
  return (
    <>
      <header style={{ padding: '32px 20px 10px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '38px', color: 'var(--text-h)' }}>
          Conventus
        </h1>
        <p style={{ color: 'var(--text)', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
          Full-Stack API Connection Dashboard (React Frontend ⟷ Django REST Backend)
        </p>
      </header>

      <main style={{ flex: 1, padding: '0 16px 40px' }}>
        <ApiDashboard />
      </main>

      <div className="ticks"></div>
      <footer style={{ padding: '24px 20px', fontSize: '13px', color: 'var(--text)', textAlign: 'center' }}>
        Conventus Full-Stack Application • Django REST Framework SimpleJWT & React Vite
      </footer>
    </>
  )
}

export default App

