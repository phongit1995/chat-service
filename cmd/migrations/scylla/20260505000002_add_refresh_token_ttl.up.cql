CREATE TABLE IF NOT EXISTS chat_keyspace.refresh_tokens (
    token_id   uuid PRIMARY KEY,
    user_id    uuid,
    issued_at  timestamp,
    expires_at timestamp,
    revoked    boolean
) WITH default_time_to_live = 2592000;

CREATE TABLE IF NOT EXISTS chat_keyspace.refresh_tokens_by_user (
    user_id  uuid,
    token_id uuid,
    PRIMARY KEY (user_id, token_id)
) WITH default_time_to_live = 2592000;
