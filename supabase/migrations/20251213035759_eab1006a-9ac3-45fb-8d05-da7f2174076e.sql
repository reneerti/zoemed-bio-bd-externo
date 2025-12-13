-- =====================================================
-- MIGRATION: user_person (text) -> patient_id (foreign key)
-- =====================================================

-- Step 1: Add patient_id column to tables that don't have it
ALTER TABLE public.ai_analysis_history ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);
ALTER TABLE public.supplementation ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);
ALTER TABLE public.user_goals ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);

-- Step 2: Create function to migrate data from user_person to patient_id
CREATE OR REPLACE FUNCTION public.migrate_user_person_to_patient_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient RECORD;
BEGIN
  -- For each patient, update records that match their name
  FOR v_patient IN SELECT id, name FROM public.patients LOOP
    -- Update ai_analysis_history
    UPDATE public.ai_analysis_history 
    SET patient_id = v_patient.id 
    WHERE patient_id IS NULL 
      AND (user_person = v_patient.name 
           OR user_person = lower(replace(v_patient.name, ' ', '_')));
    
    -- Update notifications
    UPDATE public.notifications 
    SET patient_id = v_patient.id 
    WHERE patient_id IS NULL 
      AND (user_person = v_patient.name 
           OR user_person = lower(replace(v_patient.name, ' ', '_')));
    
    -- Update supplementation
    UPDATE public.supplementation 
    SET patient_id = v_patient.id 
    WHERE patient_id IS NULL 
      AND (user_person = v_patient.name 
           OR user_person = lower(replace(v_patient.name, ' ', '_')));
    
    -- Update user_goals
    UPDATE public.user_goals 
    SET patient_id = v_patient.id 
    WHERE patient_id IS NULL 
      AND (user_person = v_patient.name 
           OR user_person = lower(replace(v_patient.name, ' ', '_')));
    
    -- Update user_profiles
    UPDATE public.user_profiles 
    SET patient_id = v_patient.id 
    WHERE patient_id IS NULL 
      AND (user_person = v_patient.name 
           OR user_person = lower(replace(v_patient.name, ' ', '_')));
    
    -- Update bioimpedance (already has patient_id column but may be null)
    UPDATE public.bioimpedance 
    SET patient_id = v_patient.id 
    WHERE patient_id IS NULL 
      AND (user_person::text = v_patient.name 
           OR user_person::text = lower(replace(v_patient.name, ' ', '_')));
  END LOOP;
END;
$$;

-- Step 3: Execute the migration
SELECT public.migrate_user_person_to_patient_id();

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_patient_id ON public.ai_analysis_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON public.notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_supplementation_patient_id ON public.supplementation(patient_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_patient_id ON public.user_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_patient_id ON public.user_profiles(patient_id);

-- Step 5: Drop old RLS policies that use user_person text matching
DROP POLICY IF EXISTS "Users can view their own analysis history" ON public.ai_analysis_history;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own supplementation" ON public.supplementation;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own bioimpedance by user_person" ON public.bioimpedance;

-- Step 6: Create new RLS policies using patient_id
-- AI Analysis History
CREATE POLICY "Users can view their own analysis history" 
ON public.ai_analysis_history FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients p WHERE p.id = ai_analysis_history.patient_id AND p.user_id = auth.uid())
);

-- Notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients p WHERE p.id = notifications.patient_id AND p.user_id = auth.uid())
);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE TO authenticated
USING (
  is_master(auth.uid()) OR (
    patient_id IS NOT NULL AND 
    EXISTS (SELECT 1 FROM patients p WHERE p.id = notifications.patient_id AND p.user_id = auth.uid())
  )
);

-- Supplementation
CREATE POLICY "Users can view their own supplementation" 
ON public.supplementation FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients p WHERE p.id = supplementation.patient_id AND p.user_id = auth.uid())
);

-- User Goals
CREATE POLICY "Users can view their own goals" 
ON public.user_goals FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients p WHERE p.id = user_goals.patient_id AND p.user_id = auth.uid())
);

-- User Profiles - users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients p WHERE p.id = user_profiles.patient_id AND p.user_id = auth.uid())
);

-- Admins can still view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT TO authenticated
USING (is_master(auth.uid()));

-- Bioimpedance - update to use patient_id only
CREATE POLICY "Users can view their own bioimpedance" 
ON public.bioimpedance FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients p WHERE p.id = bioimpedance.patient_id AND p.user_id = auth.uid())
);

-- Step 7: Update the notification trigger to use patient_id
CREATE OR REPLACE FUNCTION public.check_bioimpedance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_record RECORD;
  weight_change NUMERIC;
  fat_change NUMERIC;
  muscle_change NUMERIC;
  visceral_change NUMERIC;
  bmi_change NUMERIC;
  patient_name TEXT;
  v_patient_id UUID;
