CREATE TABLE IF NOT EXISTS release_control (
 id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN (0,1))
);
INSERT OR IGNORE INTO release_control(id,enabled) VALUES(1,0);
CREATE TABLE IF NOT EXISTS release_schedule (
 pack_id TEXT PRIMARY KEY REFERENCES packs(id),
 payload TEXT NOT NULL, sha256 TEXT NOT NULL,
 approved_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS release_events (
 pack_id TEXT NOT NULL REFERENCES packs(id),
 action TEXT NOT NULL CHECK(action IN ('close','open')),
 status TEXT NOT NULL CHECK(status IN ('done','failed')),
 updated_at TEXT NOT NULL, detail TEXT NOT NULL,
 PRIMARY KEY(pack_id,action)
);
