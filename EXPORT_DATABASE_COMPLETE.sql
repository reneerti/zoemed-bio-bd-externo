-- ============================================================
-- ZOEMED_BIO - EXPORTAÇÃO COMPLETA DO BANCO DE DADOS
-- Data: 2024-12-14
-- Versão: 2.0 (com rotação de chaves e histórico)
-- ============================================================

-- NOTA: Execute este script em um projeto Supabase novo
-- Ordem de execução é importante para foreign keys

-- ============================================================
-- SEÇÃO 1: ENUMS
-- ============================================================

CREATE TYPE public.user_person AS ENUM ('reneer', 'ana_paula');
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- ============================================================
-- SEÇÃO 2: TABELAS PRINCIPAIS
-- ============================================================

-- Tabela de Pacientes
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  height NUMERIC,
  address TEXT,
  medical_notes TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  user_id UUID,
  created_by UUID,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Bioimpedância
CREATE TABLE public.bioimpedance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  user_person public.user_person NOT NULL,
  measurement_date DATE NOT NULL,
  week_number INTEGER,
  monjaro_dose NUMERIC,
  status TEXT,
  weight NUMERIC,
  bmi NUMERIC,
  body_fat_percent NUMERIC,
  fat_mass NUMERIC,
  lean_mass NUMERIC,
  muscle_mass NUMERIC,
  muscle_rate_percent NUMERIC,
  skeletal_muscle_percent NUMERIC,
  bone_mass NUMERIC,
  protein_mass NUMERIC,
  protein_percent NUMERIC,
  body_water_percent NUMERIC,
  moisture_content NUMERIC,
  subcutaneous_fat_percent NUMERIC,
  visceral_fat NUMERIC,
  bmr INTEGER,
  metabolic_age INTEGER,
  whr NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Histórico de Análises IA
CREATE TABLE public.ai_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  user_person TEXT NOT NULL,
  analysis_date TIMESTAMPTZ DEFAULT now(),
  summary TEXT NOT NULL,
  full_analysis TEXT NOT NULL,
  weight_at_analysis NUMERIC,
  bmi_at_analysis NUMERIC,
  fat_at_analysis NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Scores (Gamificação)
CREATE TABLE public.patient_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID UNIQUE REFERENCES public.patients(id),
  score NUMERIC DEFAULT 0,
  weight_evolution NUMERIC DEFAULT 0,
  fat_evolution NUMERIC DEFAULT 0,
  muscle_evolution NUMERIC DEFAULT 0,
  criticality TEXT DEFAULT 'normal',
  rank_position INTEGER,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela de Notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  user_person TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric_name TEXT,
  old_value NUMERIC,
  new_value NUMERIC,
  change_value NUMERIC,
  is_positive BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Metas
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  user_person TEXT NOT NULL,
  target_weight NUMERIC,
  target_body_fat NUMERIC,
  target_muscle NUMERIC,
  target_bmi NUMERIC,
  target_visceral_fat NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Suplementação
CREATE TABLE public.supplementation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  user_person TEXT NOT NULL,
  supplement_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Perfis de Usuário
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  user_person TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Tratamentos Monjaro
CREATE TABLE public.monjaro_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  application_date DATE NOT NULL,
  dose NUMERIC NOT NULL,
  week_number INTEGER,
  notes TEXT,
  side_effects TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Configurações de API
CREATE TABLE public.api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  config_value TEXT,
  provider TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Histórico de Chaves de API
CREATE TABLE public.api_key_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.api_configurations(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  provider TEXT,
  rotated_at TIMESTAMPTZ DEFAULT now(),
  rotated_by UUID,
  rotation_reason TEXT,
  version_number INTEGER DEFAULT 1
);

-- Tabela de Logs de Uso de API
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id),
  tokens_used INTEGER,
  estimated_cost NUMERIC DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  request_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Extrações OCR Raw
CREATE TABLE public.raw_ocr_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id),
  image_url TEXT,
  raw_text TEXT,
  extraction_method TEXT,
  extraction_status TEXT DEFAULT 'pending',
  parsed_data JSONB,
  ai_processed BOOLEAN DEFAULT false,
  processing_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Campos Customizados
CREATE TABLE public.custom_fields_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEÇÃO 3: ÍNDICES
-- ============================================================

