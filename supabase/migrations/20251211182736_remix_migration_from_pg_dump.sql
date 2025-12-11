CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'viewer'
);


--
-- Name: user_person; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_person AS ENUM (
    'reneer',
    'ana_paula'
);


--
-- Name: calculate_patient_score(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_patient_score(p_patient_id uuid) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_score NUMERIC := 0;
  v_weight_evolution NUMERIC := 0;
  v_fat_evolution NUMERIC := 0;
  v_muscle_evolution NUMERIC := 0;
  v_criticality TEXT := 'normal';
  v_first_record RECORD;
  v_last_record RECORD;
  v_patient_name TEXT;
BEGIN
  -- Get patient name
  SELECT name INTO v_patient_name FROM public.patients WHERE id = p_patient_id;
  
  -- Get first bioimpedance record
  SELECT weight, body_fat_percent, muscle_rate_percent 
  INTO v_first_record
  FROM public.bioimpedance 
  WHERE patient_id = p_patient_id 
     OR user_person::text = v_patient_name 
     OR user_person::text = LOWER(REPLACE(v_patient_name, ' ', '_'))
  ORDER BY measurement_date ASC 
  LIMIT 1;
  
  -- Get last bioimpedance record
  SELECT weight, body_fat_percent, muscle_rate_percent 
  INTO v_last_record
  FROM public.bioimpedance 
  WHERE patient_id = p_patient_id 
     OR user_person::text = v_patient_name 
     OR user_person::text = LOWER(REPLACE(v_patient_name, ' ', '_'))
  ORDER BY measurement_date DESC 
  LIMIT 1;
  
  -- Calculate evolutions if we have both records
  IF v_first_record.weight IS NOT NULL AND v_last_record.weight IS NOT NULL THEN
    -- Weight evolution (positive = weight loss = good)
    v_weight_evolution := ((v_first_record.weight - v_last_record.weight) / v_first_record.weight) * 100;
    
    -- Fat evolution (positive = fat loss = good)
    IF v_first_record.body_fat_percent IS NOT NULL AND v_last_record.body_fat_percent IS NOT NULL THEN
      v_fat_evolution := v_first_record.body_fat_percent - v_last_record.body_fat_percent;
    END IF;
    
    -- Muscle evolution (positive = muscle gain = good)
    IF v_first_record.muscle_rate_percent IS NOT NULL AND v_last_record.muscle_rate_percent IS NOT NULL THEN
      v_muscle_evolution := v_last_record.muscle_rate_percent - v_first_record.muscle_rate_percent;
    END IF;
    
    -- Calculate score: weighted sum of evolutions
    v_score := (v_weight_evolution * 40) + (v_fat_evolution * 35) + (v_muscle_evolution * 25);
    
    -- Determine criticality based on score
    IF v_score >= 50 THEN
      v_criticality := 'healthy';
    ELSIF v_score >= 20 THEN
      v_criticality := 'normal';
    ELSIF v_score >= 0 THEN
      v_criticality := 'attention';
    ELSE
      v_criticality := 'critical';
    END IF;
  END IF;
  
  -- Upsert the score
  INSERT INTO public.patient_scores (patient_id, score, weight_evolution, fat_evolution, muscle_evolution, criticality, last_calculated_at)
  VALUES (p_patient_id, v_score, v_weight_evolution, v_fat_evolution, v_muscle_evolution, v_criticality, now())
  ON CONFLICT (patient_id) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    weight_evolution = EXCLUDED.weight_evolution,
    fat_evolution = EXCLUDED.fat_evolution,
    muscle_evolution = EXCLUDED.muscle_evolution,
    criticality = EXCLUDED.criticality,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = now();
  
  RETURN v_score;
END;
$$;


--
-- Name: check_bioimpedance_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_bioimpedance_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  prev_record RECORD;
  weight_change NUMERIC;
  fat_change NUMERIC;
  muscle_change NUMERIC;
  visceral_change NUMERIC;
  bmi_change NUMERIC;
  user_name TEXT;
BEGIN
  -- Get the previous record for this user
  SELECT * INTO prev_record
  FROM public.bioimpedance
  WHERE user_person = NEW.user_person
    AND id != NEW.id
  ORDER BY measurement_date DESC
  LIMIT 1;

  -- If no previous record, skip
  IF prev_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Set user name
  user_name := CASE WHEN NEW.user_person = 'reneer' THEN 'Reneer' ELSE 'Ana Paula' END;

  -- Check weight change (threshold: 1kg)
  IF NEW.weight IS NOT NULL AND prev_record.weight IS NOT NULL THEN
    weight_change := NEW.weight - prev_record.weight;
    IF ABS(weight_change) >= 1 THEN
      INSERT INTO public.notifications (user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        NEW.user_person,
        'weight_change',
        CASE WHEN weight_change < 0 THEN '🎉 Perda de Peso!' ELSE '⚠️ Ganho de Peso' END,
        user_name || ': ' || ABS(weight_change)::TEXT || ' kg ' || CASE WHEN weight_change < 0 THEN 'perdidos' ELSE 'ganhos' END,
        'Peso',
        prev_record.weight,
        NEW.weight,
        weight_change,
        weight_change < 0
      );
    END IF;
  END IF;

  -- Check fat percentage change (threshold: 0.5%)
  IF NEW.body_fat_percent IS NOT NULL AND prev_record.body_fat_percent IS NOT NULL THEN
    fat_change := NEW.body_fat_percent - prev_record.body_fat_percent;
    IF ABS(fat_change) >= 0.5 THEN
      INSERT INTO public.notifications (user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        NEW.user_person,
        'fat_change',
        CASE WHEN fat_change < 0 THEN '🔥 Gordura Reduzida!' ELSE '⚠️ Aumento de Gordura' END,
        user_name || ': ' || ABS(fat_change)::TEXT || '% de gordura ' || CASE WHEN fat_change < 0 THEN 'reduzida' ELSE 'aumentada' END,
        'Gordura Corporal',
        prev_record.body_fat_percent,
        NEW.body_fat_percent,
        fat_change,
        fat_change < 0
      );
    END IF;
  END IF;

  -- Check muscle percentage change (threshold: 0.5%)
  IF NEW.muscle_rate_percent IS NOT NULL AND prev_record.muscle_rate_percent IS NOT NULL THEN
    muscle_change := NEW.muscle_rate_percent - prev_record.muscle_rate_percent;
    IF ABS(muscle_change) >= 0.5 THEN
      INSERT INTO public.notifications (user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        NEW.user_person,
        'muscle_change',
        CASE WHEN muscle_change > 0 THEN '💪 Músculo Aumentou!' ELSE '⚠️ Perda Muscular' END,
        user_name || ': ' || ABS(muscle_change)::TEXT || '% de músculo ' || CASE WHEN muscle_change > 0 THEN 'ganho' ELSE 'perdido' END,
        'Taxa Muscular',
        prev_record.muscle_rate_percent,
        NEW.muscle_rate_percent,
        muscle_change,
        muscle_change > 0
      );
    END IF;
  END IF;

  -- Check visceral fat change (threshold: 1)
  IF NEW.visceral_fat IS NOT NULL AND prev_record.visceral_fat IS NOT NULL THEN
    visceral_change := NEW.visceral_fat - prev_record.visceral_fat;
    IF ABS(visceral_change) >= 1 THEN
      INSERT INTO public.notifications (user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        NEW.user_person,
        'visceral_change',
        CASE WHEN visceral_change < 0 THEN '❤️ Gordura Visceral Reduzida!' ELSE '⚠️ Aumento de Gordura Visceral' END,
        user_name || ': Gordura visceral ' || CASE WHEN visceral_change < 0 THEN 'reduziu' ELSE 'aumentou' END || ' ' || ABS(visceral_change)::TEXT || ' pontos',
        'Gordura Visceral',
        prev_record.visceral_fat,
        NEW.visceral_fat,
        visceral_change,
        visceral_change < 0
      );
    END IF;
  END IF;

  -- Check BMI milestone changes (every 1 point)
  IF NEW.bmi IS NOT NULL AND prev_record.bmi IS NOT NULL THEN
    bmi_change := NEW.bmi - prev_record.bmi;
    IF ABS(bmi_change) >= 1 THEN
      INSERT INTO public.notifications (user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        NEW.user_person,
        'bmi_change',
        CASE WHEN bmi_change < 0 THEN '📉 IMC Reduziu!' ELSE '📈 IMC Aumentou' END,
        user_name || ': IMC foi de ' || prev_record.bmi::TEXT || ' para ' || NEW.bmi::TEXT,
        'IMC',
        prev_record.bmi,
        NEW.bmi,
        bmi_change,
        bmi_change < 0
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: get_leaderboard_top3(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_leaderboard_top3() RETURNS TABLE(rank_position integer, patient_name text, score numeric)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT 
    ps.rank_position,
    p.name AS patient_name,
    ps.score
  FROM public.patient_scores ps
  JOIN public.patients p ON p.id = ps.patient_id
  WHERE ps.rank_position <= 3
  ORDER BY ps.rank_position ASC;
$$;


--
-- Name: get_user_person_for_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_person_for_user(_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.name FROM public.patients p WHERE p.user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_master(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_master(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;


--
-- Name: trigger_update_patient_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_patient_score() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Find patient_id from patient_id column or user_person match
  IF NEW.patient_id IS NOT NULL THEN
    v_patient_id := NEW.patient_id;
  ELSE
    SELECT id INTO v_patient_id 
    FROM public.patients 
    WHERE name::text = NEW.user_person::text 
       OR LOWER(REPLACE(name, ' ', '_')) = NEW.user_person::text
    LIMIT 1;
  END IF;
  
  -- Calculate score for this patient
  IF v_patient_id IS NOT NULL THEN
    PERFORM public.calculate_patient_score(v_patient_id);
    PERFORM public.update_leaderboard_rankings();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_leaderboard_rankings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_leaderboard_rankings() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update rank positions based on score (highest score = rank 1)
  UPDATE public.patient_scores ps
  SET rank_position = ranked.new_rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
    FROM public.patient_scores
  ) ranked
  WHERE ps.id = ranked.id;
END;
$$;


--
-- Name: update_user_profiles_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_profiles_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: ai_analysis_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_analysis_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_person text NOT NULL,
    analysis_date timestamp with time zone DEFAULT now() NOT NULL,
    summary text NOT NULL,
    full_analysis text NOT NULL,
    weight_at_analysis numeric,
    bmi_at_analysis numeric,
    fat_at_analysis numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bioimpedance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bioimpedance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_person public.user_person NOT NULL,
    measurement_date date NOT NULL,
    week_number integer,
    monjaro_dose numeric(4,2),
    status text,
    weight numeric(5,2),
    bmi numeric(4,2),
    body_fat_percent numeric(4,2),
    fat_mass numeric(5,2),
    lean_mass numeric(5,2),
    muscle_mass numeric(5,2),
    muscle_rate_percent numeric(4,2),
    skeletal_muscle_percent numeric(4,2),
    bone_mass numeric(4,2),
    protein_mass numeric(4,2),
    protein_percent numeric(4,2),
    body_water_percent numeric(4,2),
    moisture_content numeric(5,2),
    subcutaneous_fat_percent numeric(4,2),
    visceral_fat numeric(4,2),
    bmr integer,
    metabolic_age integer,
    whr numeric(4,3),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    patient_id uuid
);


--
-- Name: custom_fields_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_fields_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_name text NOT NULL,
    field_label text NOT NULL,
    field_type text NOT NULL,
    options jsonb,
    is_required boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_fields_config_field_type_check CHECK ((field_type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'textarea'::text])))
);


--
-- Name: monjaro_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monjaro_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    dose numeric NOT NULL,
    application_date date NOT NULL,
    week_number integer,
    notes text,
    side_effects text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_person text NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    metric_name text,
    old_value numeric,
    new_value numeric,
    change_value numeric,
    is_positive boolean DEFAULT true,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    score numeric DEFAULT 0 NOT NULL,
    weight_evolution numeric DEFAULT 0,
    fat_evolution numeric DEFAULT 0,
    muscle_evolution numeric DEFAULT 0,
    criticality text DEFAULT 'normal'::text,
    rank_position integer,
    last_calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_scores_criticality_check CHECK ((criticality = ANY (ARRAY['healthy'::text, 'normal'::text, 'attention'::text, 'critical'::text])))
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    created_by uuid,
    name text NOT NULL,
    email text,
    phone text,
    birth_date date,
    gender text,
    height numeric,
    address text,
    medical_notes text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patients_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT patients_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])))
);


