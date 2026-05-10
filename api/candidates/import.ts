import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL not set')
const sql = neon(DATABASE_URL)

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
}

function isValidTitle(title: string): boolean {
  const invalid = ['untitled', 'test', 'my game', 'my first game', 'platformer', 'demo game', 'new game', 'game jam project', 'school project']
  const normalized = title.toLowerCase().trim()
  return !invalid.some(inv => normalized.includes(inv))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { candidates } = req.body

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'Invalid candidates array' })
    }

    let imported = 0
    let duplicated = 0

    for (const item of candidates) {
      const name = item.name?.trim()
      if (!name || !isValidTitle(name)) continue

      const normalizedName = normalizeTitle(name)
      const sourcePlatform = item.sourcePlatform || item.source_platform || 'manual'
      const sourceUrl = item.sourceUrl || item.source_url || ''

      const existing = await sql`SELECT id FROM candidates WHERE normalized_name = ${normalizedName} AND source_platform = ${sourcePlatform} LIMIT 1`

      if (existing.length > 0) {
        duplicated++
        continue
      }

      await sql`
        INSERT INTO candidates (
          name, original_title, normalized_name, source_platform, source_url,
          thumbnail, author, genre, published_at, discovered_at,
          can_embed, playable_in_browser, status, recency_level, time_confidence
        ) VALUES (
          ${name}, ${name}, ${normalizedName}, ${sourcePlatform}, ${sourceUrl},
          ${item.thumbnail || null}, ${item.author || null}, ${item.genre || null},
          ${item.publishedAt ? new Date(item.publishedAt) : null}, NOW(),
          ${item.canEmbed ?? false}, ${item.playableInBrowser ?? true},
          'pending', '1-7d', ${item.publishedAt ? 'high' : 'low'}
        )
      `
      imported++
    }

    return res.json({ imported, duplicated, total: candidates.length })
  } catch (error: any) {
    console.error('Import error:', error)
    return res.status(500).json({ error: error.message })
  }
}