CREATE INDEX idx_bioimpedance_patient_id ON public.bioimpedance(patient_id);
CREATE INDEX idx_bioimpedance_measurement_date ON public.bioimpedance(measurement_date DESC);
CREATE INDEX idx_bioimpedance_user_person ON public.bioimpedance(user_person);
CREATE INDEX idx_notifications_patient_id ON public.notifications(patient_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_ai_analysis_patient_id ON public.ai_analysis_history(patient_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_api_key_history_config_id ON public.api_key_history(config_id);
CREATE INDEX idx_api_key_history_rotated_at ON public.api_key_history(rotated_at DESC);

-- ============================================================
-- SEÇÃO 4: FUNÇÕES
-- ============================================================

-- Função para verificar se usuário é master/admin
CREATE OR REPLACE FUNCTION public.is_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Função para verificar role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para obter user_person pelo user_id
CREATE OR REPLACE FUNCTION public.get_user_person_for_user(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name FROM public.patients p WHERE p.user_id = _user_id LIMIT 1
$$;

-- Função para calcular score do paciente
CREATE OR REPLACE FUNCTION public.calculate_patient_score(p_patient_id UUID)
RETURNS NUMERIC
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
  SELECT weight, body_fat_percent, muscle_rate_percent 
  INTO v_first_record
  FROM public.bioimpedance 
  WHERE patient_id = p_patient_id
  ORDER BY measurement_date ASC 
  LIMIT 1;
  
  SELECT weight, body_fat_percent, muscle_rate_percent 
  INTO v_last_record
  FROM public.bioimpedance 
  WHERE patient_id = p_patient_id
  ORDER BY measurement_date DESC 
  LIMIT 1;
  
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

-- Função para atualizar rankings do leaderboard
CREATE OR REPLACE FUNCTION public.update_leaderboard_rankings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.patient_scores ps
  SET rank_position = ranked.new_rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
    FROM public.patient_scores
  ) ranked
  WHERE ps.id = ranked.id;
END;
$$;

-- Função para obter top 3 do leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard_top3()
RETURNS TABLE(rank_position INTEGER, patient_name TEXT, score NUMERIC)
LANGUAGE sql
STABLE
SET search_path = public
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

-- Trigger function para atualizar score após bioimpedância
CREATE OR REPLACE FUNCTION public.trigger_update_patient_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  v_patient_id := NEW.patient_id;
  
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

-- Trigger function para gerar notificações de mudanças
CREATE OR REPLACE FUNCTION public.check_bioimpedance_changes()
RETURNS TRIGGER
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
  v_patient_id := NEW.patient_id;
  
  IF v_patient_id IS NULL THEN
    SELECT id INTO v_patient_id FROM public.patients 
    WHERE name = NEW.user_person::text OR lower(replace(name, ' ', '_')) = NEW.user_person::text
    LIMIT 1;
  END IF;
  
  SELECT name INTO patient_name FROM public.patients WHERE id = v_patient_id;
  IF patient_name IS NULL THEN
    patient_name := CASE WHEN NEW.user_person::text = 'reneer' THEN 'Reneer' ELSE 'Ana Paula' END;
  END IF;

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

  RETURN NEW;
END;
$$;

-- ============================================================
-- SEÇÃO 5: TRIGGERS
-- ============================================================

CREATE TRIGGER trigger_bioimpedance_score
  AFTER INSERT OR UPDATE ON public.bioimpedance
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_patient_score();

CREATE TRIGGER trigger_bioimpedance_notifications
  AFTER INSERT ON public.bioimpedance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_bioimpedance_changes();

-- ============================================================
-- SEÇÃO 6: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bioimpedance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplementation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monjaro_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields_config ENABLE ROW LEVEL SECURITY;

-- Políticas para PATIENTS
CREATE POLICY "Master can view all patients" ON public.patients FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Master can insert patients" ON public.patients FOR INSERT WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Master can update all patients" ON public.patients FOR UPDATE USING (is_master(auth.uid()));
CREATE POLICY "Master can delete patients" ON public.patients FOR DELETE USING (is_master(auth.uid()));
CREATE POLICY "Users can view only their own patient record" ON public.patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update only their own patient record" ON public.patients FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own patient record" ON public.patients FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas para BIOIMPEDANCE
CREATE POLICY "Master can view all bioimpedance" ON public.bioimpedance FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Only admins can insert bioimpedance" ON public.bioimpedance FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update bioimpedance" ON public.bioimpedance FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete bioimpedance" ON public.bioimpedance FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own bioimpedance via patient" ON public.bioimpedance FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients WHERE patients.id = bioimpedance.patient_id AND patients.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert their own bioimpedance via patient" ON public.bioimpedance FOR INSERT WITH CHECK (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients WHERE patients.id = bioimpedance.patient_id AND patients.user_id = auth.uid()
  )
);

-- Políticas para AI_ANALYSIS_HISTORY
CREATE POLICY "Master can view all analysis history" ON public.ai_analysis_history FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Only admins can insert analysis history" ON public.ai_analysis_history FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete analysis history" ON public.ai_analysis_history FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own analysis history" ON public.ai_analysis_history FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients p WHERE p.id = ai_analysis_history.patient_id AND p.user_id = auth.uid()
  )
);

-- Políticas para PATIENT_SCORES
CREATE POLICY "Master can view all patient scores" ON public.patient_scores FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Master can insert scores" ON public.patient_scores FOR INSERT WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Master can update scores" ON public.patient_scores FOR UPDATE USING (is_master(auth.uid()));
CREATE POLICY "Master can delete scores" ON public.patient_scores FOR DELETE USING (is_master(auth.uid()));
CREATE POLICY "Users can view their own score" ON public.patient_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_scores.patient_id AND p.user_id = auth.uid())
);
CREATE POLICY "Authenticated users can view top 3 scores" ON public.patient_scores FOR SELECT USING (rank_position <= 3);

