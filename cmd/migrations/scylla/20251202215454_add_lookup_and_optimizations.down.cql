DROP TABLE IF EXISTS chat_keyspace.conversation_user_lookup;
DROP TABLE IF EXISTS chat_keyspace.conversations_by_user_bucketed;

ALTER TABLE chat_keyspace.messages_by_conversation
WITH compaction = {
    'class': 'SizeTieredCompactionStrategy'
};

ALTER TABLE chat_keyspace.conversations_by_user
WITH compaction = {
    'class': 'SizeTieredCompactionStrategy'
};