--
-- Name: supplementation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplementation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_person text NOT NULL,
    supplement_name text NOT NULL,
    dosage text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_person text NOT NULL,
    target_weight numeric,
    target_body_fat numeric,
    target_muscle numeric,
    target_visceral_fat numeric,
    target_bmi numeric,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_person text NOT NULL,
    avatar_url text,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_profiles_user_person_check CHECK ((user_person = ANY (ARRAY['reneer'::text, 'ana_paula'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'viewer'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_analysis_history ai_analysis_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analysis_history
    ADD CONSTRAINT ai_analysis_history_pkey PRIMARY KEY (id);


--
-- Name: bioimpedance bioimpedance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bioimpedance
    ADD CONSTRAINT bioimpedance_pkey PRIMARY KEY (id);


--
-- Name: custom_fields_config custom_fields_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_fields_config
    ADD CONSTRAINT custom_fields_config_pkey PRIMARY KEY (id);


--
-- Name: monjaro_treatments monjaro_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monjaro_treatments
    ADD CONSTRAINT monjaro_treatments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: patient_scores patient_scores_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_scores
    ADD CONSTRAINT patient_scores_patient_id_key UNIQUE (patient_id);


--
-- Name: patient_scores patient_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_scores
    ADD CONSTRAINT patient_scores_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: supplementation supplementation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplementation
    ADD CONSTRAINT supplementation_pkey PRIMARY KEY (id);


--
-- Name: user_goals user_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_goals
    ADD CONSTRAINT user_goals_pkey PRIMARY KEY (id);


--
-- Name: user_goals user_goals_user_person_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_goals
    ADD CONSTRAINT user_goals_user_person_key UNIQUE (user_person);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_person_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_person_key UNIQUE (user_person);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_ai_analysis_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_analysis_user_date ON public.ai_analysis_history USING btree (user_person, analysis_date DESC);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_person, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_date ON public.notifications USING btree (user_person, created_at DESC);


--
-- Name: idx_user_goals_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_goals_person ON public.user_goals USING btree (user_person);


--
-- Name: bioimpedance trigger_bioimpedance_score_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_bioimpedance_score_update AFTER INSERT OR UPDATE ON public.bioimpedance FOR EACH ROW EXECUTE FUNCTION public.trigger_update_patient_score();


--
-- Name: bioimpedance trigger_check_bioimpedance_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_bioimpedance_changes AFTER INSERT ON public.bioimpedance FOR EACH ROW EXECUTE FUNCTION public.check_bioimpedance_changes();


--
-- Name: monjaro_treatments update_monjaro_treatments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_monjaro_treatments_updated_at BEFORE UPDATE ON public.monjaro_treatments FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: patients update_patients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: supplementation update_supplementation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplementation_updated_at BEFORE UPDATE ON public.supplementation FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: bioimpedance bioimpedance_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bioimpedance
    ADD CONSTRAINT bioimpedance_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: monjaro_treatments monjaro_treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monjaro_treatments
    ADD CONSTRAINT monjaro_treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_scores patient_scores_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_scores
    ADD CONSTRAINT patient_scores_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patients patients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: patients patients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: custom_fields_config Admins and master can manage custom fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and master can manage custom fields" ON public.custom_fields_config USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_profiles Authenticated users can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read profiles" ON public.user_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: patient_scores Authenticated users can view top 3 scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view top 3 scores" ON public.patient_scores FOR SELECT TO authenticated USING ((rank_position <= 3));


--
-- Name: custom_fields_config Everyone can read custom fields config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can read custom fields config" ON public.custom_fields_config FOR SELECT USING (true);


--
-- Name: user_goals Master can delete goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can delete goals" ON public.user_goals FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: notifications Master can delete notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can delete notifications" ON public.notifications FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: patients Master can delete patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can delete patients" ON public.patients FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: patient_scores Master can delete scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can delete scores" ON public.patient_scores FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: supplementation Master can delete supplementation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can delete supplementation" ON public.supplementation FOR DELETE USING (public.is_master(auth.uid()));


--
-- Name: monjaro_treatments Master can do everything on monjaro_treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can do everything on monjaro_treatments" ON public.monjaro_treatments USING (public.is_master(auth.uid()));


--
-- Name: user_goals Master can insert goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can insert goals" ON public.user_goals FOR INSERT WITH CHECK (public.is_master(auth.uid()));


--
-- Name: patients Master can insert patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can insert patients" ON public.patients FOR INSERT WITH CHECK (public.is_master(auth.uid()));


--
-- Name: patient_scores Master can insert scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can insert scores" ON public.patient_scores FOR INSERT WITH CHECK (public.is_master(auth.uid()));


--
-- Name: supplementation Master can insert supplementation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can insert supplementation" ON public.supplementation FOR INSERT WITH CHECK (public.is_master(auth.uid()));


--
-- Name: patients Master can update all patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can update all patients" ON public.patients FOR UPDATE USING (public.is_master(auth.uid()));


--
-- Name: user_goals Master can update goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can update goals" ON public.user_goals FOR UPDATE USING (public.is_master(auth.uid()));


--
-- Name: patient_scores Master can update scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can update scores" ON public.patient_scores FOR UPDATE USING (public.is_master(auth.uid()));


--
-- Name: supplementation Master can update supplementation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can update supplementation" ON public.supplementation FOR UPDATE USING (public.is_master(auth.uid()));


--
-- Name: ai_analysis_history Master can view all analysis history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all analysis history" ON public.ai_analysis_history FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: bioimpedance Master can view all bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all bioimpedance" ON public.bioimpedance FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: user_goals Master can view all goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all goals" ON public.user_goals FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: notifications Master can view all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all notifications" ON public.notifications FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: patient_scores Master can view all patient scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all patient scores" ON public.patient_scores FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: patients Master can view all patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all patients" ON public.patients FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: supplementation Master can view all supplementation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all supplementation" ON public.supplementation FOR SELECT USING (public.is_master(auth.uid()));


--
-- Name: ai_analysis_history Only admins can delete analysis history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete analysis history" ON public.ai_analysis_history FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bioimpedance Only admins can delete bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete bioimpedance" ON public.bioimpedance FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_analysis_history Only admins can insert analysis history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert analysis history" ON public.ai_analysis_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bioimpedance Only admins can insert bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert bioimpedance" ON public.bioimpedance FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_profiles Only admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bioimpedance Only admins can update bioimpedance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update bioimpedance" ON public.bioimpedance FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_profiles Only admins can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update profiles" ON public.user_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: bioimpedance Users can insert their own bioimpedance via patient; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bioimpedance via patient" ON public.bioimpedance FOR INSERT WITH CHECK (((patient_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.patients
  WHERE ((patients.id = bioimpedance.patient_id) AND (patients.user_id = auth.uid()))))));


