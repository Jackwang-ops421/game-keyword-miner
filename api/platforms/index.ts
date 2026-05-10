import { sql } from '../lib/db'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const platforms = await sql`
      SELECT * FROM platforms
      ORDER BY
        CASE priority
          WHEN '必做' THEN 1
          WHEN '高优先' THEN 2
          WHEN '次优先' THEN 3
          ELSE 4
        END,
        name
    `

    const formatted = platforms.map((p: any) => ({
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
    }))

    return res.json(formatted)
  } catch (error: any) {
    console.error('Platforms error:', error)
    return res.status(500).json({ error: error.message })
  }
}