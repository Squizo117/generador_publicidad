CREATE TABLE IF NOT EXISTS generations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('anuncio', 'facebook', 'slogan', 'nombres')),
    business_type VARCHAR(120) NOT NULL,
    product VARCHAR(500) NOT NULL,
    channel VARCHAR(100),
    tone VARCHAR(80),
    location VARCHAR(160),
    additional_details VARCHAR(1000),
    result TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generations_created_at_idx
    ON generations (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx
    ON chat_messages (session_id, created_at, id);

CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx
    ON chat_sessions (updated_at DESC);
