import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Upload from './components/Upload'
import VideoList from './components/VideoList'
import VideoDetail from './components/VideoDetail'

export default function App() {
  return (
    <BrowserRouter>
      <header className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: 800,
              fontSize: '1.125rem',
              boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)'
            }}>
              V
            </div>
            <h1 style={{ fontSize: '1.35rem', margin: 0, letterSpacing: '-0.03em', color: '#0f172a' }}>
              AI Video Platform
            </h1>
          </Link>
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/" className="nav-link">Upload</Link>
            <Link to="/videos" className="nav-link">Library</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: '2.5rem 0' }}>
        <Routes>
          <Route path="/"            element={<Upload />} />
          <Route path="/videos"      element={<VideoList />} />
          <Route path="/videos/:id"  element={<VideoDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}