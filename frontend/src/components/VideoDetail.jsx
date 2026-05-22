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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>
        <div>
          <div className="card" style={{ padding: '0.5rem', overflow: 'hidden', background: '#ffffff', marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
              <video 
                src={video.filepath.startsWith('http') ? video.filepath : (window.location.port === '5173' ? `http://localhost:8000/${video.filepath}` : `/${video.filepath}`)} 
                controls 
                style={{ width: '100%', display: 'block', maxHeight: '500px' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className={`badge badge-${video.status}`}>{video.status}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                  Uploaded {new Date(video.created_at).toLocaleString()}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.2 }}>{video.filename}</h1>
            </div>
            <button 
              onClick={handleDelete}
              style={{ 
                background: '#fff', 
                color: '#ef4444', 
                border: '1px solid #fee2e2', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '0.5rem', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fee2e2'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              Delete Video
            </button>
          </div>
        </div>

        <div>
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>AI Transcript</h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
              {video.status === 'processing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ marginBottom: '1rem', width: '24px', height: '24px', borderWidth: '3px' }}></div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Transcription in progress...</p>
                </div>
              ) : video.transcript ? (
                <div style={{ 
                  fontSize: '0.9375rem', 
                  lineHeight: '1.7', 
                  color: '#334155',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {video.transcript}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem', opacity: 0.5 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  <p style={{ fontSize: '0.9375rem' }}>No transcript available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
