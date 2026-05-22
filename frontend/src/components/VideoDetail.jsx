import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getVideo, deleteVideo } from '../../api/api.js'

export default function VideoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Transcript states
  const [segments, setSegments] = useState([])
  const [isPlaintext, setIsPlaintext] = useState(false)
  
  // Video player states
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

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
        
        // Parse transcript if present
        if (response.data.transcript) {
          try {
            const parsed = JSON.parse(response.data.transcript)
            if (Array.isArray(parsed)) {
              setSegments(parsed)
              setIsPlaintext(false)
            } else {
              setIsPlaintext(true)
            }
          } catch(e) {
            setIsPlaintext(true)
          }
        }

        // Poll every 3 seconds only if video is still processing
        if (response.data.status === 'uploaded' || response.data.status === 'processing') {
          if (!intervalId) {
            intervalId = setInterval(async () => {
              try {
                const pollRes = await getVideo(id)
                if (isMounted) {
                  setVideo(pollRes.data)
                  if (pollRes.data.transcript) {
                    try {
                      const parsed = JSON.parse(pollRes.data.transcript)
                      if (Array.isArray(parsed)) {
                        setSegments(parsed)
                        setIsPlaintext(false)
                      } else {
                        setIsPlaintext(true)
                      }
                    } catch(e) {
                      setIsPlaintext(true)
                    }
                  }
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

  // Custom Video Player Controls
  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const skip = (seconds) => {
    videoRef.current.currentTime += seconds
  }

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00"
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0')
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading video details...</div>
  if (!video) return <div style={{ textAlign: 'center', padding: '3rem' }}>Video not found.</div>

  return (
    <div>
      <Link to="/videos" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
        ← Back to Library
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }}>
        <div>
          {/* Custom Video Player */}
          <div className="card" style={{ padding: '0.5rem', background: '#ffffff', marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', position: 'relative' }}>
              <video 
                ref={videoRef}
                src={video.filepath.startsWith('http') ? video.filepath : (window.location.port === '5173' ? `http://localhost:8000/${video.filepath}` : `/${video.filepath}`)} 
                style={{ width: '100%', display: 'block', maxHeight: '500px' }}
                onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
                onLoadedMetadata={() => setDuration(videoRef.current.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
              />
            </div>
            
            {/* Custom Controls Bar */}
            <div style={{ padding: '1rem 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Scrubber */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{formatTime(currentTime)}</span>
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  value={currentTime} 
                  onChange={(e) => {
                    const t = parseFloat(e.target.value)
                    videoRef.current.currentTime = t
                    setCurrentTime(t)
                  }}
                  style={{ flex: 1, cursor: 'pointer', height: '6px', accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{formatTime(duration)}</span>
              </div>
              
              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={() => skip(-10)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
                </button>
                <button onClick={togglePlay} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}>
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  )}
                </button>
                <button onClick={() => skip(10)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
                </button>
              </div>
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
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', maxHeight: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>AI Transcript</h3>
            </div>
            
            {/* Scrollable Transcript Box */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', scrollBehavior: 'smooth' }}>
              {video.status === 'processing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ marginBottom: '1rem', width: '24px', height: '24px', borderWidth: '3px' }}></div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Transcription in progress...</p>
                </div>
              ) : video.transcript ? (
                <div style={{ fontSize: '0.9375rem', lineHeight: '1.8', color: '#334155', fontFamily: 'Inter, sans-serif' }}>
                  {isPlaintext ? (
                    <p>{video.transcript}</p>
                  ) : (
                    <p>
                      {segments.map((seg, i) => {
                        const isActive = currentTime >= seg.start && currentTime <= seg.end;
                        return (
                          <span 
                            key={i} 
                            onClick={() => {
                              videoRef.current.currentTime = seg.start;
                              setCurrentTime(seg.start);
                              if (!isPlaying) togglePlay();
                            }}
                            style={{
                              backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                              color: isActive ? 'white' : 'inherit',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              margin: '0 2px',
                              transition: 'all 0.2s',
                              cursor: 'pointer',
                              display: 'inline-block'
                            }}
                          >
                            {seg.text.trim()}
                          </span>
                        )
                      })}
                    </p>
                  )}
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
      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9; 
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          margin-top: -4px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 6px;
          cursor: pointer;
          background: #e2e8f0;
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}
