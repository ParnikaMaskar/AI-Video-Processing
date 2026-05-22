import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Upload from './components/Upload'
import VideoList from './components/VideoList'
import VideoDetail from './components/VideoDetail'

export default function App() {
  return (
    <BrowserRouter>
      <header className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>V</div>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>AI Video Platform</h1>
          </div>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/" className="nav-link">Upload</Link>
            <Link to="/videos" className="nav-link">My Videos</Link>
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