import { sql } from '../lib/db'
import { calculateScore, normalizeTitle, isValidTitle, getRecencyLevel } from '../lib/score'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { status, platform, minScore, limit = 100 } = req.query

    let query = sql`SELECT * FROM candidates WHERE 1=1`
    const params: any[] = []

    if (status) {
      params.push(status)
      query = sql`${query} AND status = ${params[params.length - 1]}`
    }

    if (platform) {
      params.push(platform)
      query = sql`${query} AND source_platform = ${params[params.length - 1]}`
    }

    query = sql`${query} ORDER BY discovered_at DESC LIMIT ${limit}`

    const candidates = await query

    // Calculate scores for each candidate
    const withScores = await Promise.all(
      candidates.map(async (c: any) => {
        // Get social metrics
        const metrics = await sql`
          SELECT * FROM social_metrics WHERE candidate_id = ${c.id}
        `

        const social = metrics[0] || {}

        const score = calculateScore({
          publishedAt: c.published_at,
          discoveredAt: c.discovered_at,
          youtubeVideos7d: social.youtube_videos_7d,
          topYoutubeViews: social.top_youtube_views,
          hasInfluencerVideo: social.has_influencer_video,
          redditPosts7d: social.reddit_posts_7d,
          topRedditUpvotes: social.top_reddit_upvotes,
          tiktokSignal: social.tiktok_signal,
          discordSignal: social.discord_signal,
          platformReviews7d: social.platform_reviews_7d,
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
    )

    // Filter by minScore if provided
    const filtered = minScore
      ? withScores.filter((c: any) => c.score.totalScore >= Number(minScore))
      : withScores

    return res.json(filtered)
  } catch (error) {
    console.error('Get candidates error:', error)
    return res.status(500).json({ error: error.message })
  }
}