CREATE TABLE IF NOT EXISTS music_snapshots (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  period TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS music_snapshot_period ON music_snapshots(kind, period, observed_at DESC);
CREATE TABLE IF NOT EXISTS music_memories (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS music_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  public_enabled INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO music_settings(id, public_enabled) VALUES (1, 0);
