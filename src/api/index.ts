// API 客户端 - 调用 Vercel Serverless Functions
import axios from 'axios'
import type { Candidate, SocialMetrics, TrendMetrics, SerpMetrics, Score, Platform, SyncLog } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// Candidates
export const getCandidates = async (params?: {
  status?: string
  platform?: string
  minScore?: number
  limit?: number
}) => {
  const { data } = await api.get('/candidates', { params })
  return data as Candidate[]
}

export const getCandidate = async (id: number) => {
  const { data } = await api.get(`/candidates/${id}`)
  return data as Candidate
}

export const createCandidate = async (candidate: Partial<Candidate>) => {
  const { data } = await api.post('/candidates', candidate)
  return data as Candidate
}

export const updateCandidate = async (id: number, updates: Partial<Candidate>) => {
  const { data } = await api.put(`/candidates/${id}`, updates)
  return data as Candidate
}

export const deleteCandidate = async (id: number) => {
  await api.delete(`/candidates/${id}`)
}

export const recalculateScore = async (id: number) => {
  const { data } = await api.post(`/candidates/${id}/recalculate`)
  return data as Score
}

// Import
export const importCandidates = async (candidates: Partial<Candidate>[]) => {
  const { data } = await api.post('/candidates/import', { candidates })
  return data as { imported: number; duplicated: number }
}

// Sync
export const syncPlatform = async (platform: string) => {
  const { data } = await api.post('/sync', { platform })
  return data as { log: SyncLog; candidates: Candidate[] }
}

export const getSyncLogs = async (limit = 50) => {
  const { data } = await api.get('/sync/logs', { params: { limit } })
  return data as SyncLog[]
}

// Platforms
export const getPlatforms = async () => {
  const { data } = await api.get('/platforms')
  return data as Platform[]
}

export const updatePlatform = async (id: number, updates: Partial<Platform>) => {
  const { data } = await api.put(`/platforms/${id}`, updates)
  return data as Platform
}

// Export
export const exportCSV = async () => {
  const { data } = await api.get('/export/candidates.csv', { responseType: 'blob' })
  return data as Blob
}

export const exportMarkdown = async () => {
  const { data } = await api.get('/export/daily-report.md')
  return data as string
}

// Score calculation
export const calculateScore = async (candidateId: number, metrics: {
  social?: Partial<SocialMetrics>
  trend?: Partial<TrendMetrics>
  serp?: Partial<SerpMetrics>
  playableInBrowser?: boolean
  canEmbed?: boolean
}) => {
  const { data } = await api.post(`/candidates/${candidateId}/calculate`, metrics)
  return data as Score
}

export default api