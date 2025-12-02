CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    avatar          VARCHAR(500),
    phone           VARCHAR(20),
    full_name       VARCHAR(100),
    bio             TEXT,
    date_of_birth   DATE,
    custom_info     JSONB,
    refresh_token   TEXT,
    last_login_ip   VARCHAR(45),
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS relationships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    UUID NOT NULL,
    addressee_id    UUID NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    actioned_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,

    CONSTRAINT fk_relationships_requester
        FOREIGN KEY (requester_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_relationships_addressee
        FOREIGN KEY (addressee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_relationship
        UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_relationships_deleted_at ON relationships(deleted_at);
CREATE INDEX idx_relationships_requester_status ON relationships(requester_id, status);
CREATE INDEX idx_relationships_addressee_status ON relationships(addressee_id, status);
CREATE INDEX idx_relationships_actioned_at ON relationships(actioned_at);
CREATE INDEX idx_relationships_requester_addressee ON relationships(requester_id, addressee_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at
    BEFORE UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE relationships
    ADD CONSTRAINT check_relationship_status
    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'));

ALTER TABLE relationships
    ADD CONSTRAINT check_no_self_relationship
    CHECK (requester_id != addressee_id);