-- Políticas para USER_ROLES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin')
);

-- Políticas para NOTIFICATIONS
CREATE POLICY "Master can view all notifications" ON public.notifications FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Only admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Master can delete notifications" ON public.notifications FOR DELETE USING (is_master(auth.uid()));
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients p WHERE p.id = notifications.patient_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (
  is_master(auth.uid()) OR (
    patient_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM patients p WHERE p.id = notifications.patient_id AND p.user_id = auth.uid()
    )
  )
);

-- Políticas para USER_GOALS
CREATE POLICY "Master can view all goals" ON public.user_goals FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Master can insert goals" ON public.user_goals FOR INSERT WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Master can update goals" ON public.user_goals FOR UPDATE USING (is_master(auth.uid()));
CREATE POLICY "Master can delete goals" ON public.user_goals FOR DELETE USING (is_master(auth.uid()));
CREATE POLICY "Users can view their own goals" ON public.user_goals FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients p WHERE p.id = user_goals.patient_id AND p.user_id = auth.uid()
  )
);

-- Políticas para SUPPLEMENTATION
CREATE POLICY "Master can view all supplementation" ON public.supplementation FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Master can insert supplementation" ON public.supplementation FOR INSERT WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Master can update supplementation" ON public.supplementation FOR UPDATE USING (is_master(auth.uid()));
CREATE POLICY "Master can delete supplementation" ON public.supplementation FOR DELETE USING (is_master(auth.uid()));
CREATE POLICY "Users can view their own supplementation" ON public.supplementation FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients p WHERE p.id = supplementation.patient_id AND p.user_id = auth.uid()
  )
);

-- Políticas para API_CONFIGURATIONS
CREATE POLICY "Master can manage API configurations" ON public.api_configurations FOR ALL USING (is_master(auth.uid()));

-- Políticas para API_KEY_HISTORY
CREATE POLICY "Only admins can view key history" ON public.api_key_history FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Only admins can insert key history" ON public.api_key_history FOR INSERT WITH CHECK (is_master(auth.uid()));

-- Políticas para API_USAGE_LOGS
CREATE POLICY "Master can view all API logs" ON public.api_usage_logs FOR ALL USING (is_master(auth.uid()));

-- Políticas para RAW_OCR_EXTRACTIONS
CREATE POLICY "Master can view all OCR extractions" ON public.raw_ocr_extractions FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Master can insert OCR extractions" ON public.raw_ocr_extractions FOR INSERT WITH CHECK (is_master(auth.uid()));
CREATE POLICY "Master can update OCR extractions" ON public.raw_ocr_extractions FOR UPDATE USING (is_master(auth.uid()));
CREATE POLICY "Master can delete OCR extractions" ON public.raw_ocr_extractions FOR DELETE USING (is_master(auth.uid()));

-- Políticas para CUSTOM_FIELDS_CONFIG
CREATE POLICY "Everyone can read custom fields config" ON public.custom_fields_config FOR SELECT USING (true);
CREATE POLICY "Admins and master can manage custom fields" ON public.custom_fields_config FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Políticas para USER_PROFILES
CREATE POLICY "Admins can view all profiles" ON public.user_profiles FOR SELECT USING (is_master(auth.uid()));
CREATE POLICY "Only admins can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update profiles" ON public.user_profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (
  patient_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM patients p WHERE p.id = user_profiles.patient_id AND p.user_id = auth.uid()
  )
);

-- Políticas para MONJARO_TREATMENTS
CREATE POLICY "Master can do everything on monjaro_treatments" ON public.monjaro_treatments FOR ALL USING (is_master(auth.uid()));
CREATE POLICY "Users can view their own monjaro treatments" ON public.monjaro_treatments FOR SELECT USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = monjaro_treatments.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Users can insert their own monjaro treatments" ON public.monjaro_treatments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = monjaro_treatments.patient_id AND patients.user_id = auth.uid())
);
CREATE POLICY "Users can update their own monjaro treatments" ON public.monjaro_treatments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM patients WHERE patients.id = monjaro_treatments.patient_id AND patients.user_id = auth.uid())
);

-- ============================================================
-- SEÇÃO 7: STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('bioimpedance-images', 'bioimpedance-images', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bioimpedance-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'bioimpedance-images' AND auth.role() = 'authenticated');

-- ============================================================
-- SEÇÃO 8: CONFIGURAÇÕES INICIAIS
-- ============================================================

-- Configurações padrão de API/OCR
INSERT INTO public.api_configurations (config_key, config_value, provider, is_active, priority) VALUES
('ocr_primary', 'lovable_gateway', 'lovable', true, 1),
('ocr_fallback_1', 'regex_only', 'system', true, 2),
('ai_primary', 'gemini-2.5-flash', 'lovable', true, 1),
('ai_fallback_1', 'template_only', 'system', true, 2),
('cost_alert_limit', '10', 'alerts', true, 0),
('database_type', 'api', 'database', true, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
