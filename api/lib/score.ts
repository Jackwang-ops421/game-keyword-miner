// Score calculation for serverless functions
import { sql } from '../lib/db'

interface ScoreInput {
  publishedAt?: string
  discoveredAt?: string
  youtubeVideos7d?: number
  topYoutubeViews?: number
  hasInfluencerVideo?: boolean
  redditPosts7d?: number
  topRedditUpvotes?: number
  tiktokSignal?: boolean
  discordSignal?: boolean
  platformReviews7d?: number
  trend7d?: 'rising' | 'steady' | 'declining' | 'no_data'
  trend30d?: 'rising' | 'steady' | 'declining' | 'no_data'
  competition?: 'low' | 'medium' | 'high' | 'very_high'
  canEmbed?: boolean
  playableInBrowser?: boolean
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

export function calculateScore(input: ScoreInput): ScoreResult {
  // Freshness score (max 25)
  let freshnessScore = 0
  const now = new Date()
  const pubDate = input.publishedAt ? new Date(input.publishedAt) : null
  const discDate = input.discoveredAt ? new Date(input.discoveredAt) : new Date()

  if (pubDate) {
    const diffDays = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) freshnessScore = 25
    else if (diffDays <= 7) freshnessScore = 25
    else if (diffDays <= 30) freshnessScore = 12
    else freshnessScore = 3
  } else {
    const diffDays = Math.floor((now.getTime() - discDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) freshnessScore = 20
    else if (diffDays <= 7) freshnessScore = 18
    else freshnessScore = 10
  }

  // Social score (max 30)
  let socialScore = 0
  if (input.hasInfluencerVideo && input.topYoutubeViews && input.topYoutubeViews > 1000000) {
    socialScore += 12
  } else if (input.youtubeVideos7d && input.youtubeVideos7d > 0) {
    socialScore += input.topYoutubeViews && input.topYoutubeViews > 10000 ? 8 : 4
  }
  if (input.redditPosts7d && input.redditPosts7d > 0) {
    socialScore += Math.min(8, input.redditPosts7d * 2)
    if (input.topRedditUpvotes && input.topRedditUpvotes > 100) socialScore += 2
  }
  if (input.tiktokSignal) socialScore += 5
  if (input.discordSignal) socialScore += 3
  if (input.platformReviews7d && input.platformReviews7d > 0) {
    socialScore += Math.min(2, input.platformReviews7d)
  }
  socialScore = Math.min(30, socialScore)

  // Trend score (max 20)
  let trendScore = 3
  if (input.trend7d === 'rising') trendScore = 20
  else if (input.trend7d === 'steady') trendScore = 5
  else if (input.trend30d === 'rising') trendScore = 10

  // Competition score (max 15)
  let competitionScore = 7
  switch (input.competition) {
    case 'low': competitionScore = 15; break
    case 'medium': competitionScore = 10; break
    case 'high': competitionScore = 4; break
    case 'very_high': competitionScore = 0; break
  }

  // Launch score (max 10)
  let launchScore = 3
  if (input.canEmbed) launchScore = 10
  else if (input.playableInBrowser) launchScore = 7

  const totalScore = freshnessScore + socialScore + trendScore + competitionScore + launchScore

  let decision: ScoreResult['decision']
  if (totalScore >= 80) decision = 'immediate_launch'
  else if (totalScore >= 65) decision = 'quick_page'
  else if (totalScore >= 50) decision = 'monitor'
  else decision = 'postpone'

  return { freshnessScore, socialScore, trendScore, competitionScore, launchScore, totalScore, decision }
}

// Normalize title
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

// Check if title is valid
export function isValidTitle(title: string): boolean {
  const invalid = [
    'untitled', 'test', 'my game', 'my first game',
    'platformer', 'demo game', 'new game',
    'game jam project', 'school project',
  ]
  const normalized = title.toLowerCase().trim()
  return !invalid.some(inv => normalized.includes(inv))
}

// Get recency level
export function getRecencyLevel(publishedAt?: string, discoveredAt?: string): string {
  const now = new Date()
  const pubDate = publishedAt ? new Date(publishedAt) : null
  const discDate = discoveredAt ? new Date(discoveredAt) : now

  const date = pubDate || discDate
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours <= 24) return '<24h'
  if (diffHours <= 168) return '1-7d'  // 7 days
  if (diffHours <= 720) return '7-30d' // 30 days
  return '>30d'
}