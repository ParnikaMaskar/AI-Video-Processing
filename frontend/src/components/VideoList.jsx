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
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No videos uploaded yet. Go to the upload page to start!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {videos.map(v => (
            <Link key={v.id} to={`/videos/${v.id}`} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
                {v.thumbnail_path ? (
                  <img 
                    src={v.thumbnail_path.startsWith('http') ? v.thumbnail_path : (window.location.port === '5173' ? `http://localhost:8000/${v.thumbnail_path}` : `/${v.thumbnail_path}`)} 
                    alt={v.filename}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                    No Preview
                  </div>
                )}
                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                  <span className={`badge badge-${v.status}`}>{v.status}</span>
                </div>
              </div>
              
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.filename}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {new Date(v.created_at).toLocaleDateString()} • {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}