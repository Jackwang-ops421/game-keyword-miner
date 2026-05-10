import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const sql = neon(DATABASE_URL)

// Score calculation
function calculateScore(input: any): any {
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
  socialScore = Math.min(30, socialScore)

  let trendScore = 3
  if (input.trend7d === 'rising') trendScore = 20
  else if (input.trend7d === 'steady') trendScore = 5
  else if (input.trend30d === 'rising') trendScore = 10

  let competitionScore = 7
  switch (input.competition) {
    case 'low': competitionScore = 15; break
    case 'medium': competitionScore = 10; break
    case 'high': competitionScore = 4; break
    case 'very_high': competitionScore = 0; break
  }

  let launchScore = 3
  if (input.canEmbed) launchScore = 10
  else if (input.playableInBrowser) launchScore = 7

  const totalScore = freshnessScore + socialScore + trendScore + competitionScore + launchScore

  let decision = 'postpone'
  if (totalScore >= 80) decision = 'immediate_launch'
  else if (totalScore >= 65) decision = 'quick_page'
  else if (totalScore >= 50) decision = 'monitor'

  return { freshnessScore, socialScore, trendScore, competitionScore, launchScore, totalScore, decision }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { status, platform, minScore, limit } = req.query
    const limitNum = Number(limit) || 100

    let candidates: any[] = []

    // Build query based on filters
    if (status && platform) {
      candidates = await sql`SELECT * FROM candidates WHERE status = ${status} AND source_platform = ${platform} ORDER BY discovered_at DESC LIMIT ${limitNum}`
    } else if (status) {
      candidates = await sql`SELECT * FROM candidates WHERE status = ${status} ORDER BY discovered_at DESC LIMIT ${limitNum}`
    } else if (platform) {
      candidates = await sql`SELECT * FROM candidates WHERE source_platform = ${platform} ORDER BY discovered_at DESC LIMIT ${limitNum}`
    } else {
      candidates = await sql`SELECT * FROM candidates ORDER BY discovered_at DESC LIMIT ${limitNum}`
    }

    const withScores = candidates.map((c: any) => {
      const score = calculateScore({
        publishedAt: c.published_at,
        discoveredAt: c.discovered_at,
        canEmbed: c.can_embed,
        playableInBrowser: c.playable_in_browser,
      })

      return {
        id: c.id,
        name: c.name,
        originalTitle: c.original_title,
        normalizedName: c.normalized_name,
        sourcePlatform: c.source_platform,
        sourceUrl: c.source_url,
        thumbnail: c.thumbnail,
        author: c.author,
        genre: c.genre,
        publishedAt: c.published_at,
        discoveredAt: c.discovered_at,
        canEmbed: c.can_embed,
        playableInBrowser: c.playable_in_browser,
        platformRanking: c.platform_ranking,
        platformComments: c.platform_comments,
        status: c.status,
        notes: c.notes,
        recencyLevel: c.recency_level,
        timeConfidence: c.time_confidence,
        scoreTotal: c.score_total,
        decision: c.decision,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        score,
      }
    })

    const filtered = minScore
      ? withScores.filter((c: any) => c.score.totalScore >= Number(minScore))
      : withScores

    return res.json(filtered)
  } catch (error: any) {
    console.error('Get candidates error:', error)
    return res.status(500).json({ error: error.message })
  }
}