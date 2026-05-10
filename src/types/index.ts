// Candidate 候选词类型
export interface Candidate {
  id: number
  name: string
  originalTitle: string
  normalizedName: string
  sourcePlatform: string
  sourceUrl: string
  thumbnail?: string
  author?: string
  genre?: string
  tags?: string[]
  publishedAt?: string
  firstSeenOnPlatformAt?: string
  updatedAt?: string
  discoveredAt: string
  isPlatformNew7d: boolean
  isFirstDiscoveredByTool: boolean
  timeConfidence: 'high' | 'medium' | 'low'
  recencyLevel: '<24h' | '1-7d' | '7-30d' | '>30d'
  playableInBrowser: boolean
  canEmbed: boolean
  platformRanking?: number
  platformComments?: number
  qualityComments?: number
  status: 'pending' | 'observing' | 'ready' | 'launched' | 'abandoned'
  notes?: string
  socialPropagationPath?: string
  trendLatencyDays?: number
  createdAt: string
  updatedAt: string
}

// SocialMetrics 社媒指标
export interface SocialMetrics {
  id: number
  candidateId: number
  youtubeVideos7d: number
  topYoutubeViews: number
  topYoutubeComments: number
  hasInfluencerVideo: boolean
  redditPosts7d: number
  topRedditUpvotes: number
  topRedditComments: number
  tiktokSignal: boolean
  tiktokTopViews?: number
  discordSignal: boolean
  platformReviews7d: number
  updatedAt: string
}

// TrendMetrics 趋势表
export interface TrendMetrics {
  id: number
  candidateId: number
  trend7d: 'rising' | 'steady' | 'declining' | 'no_data'
  trend30d: 'rising' | 'steady' | 'declining' | 'no_data'
  mainRegion?: string
  notes?: string
  updatedAt: string
}

// SerpMetrics SERP竞争
export interface SerpMetrics {
  id: number
  candidateId: number
  competition: 'low' | 'medium' | 'high' | 'very_high'
  hasOfficialSite: boolean
  hasDedicatedSites: boolean
  dominatedByBigSites: boolean
  notes?: string
  updatedAt: string
}

// Score 评分表
export interface Score {
  id: number
  candidateId: number
  freshnessScore: number
  socialScore: number
  trendScore: number
  competitionScore: number
  launchScore: number
  totalScore: number
  decision: 'immediate_launch' | 'quick_page' | 'monitor' | 'postpone'
  updatedAt: string
}

// Platform 平台配置
export interface Platform {
  id: number
  name: string
  domain: string
  platformType: '首发源' | '验证源' | '社媒' | '其他'
  crawlMethod: 'rss' | 'api' | 'html' | 'playwright' | 'manual'
  feedUrl?: string
  apiUrl?: string
  listUrl?: string
  enabled: boolean
  priority: '必做' | '高优先' | '次优先' | '验证源'
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'failed' | 'partial'
  notes?: string
}

// SyncLog 同步日志
export interface SyncLog {
  id: number
  platform: string
  method: string
  status: 'success' | 'failed' | 'partial'
  itemsFound: number
  itemsAdded: number
  itemsDuplicated: number
  errorMessage?: string
  createdAt: string
}

// 决策标签
export const DECISION_LABELS = {
  immediate_launch: { label: '立即上站', color: 'bg-green-500', textColor: 'text-white' },
  quick_page: { label: '快速做页', color: 'bg-blue-500', textColor: 'text-white' },
  monitor: { label: '加入监测', color: 'bg-yellow-500', textColor: 'text-black' },
  postpone: { label: '暂缓', color: 'bg-gray-500', textColor: 'text-white' },
} as const

// 平台列表
export const PLATFORMS = [
  { name: 'itch.io', domain: 'itch.io', priority: '必做', type: '首发源' },
  { name: 'Cocrea', domain: 'cocrea.world', priority: '高优先', type: '首发源' },
  { name: 'Scratch', domain: 'scratch.mit.edu', priority: '必做', type: '首发源' },
  { name: 'Game Jolt', domain: 'gamejolt.com', priority: '次优先', type: '首发源' },
  { name: 'CrazyGames', domain: 'crazygames.com', priority: '验证源', type: '验证源' },
  { name: 'Poki', domain: 'poki.com', priority: '验证源', type: '验证源' },
] as const