

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  phone_verified_at timestamptz,
  password_hash text NOT NULL,
  pseudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('register')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_purpose ON otp_codes (phone, purpose);

CREATE TABLE IF NOT EXISTS categories (
  key text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL,
  tagline text NOT NULL,
  subcategories jsonb NOT NULL DEFAULT '[]',
  theme jsonb NOT NULL,
  immersive_messages jsonb NOT NULL DEFAULT '[]',
  translations jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS questions (
  id text PRIMARY KEY,
  category_key text NOT NULL REFERENCES categories (key) ON DELETE CASCADE,
  difficulty text NOT NULL,
  subcategory text NOT NULL,
  kind text NOT NULL DEFAULT 'mcq',
  question text NOT NULL,
  choices jsonb,
  answer_index integer,
  image_url text,
  image_emoji text,
  pairs jsonb,
  fun_fact text NOT NULL,
  xp integer NOT NULL,
  translations jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_questions_category ON questions (category_key);

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  category_key text NOT NULL REFERENCES categories (key),
  question_ids text[] NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  level_up_bonus integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions (user_id);

CREATE TABLE IF NOT EXISTS game_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES questions (id),
  choice_index integer,
  matches jsonb,
  is_correct boolean NOT NULL,
  time_ms integer,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS player_progression (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  per_category jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS badges (
  code text PRIMARY KEY,
  label text NOT NULL,
  emoji text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES badges (code),
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

INSERT INTO badges (code, label, emoji) VALUES
  ('first-quiz', 'Premier quiz', '🎯'),
  ('perfect-run', 'Sans faute', '💎'),
  ('initiation', 'Initiation', '🔰'),
  ('explorateur', 'Explorateur', '🧭'),
  ('maitre-portail', 'Maître du portail', '🌀'),
  ('ancien-supreme', 'Ancien suprême', '👑')
ON CONFLICT (code) DO NOTHING;

-- ---- Admin dashboard ------------------------------------------------------
-- schema.sql is re-run idempotently (CREATE TABLE IF NOT EXISTS only), so
-- changes to already-existing tables must use ADD COLUMN IF NOT EXISTS.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS audio_url text;
-- Progressive clues for the "whoami" kind (jsonb string array).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS clues jsonb;
-- Four tiles stored in their correct chronological order for the "puzzle" kind.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS puzzle_tiles jsonb;
-- Submitted tile order for the "puzzle" kind (mirrors `matches` for "matching").
ALTER TABLE game_answers ADD COLUMN IF NOT EXISTS tile_order jsonb;
-- Server-computed speed bonus (whoami / sound kinds), authoritative from time_ms.
ALTER TABLE game_answers ADD COLUMN IF NOT EXISTS speed_bonus integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS anti_cheat_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  UNIQUE (session_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_resolved ON anti_cheat_flags (resolved);
