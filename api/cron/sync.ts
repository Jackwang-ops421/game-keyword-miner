import { sql } from '../lib/db'
import { syncPlatform, getSyncLogs } from '../crawlers'

// Cron job handler - runs on schedule
export default async function handler(req, res) {
  // Verify this is a cron request (you can add a secret token check)
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  // In production, you might want to verify the request is actually from Vercel
  // Vercel adds a header: x-vercel-signature

  try {
    console.log('Starting scheduled sync...')

    // Get all enabled platforms
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
        results.push({ platform: name, ...result })
        console.log(`Synced ${name}: ${result.itemsFound} found, ${result.itemsAdded} added`)
      } catch (error: any) {
        console.error(`Failed to sync ${name}:`, error.message)
        results.push({ platform: name, error: error.message })
      }

      // Add delay between platforms to avoid rate limiting
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