-- stada v3 — Supabase PostgreSQL Schema
-- Run via Supabase SQL Editor or Migration CLI

CREATE TABLE IF NOT EXISTS public.bt_classes (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    teacher_id  BIGINT,
    invite_code VARCHAR(16) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bt_users (
    id               BIGSERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,
    password         TEXT NOT NULL,
    role             VARCHAR(16) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
    class_id         BIGINT REFERENCES public.bt_classes(id) ON DELETE SET NULL,
    study_field      TEXT NOT NULL DEFAULT 'کنکور سراسری — علوم تجربی',
    target_hours     INTEGER NOT NULL DEFAULT 300,
    target_exam_date DATE DEFAULT '2027-07-02',
    streak           INTEGER NOT NULL DEFAULT 0,
    last_study_date  DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Custom per-user subjects with user-definable hex color for charts
CREATE TABLE IF NOT EXISTS public.bt_subjects (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES public.bt_users(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    color       VARCHAR(16) NOT NULL DEFAULT '#00ffa3',
    icon        VARCHAR(16) NOT NULL DEFAULT '📘',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified study + page + test logs
CREATE TABLE IF NOT EXISTS public.bt_study_logs (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES public.bt_users(id) ON DELETE CASCADE,
    subject_id       BIGINT REFERENCES public.bt_subjects(id) ON DELETE SET NULL,
    subject_name     VARCHAR(120) NOT NULL,
    subject_color    VARCHAR(16) NOT NULL DEFAULT '#00ffa3',
    subject_icon     VARCHAR(16) NOT NULL DEFAULT '📘',
    log_date         DATE NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    topic            VARCHAR(250),
    source_book      VARCHAR(200),
    page_from        INTEGER,
    page_to          INTEGER,
    pages_count      INTEGER NOT NULL DEFAULT 0 CHECK (pages_count >= 0),
    tests_total      INTEGER NOT NULL DEFAULT 0 CHECK (tests_total >= 0),
    tests_wrong      INTEGER,
    tests_blank      INTEGER,
    test_accuracy    NUMERIC(5,2),
    konkur_score     NUMERIC(5,2),
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly schedule planner blocks
CREATE TABLE IF NOT EXISTS public.bt_weekly_plans (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES public.bt_users(id) ON DELETE CASCADE,
    subject_id      BIGINT REFERENCES public.bt_subjects(id) ON DELETE SET NULL,
    subject_name    VARCHAR(120) NOT NULL,
    subject_color   VARCHAR(16) NOT NULL DEFAULT '#00ffa3',
    subject_icon    VARCHAR(16) NOT NULL DEFAULT '📘',
    plan_date       DATE NOT NULL,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time      VARCHAR(8) NOT NULL,
    end_time        VARCHAR(8) NOT NULL,
    planned_minutes INTEGER NOT NULL DEFAULT 60 CHECK (planned_minutes > 0),
    topic           VARCHAR(250) NOT NULL,
    source_note     VARCHAR(200),
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bt_subjects_user ON public.bt_subjects(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bt_study_logs_user_date ON public.bt_study_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_bt_study_logs_date ON public.bt_study_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_bt_weekly_plans_user_date ON public.bt_weekly_plans(user_id, plan_date, start_time);

ALTER TABLE public.bt_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bt_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bt_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bt_study_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bt_weekly_plans ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
