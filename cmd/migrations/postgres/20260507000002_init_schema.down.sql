DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS relationships;
DROP TABLE IF EXISTS users;
