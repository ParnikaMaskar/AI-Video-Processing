import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getVideo, deleteVideo } from '../../api/api.js'

export default function VideoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this video? This will permanently remove the video, local files, and its S3 cloud object.")) return
    
    try {
      await deleteVideo(video.id)
      navigate('/videos')
    } catch (err) {
      console.error("Failed to delete video:", err)
      alert("Failed to delete video.")
    }
  }

  useEffect(() => {
    let isMounted = true
    let intervalId = null

    async function loadData() {
      try {
        const response = await getVideo(id)
        if (!isMounted) return
        
        setVideo(response.data)
        setLoading(false)

        // Poll every 3 seconds only if video is still processing
        if (response.data.status === 'uploaded' || response.data.status === 'processing') {
          if (!intervalId) {
            intervalId = setInterval(async () => {
              try {
                const pollRes = await getVideo(id)
                if (isMounted) {
                  setVideo(pollRes.data)
                  if (pollRes.data.status === 'done' || pollRes.data.status === 'error') {
                    clearInterval(intervalId)
                  }
                }
              } catch (err) {
                console.error("Polling error:", err)
              }
            }, 3000)
          }
        }
      } catch (err) {
        console.error(err)
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading video details...</div>
  if (!video) return <div style={{ textAlign: 'center', padding: '3rem' }}>Video not found.</div>

  return (
    <div>
      <Link to="/videos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
        ← Back to Library
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#000', marginBottom: '1.5rem' }}>
            <video 
              src={video.filepath.startsWith('http') ? video.filepath : (window.location.port === '5173' ? `http://localhost:8000/${video.filepath}` : `/${video.filepath}`)} 
              controls 
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{video.filename}</h1>
            <button 
              onClick={handleDelete}
              style={{ 
                background: '#ef4444', 
                color: '#fff', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '0.375rem', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.opacity = 0.9}
              onMouseOut={e => e.currentTarget.style.opacity = 1}
            >
              🗑️ Delete Video
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
            <span className={`badge badge-${video.status}`}>{video.status}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Uploaded on {new Date(video.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>AI Transcript</h3>
            {video.status === 'processing' ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Transcription is in progress. Please wait...
              </p>
            ) : video.transcript ? (
              <div style={{ 
                fontSize: '0.9375rem', 
                lineHeight: '1.6', 
                color: '#334155',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {video.transcript}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No transcript available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
