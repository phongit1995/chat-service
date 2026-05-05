DROP INDEX IF EXISTS idx_users_token_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS token_expires_at;
