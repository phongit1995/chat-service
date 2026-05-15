CREATE TABLE IF NOT EXISTS calls (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL,
    caller_id         UUID NOT NULL,
    call_type         VARCHAR(10) NOT NULL,
    room_name         VARCHAR(255) UNIQUE NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'ringing',
    participants      UUID[] NOT NULL DEFAULT '{}',
    started_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answered_at       TIMESTAMP,
    ended_at          TIMESTAMP,
    duration_seconds  INTEGER,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_calls_caller
        FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_call_type
        CHECK (call_type IN ('audio','video')),
    CONSTRAINT check_call_status
        CHECK (status IN ('ringing','active','ended','missed','declined'))
);

CREATE INDEX IF NOT EXISTS idx_calls_conv_started ON calls(conversation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status) WHERE status IN ('ringing','active');
