import axios, { type AxiosProgressEvent } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || `http://localhost:3000`
})

// Auto-switch to 3001 if 3000 fails (for local dev resilience)
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.code === 'ERR_NETWORK' && api.defaults.baseURL?.includes(':3000')) {
      console.warn('Port 3000 blocked, trying Port 3001...')
      api.defaults.baseURL = api.defaults.baseURL.replace(':3000', ':3001')
      return api.request(error.config)
    }
    return Promise.reject(error)
  }
)

export const uploadInventoryFile = async (
  file: File,
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void
) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  })

  return response.data
}

export const fetchTreemapData = async () => {
  const response = await api.get('/api/treemap')
  return response.data
}