--
-- Name: monjaro_treatments Users can insert their own monjaro treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own monjaro treatments" ON public.monjaro_treatments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.patients
  WHERE ((patients.id = monjaro_treatments.patient_id) AND (patients.user_id = auth.uid())))));


--
-- Name: patients Users can insert their own patient record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own patient record" ON public.patients FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: patients Users can update only their own patient record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update only their own patient record" ON public.patients FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: monjaro_treatments Users can update their own monjaro treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own monjaro treatments" ON public.monjaro_treatments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.patients
  WHERE ((patients.id = monjaro_treatments.patient_id) AND (patients.user_id = auth.uid())))));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((public.is_master(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.user_id = auth.uid()) AND ((p.name = notifications.user_person) OR (lower(replace(p.name, ' '::text, '_'::text)) = notifications.user_person)))))));


--
-- Name: patients Users can view only their own patient record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view only their own patient record" ON public.patients FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: ai_analysis_history Users can view their own analysis history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own analysis history" ON public.ai_analysis_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.user_id = auth.uid()) AND ((p.name = ai_analysis_history.user_person) OR (lower(replace(p.name, ' '::text, '_'::text)) = ai_analysis_history.user_person))))));


--
-- Name: bioimpedance Users can view their own bioimpedance by user_person; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bioimpedance by user_person" ON public.bioimpedance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.user_id = auth.uid()) AND ((p.name = (bioimpedance.user_person)::text) OR (lower(replace(p.name, ' '::text, '_'::text)) = (bioimpedance.user_person)::text))))));


