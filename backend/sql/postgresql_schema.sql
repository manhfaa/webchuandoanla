-- Leafiq PostgreSQL schema
-- App-specific tables for Django + Supabase/Postgres.
-- Core Django tables such as django_migrations, django_session,
-- auth_group, auth_permission, django_content_type are created by Django migrations.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users_user (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ NULL,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    full_name VARCHAR(120) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    company_name VARCHAR(150) NOT NULL DEFAULT '',
    farm_name VARCHAR(150) NOT NULL DEFAULT '',
    location VARCHAR(150) NOT NULL DEFAULT '',
    current_plan VARCHAR(20) NOT NULL DEFAULT 'free',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_user_current_plan_check
        CHECK (current_plan IN ('free', 'pro', 'plus'))
);

CREATE INDEX IF NOT EXISTS users_user_email_idx
    ON users_user (email);

CREATE TABLE IF NOT EXISTS users_usersetting (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users_user(id) ON DELETE CASCADE,
    theme VARCHAR(20) NOT NULL DEFAULT 'light',
    language VARCHAR(20) NOT NULL DEFAULT 'vi',
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    diagnosis_auto_save BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    expert_chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engagement_serviceplan (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    yolo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    cnn_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rag_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    expert_chat_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    max_diagnoses_per_month INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS engagement_usersubscription (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
    plan_id BIGINT NOT NULL REFERENCES engagement_serviceplan(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'manual',
    provider_subscription_id VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT engagement_usersubscription_status_check
        CHECK (status IN ('active', 'trial', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS engagement_usersubscription_user_idx
    ON engagement_usersubscription (user_id, status);

CREATE TABLE IF NOT EXISTS diagnoses_diagnosis (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    image_path VARCHAR(500) NOT NULL DEFAULT '',
    original_file_name VARCHAR(255) NOT NULL DEFAULT '',
    input_method VARCHAR(20) NOT NULL DEFAULT 'upload',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    is_leaf BOOLEAN NOT NULL DEFAULT FALSE,
    yolo_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    yolo_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    cnn_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    cnn_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    plant_name VARCHAR(120) NOT NULL DEFAULT '',
    disease_name VARCHAR(150) NOT NULL DEFAULT '',
    severity VARCHAR(50) NOT NULL DEFAULT '',
    symptom_input TEXT NOT NULL DEFAULT '',
    user_question TEXT NOT NULL DEFAULT '',
    field_location VARCHAR(150) NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    rag_summary TEXT NOT NULL DEFAULT '',
    rag_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    saved_by_user BOOLEAN NOT NULL DEFAULT TRUE,
    model_version VARCHAR(80) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT diagnoses_diagnosis_input_method_check
        CHECK (input_method IN ('upload', 'capture', 'sample')),
    CONSTRAINT diagnoses_diagnosis_status_check
        CHECK (status IN ('pending', 'validated', 'completed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS diagnoses_diagnosis_user_created_idx
    ON diagnoses_diagnosis (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS diagnoses_diagnosis_status_idx
    ON diagnoses_diagnosis (status);

CREATE TABLE IF NOT EXISTS engagement_chatconversation (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
    diagnosis_id BIGINT NULL REFERENCES diagnoses_diagnosis(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'rag',
    title VARCHAR(180) NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT engagement_chatconversation_mode_check
        CHECK (mode IN ('rag', 'advisor', 'expert'))
);

CREATE INDEX IF NOT EXISTS engagement_chatconversation_user_updated_idx
    ON engagement_chatconversation (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS engagement_chatmessage (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES engagement_chatconversation(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT engagement_chatmessage_role_check
        CHECK (role IN ('system', 'user', 'assistant', 'expert'))
);

CREATE INDEX IF NOT EXISTS engagement_chatmessage_conversation_created_idx
    ON engagement_chatmessage (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS engagement_expertconsultation (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE CASCADE,
    diagnosis_id BIGINT NULL REFERENCES diagnoses_diagnosis(id) ON DELETE SET NULL,
    conversation_id BIGINT NULL UNIQUE REFERENCES engagement_chatconversation(id) ON DELETE SET NULL,
    topic VARCHAR(180) NOT NULL,
    question TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    expert_name VARCHAR(120) NOT NULL DEFAULT '',
    expert_reply TEXT NOT NULL DEFAULT '',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT engagement_expertconsultation_status_check
        CHECK (status IN ('open', 'assigned', 'answered', 'closed'))
);

CREATE INDEX IF NOT EXISTS engagement_expertconsultation_user_status_idx
    ON engagement_expertconsultation (user_id, status, created_at DESC);

INSERT INTO engagement_serviceplan
    (slug, name, description, price_monthly, currency, yolo_enabled, cnn_enabled, rag_enabled, expert_chat_enabled, max_diagnoses_per_month, metadata, is_active)
VALUES
    ('free', 'Free', 'Xac thuc anh la bang YOLO va luu lich su co ban.', 0, 'VND', TRUE, FALSE, FALSE, FALSE, 30, '{"badge":"Starter"}'::jsonb, TRUE),
    ('pro', 'Pro', 'Mo rong luu tru va san sang cho CNN khi duoc bat.', 199000, 'VND', TRUE, TRUE, FALSE, FALSE, 500, '{"badge":"Operational"}'::jsonb, TRUE),
    ('plus', 'Plus', 'Mo khoa Light RAG, chat chuyen gia va luu tru day du.', 399000, 'VND', TRUE, TRUE, TRUE, TRUE, 5000, '{"badge":"Premium"}'::jsonb, TRUE)
ON CONFLICT (slug) DO NOTHING;

DROP TRIGGER IF EXISTS users_user_set_updated_at ON users_user;
CREATE TRIGGER users_user_set_updated_at
BEFORE UPDATE ON users_user
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS users_usersetting_set_updated_at ON users_usersetting;
CREATE TRIGGER users_usersetting_set_updated_at
BEFORE UPDATE ON users_usersetting
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS engagement_serviceplan_set_updated_at ON engagement_serviceplan;
CREATE TRIGGER engagement_serviceplan_set_updated_at
BEFORE UPDATE ON engagement_serviceplan
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS engagement_usersubscription_set_updated_at ON engagement_usersubscription;
CREATE TRIGGER engagement_usersubscription_set_updated_at
BEFORE UPDATE ON engagement_usersubscription
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS diagnoses_diagnosis_set_updated_at ON diagnoses_diagnosis;
CREATE TRIGGER diagnoses_diagnosis_set_updated_at
BEFORE UPDATE ON diagnoses_diagnosis
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS engagement_chatconversation_set_updated_at ON engagement_chatconversation;
CREATE TRIGGER engagement_chatconversation_set_updated_at
BEFORE UPDATE ON engagement_chatconversation
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS engagement_expertconsultation_set_updated_at ON engagement_expertconsultation;
CREATE TRIGGER engagement_expertconsultation_set_updated_at
BEFORE UPDATE ON engagement_expertconsultation
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
