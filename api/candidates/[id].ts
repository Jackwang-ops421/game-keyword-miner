import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL not set')
const sql = neon(DATABASE_URL)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  const candidateId = Number(id)

  try {
    if (req.method === 'GET') {
      const candidates = await sql`SELECT * FROM candidates WHERE id = ${candidateId}`

      if (candidates.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' })
      }

      const c = candidates[0]
      const metrics = await sql`SELECT * FROM social_metrics WHERE candidate_id = ${candidateId}`
      const social = metrics[0] || {}

      return res.json({
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
        social: {
          youtubeVideos7d: social.youtube_videos_7d,
          topYoutubeViews: social.top_youtube_views,
          topYoutubeComments: social.top_youtube_comments,
          hasInfluencerVideo: social.has_influencer_video,
          redditPosts7d: social.reddit_posts_7d,
          topRedditUpvotes: social.top_reddit_upvotes,
          topRedditComments: social.top_reddit_comments,
          tiktokSignal: social.tiktok_signal,
          discordSignal: social.discord_signal,
          platformReviews7d: social.platform_reviews_7d,
        },
      })
    }

    if (req.method === 'PUT') {
      const {
        name,
        sourcePlatform,
        sourceUrl,
        thumbnail,
        author,
        genre,
        publishedAt,
        canEmbed,
        playableInBrowser,
        platformRanking,
        platformComments,
        status,
        notes,
        social,
      } = req.body

      const updated = await sql`
        UPDATE candidates SET
          name = COALESCE(${name}, name),
          source_platform = COALESCE(${sourcePlatform}, source_platform),
          source_url = COALESCE(${sourceUrl}, source_url),
          thumbnail = COALESCE(${thumbnail}, thumbnail),
          author = COALESCE(${author}, author),
          genre = COALESCE(${genre}, genre),
          published_at = COALESCE(${publishedAt}::timestamp, published_at),
          can_embed = COALESCE(${canEmbed}, can_embed),
          playable_in_browser = COALESCE(${playableInBrowser}, playable_in_browser),
          platform_ranking = COALESCE(${platformRanking}, platform_ranking),
          platform_comments = COALESCE(${platformComments}, platform_comments),
          status = COALESCE(${status}, status),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${candidateId}
        RETURNING *
      `

      if (social) {
        await sql`
          INSERT INTO social_metrics (
            candidate_id, youtube_videos_7d, top_youtube_views, top_youtube_comments,
            has_influencer_video, reddit_posts_7d, top_reddit_upvotes, top_reddit_comments,
            tiktok_signal, discord_signal, platform_reviews_7d, updated_at
          )
          VALUES (
            ${candidateId}, ${social.youtubeVideos7d || 0}, ${social.topYoutubeViews || 0},
            ${social.topYoutubeComments || 0}, ${social.hasInfluencerVideo || false},
            ${social.redditPosts7d || 0}, ${social.topRedditUpvotes || 0}, ${social.topRedditComments || 0},
            ${social.tiktokSignal || false}, ${social.discordSignal || false}, ${social.platformReviews7d || 0}, NOW()
          )
          ON CONFLICT (candidate_id) DO UPDATE SET
            youtube_videos_7d = EXCLUDED.youtube_videos_7d,
            top_youtube_views = EXCLUDED.top_youtube_views,
            top_youtube_comments = EXCLUDED.top_youtube_comments,
            has_influencer_video = EXCLUDED.has_influencer_video,
            reddit_posts_7d = EXCLUDED.reddit_posts_7d,
            top_reddit_upvotes = EXCLUDED.top_reddit_upvotes,
            top_reddit_comments = EXCLUDED.top_reddit_comments,
            tiktok_signal = EXCLUDED.tiktok_signal,
            discord_signal = EXCLUDED.discord_signal,
            platform_reviews_7d = EXCLUDED.platform_reviews_7d,
            updated_at = NOW()
        `
      }

      return res.json({ success: true, candidate: updated[0] })
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM candidates WHERE id = ${candidateId}`
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Candidate error:', error)
    return res.status(500).json({ error: error.message })
  }
}