PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Application settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('port', '3000'),
  ('host_url', 'http://localhost:3000'),
  ('https_enabled', 'false'),
  ('letsencrypt_domain', ''),
  ('letsencrypt_email', ''),
  ('patreon_api_key', ''),
  ('ai_api_key', ''),
  ('ai_base_url', 'https://api.openai.com/v1'),
  ('ai_model', 'gpt-4o-mini'),
  ('whisper_model', 'base'),
  ('scheduler_enabled', 'false'),
  ('scheduler_interval_hours', '6');

-- Download queue
CREATE TABLE IF NOT EXISTS download_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','error','cancelled')),
  progress REAL NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT,
  post_title TEXT NOT NULL DEFAULT '',
  creator TEXT NOT NULL DEFAULT '',
  video_path TEXT NOT NULL DEFAULT '',
  transcript_text TEXT NOT NULL DEFAULT '',
  srt_content TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  duration_seconds REAL NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  key_topics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
  post_title,
  creator,
  transcript_text,
  summary,
  key_topics,
  content='transcripts',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS transcripts_ai AFTER INSERT ON transcripts BEGIN
  INSERT INTO transcripts_fts(rowid, post_title, creator, transcript_text, summary, key_topics)
  VALUES (new.id, new.post_title, new.creator, new.transcript_text, new.summary, new.key_topics);
END;

CREATE TRIGGER IF NOT EXISTS transcripts_ad AFTER DELETE ON transcripts BEGIN
  INSERT INTO transcripts_fts(transcripts_fts, rowid, post_title, creator, transcript_text, summary, key_topics)
  VALUES ('delete', old.id, old.post_title, old.creator, old.transcript_text, old.summary, old.key_topics);
END;

CREATE TRIGGER IF NOT EXISTS transcripts_au AFTER UPDATE ON transcripts BEGIN
  INSERT INTO transcripts_fts(transcripts_fts, rowid, post_title, creator, transcript_text, summary, key_topics)
  VALUES ('delete', old.id, old.post_title, old.creator, old.transcript_text, old.summary, old.key_topics);
  INSERT INTO transcripts_fts(rowid, post_title, creator, transcript_text, summary, key_topics)
  VALUES (new.id, new.post_title, new.creator, new.transcript_text, new.summary, new.key_topics);
END;
