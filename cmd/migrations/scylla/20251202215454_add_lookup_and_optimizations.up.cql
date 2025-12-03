CREATE TABLE IF NOT EXISTS chat_keyspace.conversation_user_lookup (
    user_id uuid,
    conversation_id uuid,
    last_message_at timeuuid,
    PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE chat_keyspace.messages_by_conversation
WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': 1,
    'compaction_window_unit': 'DAYS'
};

ALTER TABLE chat_keyspace.conversations_by_user
WITH compaction = {
    'class': 'LeveledCompactionStrategy'
};

CREATE TABLE IF NOT EXISTS chat_keyspace.conversations_by_user_bucketed (
    user_id uuid,
    bucket timestamp,
    last_message_at timeuuid,
    conversation_id uuid,
    is_group boolean,
    other_user_id uuid,
    other_user_name text,
    other_user_avatar text,
    title text,
    avatar text,
    last_message_id timeuuid,
    last_message_body text,
    last_message_sender uuid,
    unread_count int,
    last_read_message_id timeuuid,
    last_read_at timestamp,
    PRIMARY KEY (user_id, bucket, last_message_at, conversation_id)
) WITH CLUSTERING ORDER BY (bucket DESC, last_message_at DESC, conversation_id ASC)
  AND compaction = {
    'class': 'LeveledCompactionStrategy'
};
