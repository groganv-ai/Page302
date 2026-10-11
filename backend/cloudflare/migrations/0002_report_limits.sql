CREATE TABLE IF NOT EXISTS report_limits (
 bucket TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS report_limits_expiry ON report_limits(expires_at);
