-- Create keyspace for chat application
-- Using SimpleStrategy for development (change to NetworkTopologyStrategy for production)
CREATE KEYSPACE IF NOT EXISTS chat_keyspace
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
};

