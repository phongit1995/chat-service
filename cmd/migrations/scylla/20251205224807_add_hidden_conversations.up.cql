-- ============================================================================
-- HIDDEN_CONVERSATIONS - Track conversations that users have hidden
-- When a conversation is hidden, it's removed from conversations_by_user
-- and added to this table. When a new message arrives, it will be
-- automatically unhidden (moved back to conversations_by_user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_keyspace.hidden_conversations (
    user_id uuid,
    conversation_id uuid,
    hidden_at timestamp,
    -- Store conversation data for restoration
    is_group boolean,
    other_user_id uuid,
    other_user_name text,
    other_user_avatar text,
    title text,
    avatar text,
    PRIMARY KEY (user_id, conversation_id)
);

-- Index for checking if conversation is hidden (used during message delivery)
CREATE INDEX IF NOT EXISTS idx_hidden_conversations_lookup 
ON chat_keyspace.hidden_conversations (conversation_id);

