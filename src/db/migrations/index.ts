export const localMigrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: Date.UTC(2026, 6, 17),
        tag: "0000_offline_foundation",
        breakpoints: true,
      },
      {
        idx: 1,
        when: Date.UTC(2026, 10, 16),
        tag: "0001_chat_read_path",
        breakpoints: true,
      },
      {
        idx: 2,
        when: Date.UTC(2026, 10, 16),
        tag: "0002_posts_optimistic",
        breakpoints: true,
      },
      {
        idx: 3,
        when: Date.UTC(2026, 10, 18),
        tag: "0003_recent_searches",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  participants TEXT NOT NULL,
  last_message_id TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx
  ON conversations (updated_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  client_id TEXT,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments TEXT NOT NULL,
  status TEXT NOT NULL,
  seq INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_conversation_seq_idx
  ON messages (conversation_id, seq);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS messages_conversation_created_at_idx
  ON messages (conversation_id, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_id_uidx
  ON messages (client_id);
--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(body);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS messages_fts_insert
AFTER INSERT ON messages
BEGIN
  INSERT INTO messages_fts (rowid, body) VALUES (new.rowid, new.body);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS messages_fts_update
AFTER UPDATE OF body ON messages
BEGIN
  DELETE FROM messages_fts WHERE rowid = old.rowid;
  INSERT INTO messages_fts (rowid, body) VALUES (new.rowid, new.body);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS messages_fts_delete
AFTER DELETE ON messages
BEGIN
  DELETE FROM messages_fts WHERE rowid = old.rowid;
END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT,
  username TEXT NOT NULL,
  bio TEXT,
  avatar TEXT,
  counts TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles (updated_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_author_created_at_idx
  ON posts (author_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS search_cache (
  query_key TEXT PRIMARY KEY NOT NULL,
  results TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS search_cache_fetched_at_idx
  ON search_cache (fetched_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS outbox_created_at_idx ON outbox (created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sync_state (
  resource_key TEXT PRIMARY KEY NOT NULL,
  cursor TEXT,
  last_synced_at TEXT
);
    `,
    m0001: `
ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
--> statement-breakpoint
ALTER TABLE messages ADD COLUMN edited_at TEXT;
--> statement-breakpoint
ALTER TABLE messages ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS message_pages (
  conversation_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  message_ids TEXT NOT NULL,
  has_more INTEGER NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, page)
);
    `,
    m0002: `
ALTER TABLE posts ADD COLUMN client_id TEXT;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'sent';
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN previous_content TEXT;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN previous_media TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS posts_client_id_uidx ON posts (client_id);
    `,
    m0003: `
CREATE TABLE IF NOT EXISTS recent_searches (
  term TEXT PRIMARY KEY NOT NULL,
  last_searched_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS recent_searches_last_searched_at_idx
  ON recent_searches (last_searched_at);
    `,
  },
};
