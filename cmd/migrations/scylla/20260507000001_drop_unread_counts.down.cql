CREATE TABLE IF NOT EXISTS chat_keyspace.unread_counts (
    user_id         uuid,
    conversation_id uuid,
    count           counter,
    PRIMARY KEY (user_id, conversation_id)
);
