import { sql } from '../../lib/db'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  const platformId = Number(id)

  try {
    if (req.method === 'GET') {
      const platforms = await sql`SELECT * FROM platforms WHERE id = ${platformId}`

      if (platforms.length === 0) {
        return res.status(404).json({ error: 'Platform not found' })
      }

      const p = platforms[0]
      return res.json({
        id: p.id,
        name: p.name,
        domain: p.domain,
        platformType: p.platform_type,
        crawlMethod: p.crawl_method,
        feedUrl: p.feed_url,
        apiUrl: p.api_url,
        listUrl: p.list_url,
        enabled: p.enabled,
        priority: p.priority,
        lastSyncAt: p.last_sync_at,
        lastSyncStatus: p.last_sync_status,
        notes: p.notes,
      })
    }

    if (req.method === 'PUT') {
      const {
        name,
        domain,
        platformType,
        crawlMethod,
        feedUrl,
        apiUrl,
        listUrl,
        enabled,
        priority,
        notes,
      } = req.body

      const updated = await sql`
        UPDATE platforms SET
          name = COALESCE(${name}, name),
          domain = COALESCE(${domain}, domain),
          platform_type = COALESCE(${platformType}, platform_type),
          crawl_method = COALESCE(${crawlMethod}, crawl_method),
          feed_url = COALESCE(${feedUrl}, feed_url),
          api_url = COALESCE(${apiUrl}, api_url),
          list_url = COALESCE(${listUrl}, list_url),
          enabled = COALESCE(${enabled}, enabled),
          priority = COALESCE(${priority}, priority),
          notes = COALESCE(${notes}, notes)
        WHERE id = ${platformId}
        RETURNING *
      `

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Platform not found' })
      }

      return res.json({ success: true, platform: updated[0] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Platform error:', error)
    return res.status(500).json({ error: error.message })
  }
}