CREATE TABLE IF NOT EXISTS login_challenges (token_hash TEXT PRIMARY KEY NOT NULL, ip_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_challenge_expiry ON login_challenges(expires_at);
