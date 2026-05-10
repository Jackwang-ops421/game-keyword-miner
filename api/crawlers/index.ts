import { sql } from '../lib/db'
import { normalizeTitle, isValidTitle, getRecencyLevel } from '../lib/score'

// itch.io RSS feed parser
async function fetchItchIoGames(): Promise<any[]> {
  const feedUrl = 'https://itch.io/games/newest'
  const rssUrl = 'https://itch.io/games/newest/atom'

  try {
    // Try RSS first
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'GameKeywordMiner/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, text/xml',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const text = await response.text()
    return parseItchRSS(text)
  } catch (error) {
    console.log('RSS failed, trying HTML:', error)
    // Fallback to HTML parsing would go here
    return []
  }
}

function parseItchRSS(xml: string): any[] {
  const games: any[] = []

  // Simple RSS/Atom parser
  const itemRegex = /<entry>(.*?)<\/entry>|<item>(.*?)<\/item>/gs
  const titleRegex = /<title>(.*?)<\/title>/i
  const linkRegex = /<link[^>]*href=["'](.*?)["'][^>]*>|<link[^>]*>(.*?)<\/link>/i
  const dateRegex = /<published>(.*?)<\/published>|<updated>(.*?)<\/updated>|<pubDate>(.*?)<\/pubDate>/i

  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1] || match[2]
    if (!item) continue

    const titleMatch = titleRegex.exec(item)
    const linkMatch = linkRegex.exec(item)
    const dateMatch = dateRegex.exec(item)

    const title = titleMatch?.[1]?.trim()
    const link = linkMatch?.[1] || linkMatch?.[2]?.trim()

    if (title && isValidTitle(title)) {
      games.push({
        name: title,
        originalTitle: title,
        normalizedName: normalizeTitle(title),
        sourcePlatform: 'itch.io',
        sourceUrl: link || '',
        publishedAt: dateMatch?.[1] || dateMatch?.[2] || dateMatch?.[3] || null,
      })
    }
  }

  return games
}

// Scratch API fetcher
async function fetchScratchGames(): Promise<any[]> {
  try {
    const response = await fetch('https://api.scratch.mit.edu/search/projects?q=games&mode=trending&limit=20', {
      headers: {
        'User-Agent': 'GameKeywordMiner/1.0',
      },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const projects = await response.json()

    return projects.map((p: any) => ({
      name: p.title,
      originalTitle: p.title,
      normalizedName: normalizeTitle(p.title),
      sourcePlatform: 'Scratch',
      sourceUrl: `https://scratch.mit.edu/projects/${p.id}`,
      thumbnail: p.images?.['282x218'] || null,
      author: p.author?.username || null,
      publishedAt: p.created ? new Date(p.created).toISOString() : null,
    }))
  } catch (error) {
    console.error('Scratch fetch error:', error)
    return []
  }
}

// Game Jolt fetcher
async function fetchGameJoltGames(): Promise<any[]> {
  try {
    // Game Jolt has a public API
    const response = await fetch('https://gamejolt.com/api/game/v1/?抽', {
      headers: {
        'User-Agent': 'GameKeywordMiner/1.0',
      },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    // This is a placeholder - actual API structure needs verification
    return []
  } catch (error) {
    console.error('GameJolt fetch error:', error)
    return []
  }
}

// Main sync function
export async function syncPlatform(platform: string) {
  const startTime = Date.now()
  let itemsFound = 0
  let itemsAdded = 0
  let itemsDuplicated = 0
  let errorMessage = ''

  try {
    let games: any[] = []

    switch (platform.toLowerCase()) {
      case 'itch.io':
        games = await fetchItchIoGames()
        break
      case 'scratch':
        games = await fetchScratchGames()
        break
      case 'game jolt':
        games = await fetchGameJoltGames()
        break
      default:
        throw new Error(`Unknown platform: ${platform}`)
    }

    itemsFound = games.length

    // Process each game
    for (const game of games) {
      if (!isValidTitle(game.name)) continue

      // Check duplicate
      const existing = await sql`
        SELECT id FROM candidates
        WHERE normalized_name = ${game.normalizedName}
        AND source_platform = ${game.sourcePlatform}
      `

      if (existing.length > 0) {
        itemsDuplicated++
        continue
      }

      // Insert
      await sql`
        INSERT INTO candidates (
          name,
          original_title,
          normalized_name,
          source_platform,
          source_url,
          thumbnail,
          author,
          published_at,
          discovered_at,
          can_embed,
          playable_in_browser,
          status,
          recency_level,
          time_confidence
        ) VALUES (
          ${game.name},
          ${game.originalTitle},
          ${game.normalizedName},
          ${game.sourcePlatform},
          ${game.sourceUrl},
          ${game.thumbnail || null},
          ${game.author || null},
          ${game.publishedAt ? new Date(game.publishedAt) : null},
          NOW(),
          true,
          true,
          'pending',
          ${getRecencyLevel(game.publishedAt, new Date().toISOString())},
          ${game.publishedAt ? 'high' : 'low'}
        )
      `

      itemsAdded++
    }

    // Update platform sync status
    await sql`
      UPDATE platforms SET
        last_sync_at = NOW(),
        last_sync_status = 'success'
      WHERE name ILIKE ${platform}
    `
  } catch (error: any) {
    errorMessage = error.message

    await sql`
      UPDATE platforms SET
        last_sync_at = NOW(),
        last_sync_status = 'failed'
      WHERE name ILIKE ${platform}
    `
  }

  const duration = Date.now() - startTime

  // Log sync
  await sql`
    INSERT INTO sync_logs (
      platform,
      method,
      status,
      items_found,
      items_added,
      items_duplicated,
      error_message,
      created_at
    ) VALUES (
      ${platform},
      'auto',
      ${errorMessage ? 'failed' : 'success'},
      ${itemsFound},
      ${itemsAdded},
      ${itemsDuplicated},
      ${errorMessage || null},
      NOW()
    )
  `

  return {
    platform,
    duration,
    itemsFound,
    itemsAdded,
    itemsDuplicated,
    error: errorMessage,
  }
}

// Get sync logs
export async function getSyncLogs(limit = 50) {
  const logs = await sql`
    SELECT * FROM sync_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return logs
}