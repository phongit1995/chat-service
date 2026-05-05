ALTER KEYSPACE chat_keyspace WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 1
};
