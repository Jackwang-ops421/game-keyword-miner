import { sql } from '../lib/db'
import { syncPlatform, getSyncLogs } from '../crawlers'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      // Get sync logs
      const { limit = 50 } = req.query
      const logs = await getSyncLogs(Number(limit))
      return res.json(logs)
    }

    if (req.method === 'POST') {
      const { platform } = req.body

      if (!platform) {
        return res.status(400).json({ error: 'Platform is required' })
      }

      // Get enabled platforms
      const platforms = await sql`
        SELECT * FROM platforms
        WHERE enabled = true
        AND name ILIKE ${platform}
      `

      if (platforms.length === 0) {
        return res.status(404).json({ error: 'Platform not found or disabled' })
      }

      const result = await syncPlatform(platform)

      return res.json({
        success: true,
        log: result,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: error.message })
  }
}