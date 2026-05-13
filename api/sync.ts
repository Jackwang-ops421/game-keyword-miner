import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL not set')
const sql = neon(DATABASE_URL)

export async function getSyncLogs(limit = 50) {
  const logs = await sql`SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ${limit}`
  return logs
}

export async function syncPlatform(platform: string) {
  const startTime = Date.now()
  let itemsFound = 0
  let itemsAdded = 0
  let itemsDuplicated = 0
  let errorMessage = ''

  try {
    const p = platform.toLowerCase()

    // Scratch API - MIT官方公开API
    if (p.includes('scratch')) {
      try {
        const apiUrl = 'https://api.scratch.mit.edu/explore/projects?q=games&sort=recent&limit=20'
        const response = await fetch(apiUrl, {
          headers: { 'User-Agent': 'GameKeywordMiner/1.0' }
        })

        if (response.ok) {
          const data = await response.json()
          const projects = data.projects || []

          itemsFound = projects.length

          for (const proj of projects) {
            const title = proj.title?.trim()
            if (!title || title.length < 2 || title.length > 200) continue

            const normalizedName = title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()

            const existing = await sql`SELECT id FROM candidates WHERE normalized_name = ${normalizedName} AND source_platform = 'Scratch' LIMIT 1`
            if (existing.length > 0) {
              itemsDuplicated++
              continue
            }

            const sourceUrl = proj.url || `https://scratch.mit.edu/projects/${proj.id}`

            await sql`
              INSERT INTO candidates (
                name, original_title, normalized_name, source_platform, source_url,
                thumbnail, author, published_at, discovered_at,
                can_embed, playable_in_browser, status, recency_level, time_confidence
              ) VALUES (
                ${title}, ${title}, ${normalizedName}, 'Scratch', ${sourceUrl},
                ${proj.thumbnail_url || null}, ${proj.creator?.username || null},
                ${proj.history?.created ? new Date(proj.history.created) : null}, NOW(),
                true, true, 'pending', '1-7d', 'high'
              )
            `
            itemsAdded++
          }
        }
      } catch (e: any) {
        errorMessage = e.message
      }
    }

    // Newgrounds API
    else if (p.includes('newgrounds')) {
      try {
        // Newgrounds browse RSS feed
        const feedUrl = 'https://www.newgrounds.com/browse/games/rss'
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'GameKeywordMiner/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        })

        if (response.ok) {
          const text = await response.text()
          const items = text.match(/<item>[\s\S]*?<\/item>/gi) || []
          itemsFound = items.length

          for (const item of items.slice(0, 20)) {
            const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/i.exec(item) || /<title>(.*?)<\/title>/i.exec(item)
            const linkMatch = /<link>(.*?)<\/link>/i.exec(item)
            const pubMatch = /<pubDate>(.*?)<\/pubDate>/i.exec(item)

            const title = titleMatch?.[1]?.trim()
            if (!title || title.length < 2 || title.length > 200) continue

            const normalizedName = title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()

            const existing = await sql`SELECT id FROM candidates WHERE normalized_name = ${normalizedName} AND source_platform = 'Newgrounds' LIMIT 1`
            if (existing.length > 0) {
              itemsDuplicated++
              continue
            }

            await sql`
              INSERT INTO candidates (
                name, original_title, normalized_name, source_platform, source_url,
                published_at, discovered_at, can_embed, playable_in_browser,
                status, recency_level, time_confidence
              ) VALUES (
                ${title}, ${title}, ${normalizedName}, 'Newgrounds', ${linkMatch?.[1] || ''},
                ${pubMatch?.[1] ? new Date(pubMatch[1]) : null}, NOW(),
                true, true, 'pending', '1-7d', 'high'
              )
            `
            itemsAdded++
          }
        }
      } catch (e: any) {
        errorMessage = e.message
      }
    }

    // itch.io (legacy - feed no longer works)
    else if (p.includes('itch')) {
      try {
        const feedUrl = 'https://itch.io/games/newest/atom'
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'GameKeywordMiner/1.0',
            'Accept': 'application/atom+xml, application/rss+xml, text/xml',
          },
        })

        if (response.ok) {
          const text = await response.text()
          const entries = text.match(/<entry>[\s\S]*?<\/entry>/gi) || []
          itemsFound = entries.length

          for (const entry of entries.slice(0, 20)) {
            const titleMatch = /<title>(.*?)<\/title>/i.exec(entry)
            const linkMatch = /<link[^>]*href=["'](.*?)["'][^>]*>/i.exec(entry)
            const dateMatch = /<published>(.*?)<\/published>/i.exec(entry)

            const title = titleMatch?.[1]?.trim()
            const link = linkMatch?.[1]?.trim()

            if (!title || title.length < 2 || title.length > 200) continue

            const normalizedName = title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()

            const existing = await sql`SELECT id FROM candidates WHERE normalized_name = ${normalizedName} AND source_platform = 'itch.io' LIMIT 1`

            if (existing.length > 0) {
              itemsDuplicated++
              continue
            }

            await sql`
              INSERT INTO candidates (
                name, original_title, normalized_name, source_platform, source_url,
                published_at, discovered_at, can_embed, playable_in_browser,
                status, recency_level, time_confidence
              ) VALUES (
                ${title}, ${title}, ${normalizedName}, 'itch.io', ${link || ''},
                ${dateMatch?.[1] ? new Date(dateMatch[1]) : null}, NOW(),
                true, true, 'pending', '1-7d', 'high'
              )
            `
            itemsAdded++
          }
        }
      } catch (e: any) {
        errorMessage = e.message
      }
    }

    await sql`
      UPDATE platforms SET
        last_sync_at = NOW(),
        last_sync_status = ${errorMessage ? 'failed' : 'success'}
      WHERE name ILIKE ${platform}
    `
  } catch (error: any) {
    errorMessage = error.message
  }

  const duration = Date.now() - startTime

  await sql`
    INSERT INTO sync_logs (
      platform, method, status, items_found, items_added, items_duplicated,
      error_message, created_at
    ) VALUES (
      ${platform}, 'auto', ${errorMessage ? 'failed' : 'success'},
      ${itemsFound}, ${itemsAdded}, ${itemsDuplicated},
      ${errorMessage || null}, NOW()
    )
  `

  return { platform, duration, itemsFound, itemsAdded, itemsDuplicated, error: errorMessage }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const { limit } = req.query
      const logs = await getSyncLogs(Number(limit) || 50)
      return res.json(logs)
    }

    if (req.method === 'POST') {
      const { platform } = req.body

      if (!platform) {
        return res.status(400).json({ error: 'Platform is required' })
      }

      const result = await syncPlatform(platform)
      return res.json({ success: true, log: result })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: error.message })
  }
}