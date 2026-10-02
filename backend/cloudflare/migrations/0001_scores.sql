PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY,
  formation TEXT NOT NULL,
  opens_at TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  revision TEXT NOT NULL,
  published_at TEXT
);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES packs(id),
  request_id TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  initials TEXT NOT NULL,
  reference TEXT NOT NULL,
  score INTEGER NOT NULL,
  guesses INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  UNIQUE(pack_id, reference)
);
CREATE INDEX IF NOT EXISTS submission_ranking ON submissions(pack_id, score DESC, guesses ASC);
CREATE INDEX IF NOT EXISTS submission_initials ON submissions(pack_id, initials);
CREATE TABLE IF NOT EXISTS answers (
  submission_id INTEGER NOT NULL REFERENCES submissions(id),
  slot INTEGER NOT NULL,
  person_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  clubs TEXT NOT NULL,
  contributions TEXT NOT NULL,
  PRIMARY KEY(submission_id, slot)
);
CREATE INDEX IF NOT EXISTS answer_person ON answers(person_id);
CREATE TABLE IF NOT EXISTS publications (
  pack_id TEXT PRIMARY KEY REFERENCES packs(id),
  snapshot TEXT NOT NULL
);
