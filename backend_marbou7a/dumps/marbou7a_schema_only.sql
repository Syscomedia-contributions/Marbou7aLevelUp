--
-- PostgreSQL database dump
--

\restrict 0zLVWrZHYtTyqQGHonACXqZFNZbO2nlxS4SGF6HazpoBuKlpFUlvbSLgWMIvKNR

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: anti_cheat_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anti_cheat_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid,
    reason text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT anti_cheat_flags_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    code text NOT NULL,
    label text NOT NULL,
    emoji text NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    key text NOT NULL,
    name text NOT NULL,
    emoji text NOT NULL,
    tagline text NOT NULL,
    subcategories jsonb DEFAULT '[]'::jsonb NOT NULL,
    theme jsonb NOT NULL,
    immersive_messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    translations jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: game_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    question_id text NOT NULL,
    choice_index integer,
    matches jsonb,
    is_correct boolean NOT NULL,
    time_ms integer,
    answered_at timestamp with time zone DEFAULT now() NOT NULL,
    tile_order jsonb,
    speed_bonus integer DEFAULT 0 NOT NULL
);


--
-- Name: game_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category_key text NOT NULL,
    question_ids text[] NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    correct_count integer DEFAULT 0 NOT NULL,
    wrong_count integer DEFAULT 0 NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL,
    level_up_bonus integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT game_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])))
);


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    code_hash text NOT NULL,
    purpose text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    attempt_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT otp_codes_purpose_check CHECK ((purpose = 'register'::text))
);


--
-- Name: player_progression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_progression (
    user_id uuid NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    per_category jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id text NOT NULL,
    category_key text NOT NULL,
    difficulty text NOT NULL,
    subcategory text NOT NULL,
    kind text DEFAULT 'mcq'::text NOT NULL,
    question text NOT NULL,
    choices jsonb,
    answer_index integer,
    image_url text,
    image_emoji text,
    pairs jsonb,
    fun_fact text NOT NULL,
    xp integer NOT NULL,
    translations jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    audio_url text,
    clues jsonb,
    puzzle_tiles jsonb
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    user_id uuid NOT NULL,
    badge_code text NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    phone_verified_at timestamp with time zone,
    password_hash text NOT NULL,
    pseudo text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    role text DEFAULT 'player'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['player'::text, 'admin'::text])))
);


--
-- Name: anti_cheat_flags anti_cheat_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anti_cheat_flags
    ADD CONSTRAINT anti_cheat_flags_pkey PRIMARY KEY (id);


--
-- Name: anti_cheat_flags anti_cheat_flags_session_id_reason_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anti_cheat_flags
    ADD CONSTRAINT anti_cheat_flags_session_id_reason_key UNIQUE (session_id, reason);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (code);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (key);


--
-- Name: game_answers game_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_answers
    ADD CONSTRAINT game_answers_pkey PRIMARY KEY (id);


--
-- Name: game_answers game_answers_session_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_answers
    ADD CONSTRAINT game_answers_session_id_question_id_key UNIQUE (session_id, question_id);


--
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: player_progression player_progression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progression
    ADD CONSTRAINT player_progression_pkey PRIMARY KEY (user_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_code);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_anti_cheat_flags_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_anti_cheat_flags_resolved ON public.anti_cheat_flags USING btree (resolved);


--
-- Name: idx_game_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_game_sessions_user ON public.game_sessions USING btree (user_id);


--
-- Name: idx_otp_codes_phone_purpose; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_codes_phone_purpose ON public.otp_codes USING btree (phone, purpose);


--
-- Name: idx_questions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_category ON public.questions USING btree (category_key);


--
-- Name: anti_cheat_flags anti_cheat_flags_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anti_cheat_flags
    ADD CONSTRAINT anti_cheat_flags_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: anti_cheat_flags anti_cheat_flags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anti_cheat_flags
    ADD CONSTRAINT anti_cheat_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: game_answers game_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_answers
    ADD CONSTRAINT game_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: game_answers game_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_answers
    ADD CONSTRAINT game_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: game_sessions game_sessions_category_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_category_key_fkey FOREIGN KEY (category_key) REFERENCES public.categories(key);


--
-- Name: game_sessions game_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: player_progression player_progression_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progression
    ADD CONSTRAINT player_progression_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: questions questions_category_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_category_key_fkey FOREIGN KEY (category_key) REFERENCES public.categories(key) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_code_fkey FOREIGN KEY (badge_code) REFERENCES public.badges(code);


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 0zLVWrZHYtTyqQGHonACXqZFNZbO2nlxS4SGF6HazpoBuKlpFUlvbSLgWMIvKNR

