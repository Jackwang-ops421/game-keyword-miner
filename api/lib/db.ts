import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export { sql }

// Initialize database tables
export async function initializeDatabase() {
  // Create candidates table
  await sql`
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      original_title VARCHAR(255),
      normalized_name VARCHAR(255),
      source_platform VARCHAR(100),
      source_url TEXT,
      thumbnail TEXT,
      author VARCHAR(255),
      genre VARCHAR(100),
      tags TEXT[],
      published_at TIMESTAMP,
      discovered_at TIMESTAMP DEFAULT NOW(),
      can_embed BOOLEAN DEFAULT false,
      playable_in_browser BOOLEAN DEFAULT true,
      platform_ranking INTEGER,
      platform_comments INTEGER,
      quality_comments INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      notes TEXT,
      recency_level VARCHAR(10) DEFAULT '>30d',
      time_confidence VARCHAR(10) DEFAULT 'low',
      score_total INTEGER DEFAULT 0,
      decision VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Create social_metrics table
  await sql`
    CREATE TABLE IF NOT EXISTS social_metrics (
      id SERIAL PRIMARY KEY,
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
      youtube_videos_7d INTEGER DEFAULT 0,
      top_youtube_views INTEGER DEFAULT 0,
      top_youtube_comments INTEGER DEFAULT 0,
      has_influencer_video BOOLEAN DEFAULT false,
      reddit_posts_7d INTEGER DEFAULT 0,
      top_reddit_upvotes INTEGER DEFAULT 0,
      top_reddit_comments INTEGER DEFAULT 0,
      tiktok_signal BOOLEAN DEFAULT false,
      tiktok_top_views INTEGER DEFAULT 0,
      discord_signal BOOLEAN DEFAULT false,
      platform_reviews_7d INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Create platforms table
  await sql`
    CREATE TABLE IF NOT EXISTS platforms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      domain VARCHAR(255),
      platform_type VARCHAR(20) DEFAULT '首发源',
      crawl_method VARCHAR(20) DEFAULT 'html',
      feed_url TEXT,
      api_url TEXT,
      list_url TEXT,
      enabled BOOLEAN DEFAULT true,
      priority VARCHAR(20) DEFAULT '次优先',
      last_sync_at TIMESTAMP,
      last_sync_status VARCHAR(20),
      notes TEXT
    )
  `

  // Create sync_logs table
  await sql`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id SERIAL PRIMARY KEY,
      platform VARCHAR(100),
      method VARCHAR(20),
      status VARCHAR(20),
      items_found INTEGER DEFAULT 0,
      items_added INTEGER DEFAULT 0,
      items_duplicated INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `

  // Initialize default platforms
  await sql`
    INSERT INTO platforms (name, domain, platform_type, crawl_method, enabled, priority)
    VALUES
      ('itch.io', 'itch.io', '首发源', 'rss', true, '必做'),
      ('Cocrea', 'cocrea.world', '首发源', 'html', true, '高优先'),
      ('Scratch', 'scratch.mit.edu', '首发源', 'api', true, '必做'),
      ('Game Jolt', 'gamejolt.com', '首发源', 'html', true, '次优先'),
      ('CrazyGames', 'crazygames.com', '验证源', 'site_search', false, '验证源'),
      ('Poki', 'poki.com', '验证源', 'site_search', false, '验证源')
    ON CONFLICT DO NOTHING
  `
}