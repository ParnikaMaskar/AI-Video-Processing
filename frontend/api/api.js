import axios from 'axios'

// Determine the baseURL from environment variables.
// Vite exposes env vars prefixed with VITE_ via import.meta.env
const baseURL = import.meta.env.VITE_API_URL

const api = axios.create({ baseURL })

export const getPresignedUrl = (filename, contentType) => {
  return api.post('/videos/presigned-url', { filename, content_type: contentType })
}

export const uploadDirectToS3 = (url, file, onProgress) => {
  return axios.put(url, file, {
    headers: {
      'Content-Type': file.type || 'video/mp4'
    },
    onUploadProgress: e => onProgress(Math.round(e.loaded * 100 / e.total))
  })
}

export const confirmUpload = (filename, s3Key) => {
  return api.post('/videos/confirm', { filename, s3_key: s3Key })
}

export const listVideos  = () => api.get('/videos')
export const getVideo    = id => api.get(`/videos/${id}`)
export const deleteVideo = id => api.delete(`/videos/${id}`)