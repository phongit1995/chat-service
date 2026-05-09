CREATE KEYSPACE IF NOT EXISTS chat_keyspace
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 1
};

CREATE TABLE IF NOT EXISTS chat_keyspace.conversations (
    conversation_id   uuid PRIMARY KEY,
    type              text,
    name              text,
    avatar            text,
    created_by        uuid,
    created_at        timestamp,
    updated_at        timestamp,
    participant_count int
);

CREATE TABLE IF NOT EXISTS chat_keyspace.conversation_members_by_conversation (
    conversation_id uuid,
    user_id         uuid,
    joined_at       timestamp,
    left_at         timestamp,
    is_active       boolean,
    role            text,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.direct_conversations_by_user_pair (
    user_a          uuid,
    user_b          uuid,
    conversation_id uuid,
    PRIMARY KEY (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.messages_by_conversation (
    conversation_id uuid,
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
    PRIMARY KEY (conversation_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND compaction = {
      'class': 'TimeWindowCompactionStrategy',
      'compaction_window_size': 1,
      'compaction_window_unit': 'DAYS'
  };

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

CREATE TABLE IF NOT EXISTS chat_keyspace.message_meta (
    conversation_id uuid,
    message_id      timeuuid,
    bucket          int,
    sender_id       uuid,
    PRIMARY KEY (conversation_id, message_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.conversations_by_user (
    user_id              uuid,
    conversation_id      uuid,
    conversation_type    text,
    display_name         text,
    display_avatar       text,
    other_user_id        uuid,
    other_user_name      text,
    other_user_avatar    text,
    last_message_at      timeuuid,
    last_message_id      timeuuid,
    last_message_preview text,
    last_message_sender  uuid,
    unread_count         int,
    last_read_message_id timeuuid,
    last_read_at         timestamp,
    updated_at           timestamp,
    PRIMARY KEY (user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.conversation_read_by_user (
    conversation_id      uuid,
    user_id              uuid,
    last_read_message_id timeuuid,
    last_read_at         timestamp,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.hidden_conversations (
    user_id         uuid,
    conversation_id uuid,
    hidden_at       timestamp,
    is_archived     boolean,
    is_muted        boolean,
    PRIMARY KEY (user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS chat_keyspace.archived_conversations (
    user_id              uuid,
    archive_bucket       text,
    conversation_id      uuid,
    last_message_at      timeuuid,
    last_message_id      timeuuid,
    last_message_preview text,
    last_message_sender  uuid,
    archived_at          timestamp,
    PRIMARY KEY (user_id, archive_bucket, conversation_id)
) WITH CLUSTERING ORDER BY (archive_bucket DESC, conversation_id ASC);
