import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listVideos } from '../../api/api.js'

export default function VideoList() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchVideos = () => {
    listVideos().then(r => {
      setVideos(r.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchVideos()
    const interval = setInterval(fetchVideos, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading && videos.length === 0) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading videos...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Your Library</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{videos.length} videos found</span>
      </div>

      {videos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '3rem', opacity: 0.2 }}>📁</div>
          <h3 style={{ fontSize: '1.25rem', color: '#0f172a' }}>No videos yet</h3>
          <p>Get started by uploading your first video.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Upload Video</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {videos.map(v => (
            <Link key={v.id} to={`/videos/${v.id}`} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ position: 'relative', paddingTop: '56.25%', background: '#f1f5f9', borderBottom: '1px solid var(--border)' }}>
                {v.thumbnail_path ? (
                  <img 
                    src={v.thumbnail_path.startsWith('http') ? v.thumbnail_path : (window.location.port === '5173' ? `http://localhost:8000/${v.thumbnail_path}` : `/${v.thumbnail_path}`)} 
                    alt={v.filename}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500 }}>
                    {v.status === 'processing' ? 'Generating preview...' : 'No Preview'}
                  </div>
                )}
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <span className={`badge badge-${v.status}`}>{v.status}</span>
                </div>
              </div>
              
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
                  {v.filename}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: v.status === 'done' ? '#10b981' : (v.status === 'error' ? '#ef4444' : '#f59e0b') }}></span>
                  {new Date(v.created_at).toLocaleDateString()} at {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}