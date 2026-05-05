CREATE TABLE IF NOT EXISTS chat_keyspace.unread_counts (
    user_id         uuid,
    conversation_id uuid,
    count           counter,
    PRIMARY KEY (user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.message_meta (
    conversation_id uuid,
    message_id      timeuuid,
    bucket          int,
    sender_id       uuid,
    PRIMARY KEY (conversation_id, message_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.messages_by_conversation_v2 (
    conversation_id uuid,
    bucket          int,
    message_id      timeuuid,
    sender_id       uuid,
    sender_name     text,
    sender_avatar   text,
    message_type    text,
    content         text,
    metadata        text,
    created_at      timestamp,
    updated_at      timestamp,
    deleted_at      timestamp,
    reply_to_id     timeuuid,
    PRIMARY KEY ((conversation_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND compaction = {
      'class': 'TimeWindowCompactionStrategy',
      'compaction_window_size': 1,
      'compaction_window_unit': 'DAYS'
  };
