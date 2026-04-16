import axios, { type AxiosProgressEvent } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || `https://octave-appearls-report-analyzer.onrender.com`
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
  reportDate: string,
  onUploadProgress: (progressEvent: AxiosProgressEvent) => void
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('reportDate', reportDate)

  const response = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  })

  return response.data
}

export const ingestInventoryData = async (data: any[], reportDate: string) => {
  const response = await api.post('/api/inventory/ingest', { data, reportDate })
  return response.data
}

export const fetchInventoryDashboard = async (filters = {}) => {
  const response = await api.get('/api/inventory/dashboard', { params: filters })
  return response.data
}

export const fetchTreemapData = async () => {
  const response = await api.get('/api/treemap')
  return response.data
}

export const fetchSKUList = async () => {
  const response = await api.get('/api/inventory/skus')
  return response.data
}

export const fetchSKUDetail = async (articleNo: string) => {
  const response = await api.get(`/api/inventory/sku/${encodeURIComponent(articleNo)}`)
  return response.data
}

export const fetchTransferSuggestions = async () => {
  const response = await api.get('/api/inventory/transfers')
  return response.data
}

