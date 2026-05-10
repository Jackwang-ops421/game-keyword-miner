// 评分计算逻辑（前端备用）
import type { SocialMetrics, TrendMetrics, SerpMetrics } from '@/types'

interface ScoreInput {
  publishedAt?: string
  discoveredAt?: string
  social?: Partial<SocialMetrics>
  trend?: Partial<TrendMetrics>
  serp?: Partial<SerpMetrics>
  playableInBrowser?: boolean
  canEmbed?: boolean
}

interface ScoreResult {
  freshnessScore: number
  socialScore: number
  trendScore: number
  competitionScore: number
  launchScore: number
  totalScore: number
  decision: 'immediate_launch' | 'quick_page' | 'monitor' | 'postpone'
}

// 计算新鲜度分数
function calculateFreshness(publishedAt?: string, discoveredAt?: string): { score: number; confidence: 'high' | 'medium' | 'low' } {
  const now = new Date()
  const pubDate = publishedAt ? new Date(publishedAt) : null
  const discDate = discoveredAt ? new Date(discoveredAt) : new Date()

  if (pubDate) {
    const diffDays = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) return { score: 25, confidence: 'high' }
    if (diffDays <= 7) return { score: 25, confidence: 'high' }
    if (diffDays <= 30) return { score: 12, confidence: 'medium' }
    return { score: 3, confidence: 'low' }
  }

  // 无平台时间，用发现时间
  const diffDays = Math.floor((now.getTime() - discDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 1) return { score: 20, confidence: 'low' }
  if (diffDays <= 7) return { score: 18, confidence: 'low' }
  return { score: 10, confidence: 'low' }
}

// 计算社媒热度分数
function calculateSocialScore(social?: Partial<SocialMetrics>): number {
  if (!social) return 0

  let score = 0

  // YouTube
  if (social.hasInfluencerVideo && social.topYoutubeViews && social.topYoutubeViews > 1000000) {
    score += 12
  } else if (social.youtubeVideos7d && social.youtubeVideos7d > 0) {
    if (social.topYoutubeViews && social.topYoutubeViews > 10000) {
      score += 8
    } else {
      score += 4
    }
  }

  // Reddit
  if (social.redditPosts7d && social.redditPosts7d > 0) {
    score += Math.min(8, social.redditPosts7d * 2)
    if (social.topRedditUpvotes && social.topRedditUpvotes > 100) {
      score += 2
    }
  }

  // TikTok
  if (social.tiktokSignal) {
    score += 5
  }

  // Discord
  if (social.discordSignal) {
    score += 3
  }

  // 平台评论
  if (social.platformReviews7d && social.platformReviews7d > 0) {
    score += Math.min(2, social.platformReviews7d)
  }

  return Math.min(30, score)
}

// 计算趋势分数
function calculateTrendScore(trend?: Partial<TrendMetrics>): number {
  if (!trend) return 3

  if (trend.trend7d === 'rising') return 20
  if (trend.trend7d === 'steady') return 5
  if (trend.trend30d === 'rising') return 10
  if (trend.trend7d === 'no_data' || trend.trend30d === 'no_data') return 3

  return 5
}

// 计算SERP竞争分数
function calculateCompetitionScore(serp?: Partial<SerpMetrics>): number {
  if (!serp) return 7

  switch (serp.competition) {
    case 'low': return 15
    case 'medium': return 10
    case 'high': return 4
    case 'very_high': return 0
    default: return 7
  }
}

// 计算可上站分数
function calculateLaunchScore(playableInBrowser?: boolean, canEmbed?: boolean): number {
  if (canEmbed) return 10
  if (playableInBrowser) return 7
  return 3
}

// 主评分函数
export function calculateKeywordScore(input: ScoreInput): ScoreResult {
  const freshness = calculateFreshness(input.publishedAt, input.discoveredAt)
  const socialScore = calculateSocialScore(input.social)
  const trendScore = calculateTrendScore(input.trend)
  const competitionScore = calculateCompetitionScore(input.serp)
  const launchScore = calculateLaunchScore(input.playableInBrowser, input.canEmbed)

  const totalScore = freshness.score + socialScore + trendScore + competitionScore + launchScore

  let decision: ScoreResult['decision']
  if (totalScore >= 80) {
    decision = 'immediate_launch'
  } else if (totalScore >= 65) {
    decision = 'quick_page'
  } else if (totalScore >= 50) {
    decision = 'monitor'
  } else {
    decision = 'postpone'
  }

  return {
    freshnessScore: freshness.score,
    socialScore,
    trendScore,
    competitionScore,
    launchScore,
    totalScore,
    decision,
  }
}

// 获取决策标签
export function getDecisionLabel(decision: ScoreResult['decision']) {
  const labels = {
    immediate_launch: { label: '立即上站', color: 'bg-green-500', textColor: 'text-white' },
    quick_page: { label: '快速做页', color: 'bg-blue-500', textColor: 'text-white' },
    monitor: { label: '加入监测', color: 'bg-yellow-500', textColor: 'text-black' },
    postpone: { label: '暂缓', color: 'bg-gray-500', textColor: 'text-white' },
  }
  return labels[decision]
}

// 生成核查链接
export function generateCheckLinks(gameName: string) {
  const encoded = encodeURIComponent(gameName)
  return {
    youtube: `https://www.youtube.com/results?search_query=${encoded}`,
    reddit: `https://www.reddit.com/search/?q=${encoded}`,
    tiktok: `https://www.google.com/search?q=site%3Atiktok.com+%22${encoded}%22`,
    discord: `https://www.google.com/search?q=site%3Adiscord.com+%22${encoded}%22`,
    trends: `https://trends.google.com/trends/explore?date=now%207-d&q=${encoded}`,
    google: `https://www.google.com/search?q=Play+${encoded}+Online`,
    poki: `https://www.google.com/search?q=site%3Apoki.com+%22${encoded}%22`,
    crazygames: `https://www.google.com/search?q=site%3Acrazygames.com+%22${encoded}%22`,
    cocrea: `https://www.google.com/search?q=site%3Acocrea.world+%22${encoded}%22`,
    itch: `https://www.google.com/search?q=site%3Aitch.io+%22${encoded}%22`,
  }
}

// 标题标准化
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/v\d+\.\d+/gi, '')
    .replace(/demo/gi, '')
    .replace(/prototype/gi, '')
    .replace(/alpha/gi, '')
    .replace(/beta/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim()
}

// 判断是否有效标题
export function isValidTitle(title: string): boolean {
  const invalid = [
    'untitled', 'test', 'my game', 'my first game',
    'platformer', 'demo game', 'new game',
    'game jam project', 'school project',
  ]
  const normalized = title.toLowerCase().trim()
  return !invalid.some(inv => normalized.includes(inv))
}