BEGIN
  -- Use patient_id if available, otherwise fall back to user_person matching
  v_patient_id := NEW.patient_id;
  
  IF v_patient_id IS NULL THEN
    SELECT id INTO v_patient_id FROM public.patients 
    WHERE name = NEW.user_person::text OR lower(replace(name, ' ', '_')) = NEW.user_person::text
    LIMIT 1;
  END IF;
  
  -- Get patient name for notification message
  SELECT name INTO patient_name FROM public.patients WHERE id = v_patient_id;
  IF patient_name IS NULL THEN
    patient_name := CASE WHEN NEW.user_person::text = 'reneer' THEN 'Reneer' ELSE 'Ana Paula' END;
  END IF;

  -- Get the previous record for this patient
  SELECT * INTO prev_record
  FROM public.bioimpedance
  WHERE (patient_id = v_patient_id OR user_person = NEW.user_person)
    AND id != NEW.id
  ORDER BY measurement_date DESC
  LIMIT 1;

  IF prev_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check weight change (threshold: 1kg)
  IF NEW.weight IS NOT NULL AND prev_record.weight IS NOT NULL THEN
    weight_change := NEW.weight - prev_record.weight;
    IF ABS(weight_change) >= 1 THEN
      INSERT INTO public.notifications (patient_id, user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        v_patient_id,
        NEW.user_person,
        'weight_change',
        CASE WHEN weight_change < 0 THEN '🎉 Perda de Peso!' ELSE '⚠️ Ganho de Peso' END,
        patient_name || ': ' || ABS(weight_change)::TEXT || ' kg ' || CASE WHEN weight_change < 0 THEN 'perdidos' ELSE 'ganhos' END,
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
      INSERT INTO public.notifications (patient_id, user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        v_patient_id,
        NEW.user_person,
        'fat_change',
        CASE WHEN fat_change < 0 THEN '🔥 Gordura Reduzida!' ELSE '⚠️ Aumento de Gordura' END,
        patient_name || ': ' || ABS(fat_change)::TEXT || '% de gordura ' || CASE WHEN fat_change < 0 THEN 'reduzida' ELSE 'aumentada' END,
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
      INSERT INTO public.notifications (patient_id, user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        v_patient_id,
        NEW.user_person,
        'muscle_change',
        CASE WHEN muscle_change > 0 THEN '💪 Músculo Aumentou!' ELSE '⚠️ Perda Muscular' END,
        patient_name || ': ' || ABS(muscle_change)::TEXT || '% de músculo ' || CASE WHEN muscle_change > 0 THEN 'ganho' ELSE 'perdido' END,
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
      INSERT INTO public.notifications (patient_id, user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        v_patient_id,
        NEW.user_person,
        'visceral_change',
        CASE WHEN visceral_change < 0 THEN '❤️ Gordura Visceral Reduzida!' ELSE '⚠️ Aumento de Gordura Visceral' END,
        patient_name || ': Gordura visceral ' || CASE WHEN visceral_change < 0 THEN 'reduziu' ELSE 'aumentou' END || ' ' || ABS(visceral_change)::TEXT || ' pontos',
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
      INSERT INTO public.notifications (patient_id, user_person, notification_type, title, message, metric_name, old_value, new_value, change_value, is_positive)
      VALUES (
        v_patient_id,
        NEW.user_person,
        'bmi_change',
        CASE WHEN bmi_change < 0 THEN '📉 IMC Reduziu!' ELSE '📈 IMC Aumentou' END,
        patient_name || ': IMC foi de ' || prev_record.bmi::TEXT || ' para ' || NEW.bmi::TEXT,
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

-- Step 8: Update the calculate_patient_score function to use patient_id
CREATE OR REPLACE FUNCTION public.calculate_patient_score(p_patient_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score NUMERIC := 0;
  v_weight_evolution NUMERIC := 0;
  v_fat_evolution NUMERIC := 0;
  v_muscle_evolution NUMERIC := 0;
  v_criticality TEXT := 'normal';
  v_first_record RECORD;
  v_last_record RECORD;
BEGIN
  -- Get first bioimpedance record (now using patient_id primarily)
  SELECT weight, body_fat_percent, muscle_rate_percent 
  INTO v_first_record
  FROM public.bioimpedance 
  WHERE patient_id = p_patient_id
  ORDER BY measurement_date ASC 
  LIMIT 1;
  
  -- Get last bioimpedance record
  SELECT weight, body_fat_percent, muscle_rate_percent 
  INTO v_last_record
  FROM public.bioimpedance 
  WHERE patient_id = p_patient_id
  ORDER BY measurement_date DESC 
  LIMIT 1;
  
  -- Calculate evolutions if we have both records
  IF v_first_record.weight IS NOT NULL AND v_last_record.weight IS NOT NULL THEN
    v_weight_evolution := ((v_first_record.weight - v_last_record.weight) / v_first_record.weight) * 100;
    
    IF v_first_record.body_fat_percent IS NOT NULL AND v_last_record.body_fat_percent IS NOT NULL THEN
      v_fat_evolution := v_first_record.body_fat_percent - v_last_record.body_fat_percent;
    END IF;
    
    IF v_first_record.muscle_rate_percent IS NOT NULL AND v_last_record.muscle_rate_percent IS NOT NULL THEN
      v_muscle_evolution := v_last_record.muscle_rate_percent - v_first_record.muscle_rate_percent;
    END IF;
    
    v_score := (v_weight_evolution * 40) + (v_fat_evolution * 35) + (v_muscle_evolution * 25);
    
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

-- Step 9: Update trigger_update_patient_score to use patient_id
CREATE OR REPLACE FUNCTION public.trigger_update_patient_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Use patient_id directly if available
  v_patient_id := NEW.patient_id;
  
  -- Fallback to finding by user_person if patient_id is null
  IF v_patient_id IS NULL THEN
    SELECT id INTO v_patient_id 
    FROM public.patients 
    WHERE name::text = NEW.user_person::text 
       OR LOWER(REPLACE(name, ' ', '_')) = NEW.user_person::text
    LIMIT 1;
  END IF;
  
  IF v_patient_id IS NOT NULL THEN
    PERFORM public.calculate_patient_score(v_patient_id);
    PERFORM public.update_leaderboard_rankings();
  END IF;
  
  RETURN NEW;
END;
$$;