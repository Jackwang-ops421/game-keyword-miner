import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL not set')
const sql = neon(DATABASE_URL)

export { sql }

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
    // Check if it is itch.io
    if (platform.toLowerCase().includes('itch')) {
      // Try to fetch RSS
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
          // Simple parsing - look for entry tags
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

            // Check duplicate
            const existing = await sql`SELECT id FROM candidates WHERE normalized_name = ${normalizedName} AND source_platform = 'itch.io' LIMIT 1`

            if (existing.length > 0) {
              itemsDuplicated++
              continue
            }

            // Insert
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

    // Update platform sync status
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