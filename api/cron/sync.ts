import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL not set')
const sql = neon(DATABASE_URL)

export async function syncPlatform(platform: string) {
  const startTime = Date.now()
  let itemsFound = 0
  let itemsAdded = 0
  let itemsDuplicated = 0
  let errorMessage = ''

  try {
    if (platform.toLowerCase().includes('itch')) {
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
  try {
    console.log('Starting scheduled sync...')

    const platforms = await sql`
      SELECT name FROM platforms
      WHERE enabled = true
      ORDER BY
        CASE priority
          WHEN '必做' THEN 1
          WHEN '高优先' THEN 2
          WHEN '次优先' THEN 3
          ELSE 4
        END
    `

    const results = []

    for (const { name } of platforms) {
      try {
        console.log(`Syncing ${name}...`)
        const result = await syncPlatform(name)
        results.push({ ...result, platform: name })
      } catch (error: any) {
        console.error(`Failed to sync ${name}:`, error.message)
        results.push({ platform: name, error: error.message })
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalPlatforms: platforms.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      totalFound: results.reduce((sum, r) => sum + (r.itemsFound || 0), 0),
      totalAdded: results.reduce((sum, r) => sum + (r.itemsAdded || 0), 0),
      results,
    }

    console.log('Sync complete:', summary)

    return res.json(summary)
  } catch (error: any) {
    console.error('Cron sync error:', error)
    return res.status(500).json({ error: error.message })
  }
}