import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getPresignedUrl, uploadDirectToS3, confirmUpload } from '../../api/api.js'

export default function Upload() {
  const navigate = useNavigate()
  const [uploads, setUploads] = useState([]) // list of { id, name, progress, status }

  async function uploadFile(file, uploadId) {
    try {
      // Step 1: Request S3 presigned URL
      const presignedRes = await getPresignedUrl(file.name, file.type || 'video/mp4')
      const { url, key } = presignedRes.data

      // Step 2: Upload directly to S3 with progress tracking
      await uploadDirectToS3(url, file, (progressPercent) => {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: progressPercent } : u
        ))
      })

      // Step 3: Confirm upload metadata with backend
      const confirmResponse = await confirmUpload(file.name, key)
      
      if (confirmResponse.data.status === 'error') {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'error' } : u
        ))
      } else {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'done', progress: 100 } : u
        ))
      }
    } catch (err) {
      console.error(err)
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'error' } : u
      ))
    }
  }

  function handleFiles(e) {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length === 0) return

    const newUploads = selectedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      progress: 0,
      status: 'uploading',
      file: file
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Trigger parallel uploads for all files
    newUploads.forEach(upload => {
      uploadFile(upload.file, upload.id)
    })
  }

  const isUploading = uploads.some(u => u.status === 'uploading')
  const completedCount = uploads.filter(u => u.status === 'done').length
  const totalCount = uploads.length

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Upload Videos
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Select one or more video files. Uploads are streamed concurrently directly to Amazon S3.
        </p>

        {/* Dynamic File Input Trigger */}
        <label className="btn btn-primary" style={{ 
          cursor: isUploading ? 'not-allowed' : 'pointer', 
          padding: '1rem 2.25rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: isUploading ? 0.7 : 1,
          transition: 'all 0.25s ease'
        }}>
          <span>Select Videos</span>
          <input 
            type="file" 
            accept="video/*" 
            multiple 
            onChange={handleFiles} 
            disabled={isUploading}
            style={{ display: 'none' }} 
          />
        </label>

        {/* Dashboard Progress Panel */}
        {uploads.length > 0 && (
          <div style={{ marginTop: '3rem', textAlign: 'left' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                {isUploading ? 'Uploading Files...' : 'Uploads Finished'}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {completedCount} of {totalCount} completed
              </span>
            </div>

            {/* Individual Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {uploads.map(u => (
                <div key={u.id} className="upload-row" style={{
                  animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 550, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {u.name}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {u.progress}%
                    </span>
                  </div>

                  <div className="progress-container" style={{ height: '8px' }}>
                    <div className="progress-bar" style={{ 
                      width: `${u.progress}%`,
                      background: u.status === 'error' ? '#ef4444' : 'var(--primary)',
                      transition: 'width 0.2s ease-out'
                    }}></div>
                  </div>

                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.8rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    color: u.status === 'error' ? '#ef4444' : u.status === 'done' ? '#10b981' : 'var(--text-muted)'
                  }}>
                    {u.status === 'uploading' && <span className="spinner"></span>}
                    {u.status === 'uploading' && (u.progress < 100 ? 'Streaming to S3...' : 'Registering video...')}
                    {u.status === 'done' && '✅ Upload complete!'}
                    {u.status === 'error' && '❌ Upload failed. Please retry.'}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Panel once uploads finish */}
            {!isUploading && (
              <div style={{ 
                marginTop: '2.5rem', 
                display: 'flex', 
                justifyContent: 'center',
                animation: 'fadeIn 0.5s ease forwards'
              }}>
                <Link to="/videos" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                  Go to Library →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}