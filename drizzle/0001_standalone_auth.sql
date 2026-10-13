CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS admin_session_expiry ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_attempt_expiry ON login_attempts(expires_at);