--
-- Name: bioimpedance Users can view their own bioimpedance via patient; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bioimpedance via patient" ON public.bioimpedance FOR SELECT USING (((patient_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.patients
  WHERE ((patients.id = bioimpedance.patient_id) AND (patients.user_id = auth.uid()))))));


--
-- Name: user_goals Users can view their own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own goals" ON public.user_goals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.user_id = auth.uid()) AND ((p.name = user_goals.user_person) OR (lower(replace(p.name, ' '::text, '_'::text)) = user_goals.user_person))))));


--
-- Name: monjaro_treatments Users can view their own monjaro treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own monjaro treatments" ON public.monjaro_treatments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients
  WHERE ((patients.id = monjaro_treatments.patient_id) AND (patients.user_id = auth.uid())))));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.user_id = auth.uid()) AND ((p.name = notifications.user_person) OR (lower(replace(p.name, ' '::text, '_'::text)) = notifications.user_person))))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: patient_scores Users can view their own score; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own score" ON public.patient_scores FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.id = patient_scores.patient_id) AND (p.user_id = auth.uid())))));


--
-- Name: supplementation Users can view their own supplementation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own supplementation" ON public.supplementation FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.user_id = auth.uid()) AND ((p.name = supplementation.user_person) OR (lower(replace(p.name, ' '::text, '_'::text)) = supplementation.user_person))))));


--
-- Name: ai_analysis_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_analysis_history ENABLE ROW LEVEL SECURITY;

--
-- Name: bioimpedance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bioimpedance ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_fields_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_fields_config ENABLE ROW LEVEL SECURITY;

--
-- Name: monjaro_treatments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monjaro_treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: supplementation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplementation ENABLE ROW LEVEL SECURITY;

--
-- Name: user_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


