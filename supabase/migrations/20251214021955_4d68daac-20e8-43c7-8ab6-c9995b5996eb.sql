
-- Create tables without trigger dependency

-- Table for API configurations (providers, keys, preferences)
CREATE TABLE IF NOT EXISTS public.api_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  provider TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for raw OCR extractions (store all extracted text before processing)
CREATE TABLE IF NOT EXISTS public.raw_ocr_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  image_url TEXT,
  raw_text TEXT,
  extraction_method TEXT,
  extraction_status TEXT DEFAULT 'pending',
  parsed_data JSONB,
  ai_processed BOOLEAN DEFAULT false,
  processing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for API usage logging (track costs and usage)
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  tokens_used INTEGER,
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  request_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (ignore if already enabled)
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Master can manage API configurations" ON public.api_configurations;
DROP POLICY IF EXISTS "Master can view all OCR extractions" ON public.raw_ocr_extractions;
DROP POLICY IF EXISTS "Master can insert OCR extractions" ON public.raw_ocr_extractions;
DROP POLICY IF EXISTS "Master can update OCR extractions" ON public.raw_ocr_extractions;
DROP POLICY IF EXISTS "Master can delete OCR extractions" ON public.raw_ocr_extractions;
DROP POLICY IF EXISTS "Master can view all API logs" ON public.api_usage_logs;

-- RLS Policies for api_configurations (only master can manage)
CREATE POLICY "Master can manage API configurations"
ON public.api_configurations FOR ALL
USING (is_master(auth.uid()));

-- RLS Policies for raw_ocr_extractions
CREATE POLICY "Master can view all OCR extractions"
ON public.raw_ocr_extractions FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Master can insert OCR extractions"
ON public.raw_ocr_extractions FOR INSERT
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can update OCR extractions"
ON public.raw_ocr_extractions FOR UPDATE
USING (is_master(auth.uid()));

CREATE POLICY "Master can delete OCR extractions"
ON public.raw_ocr_extractions FOR DELETE
USING (is_master(auth.uid()));

-- RLS Policies for api_usage_logs
CREATE POLICY "Master can view all API logs"
ON public.api_usage_logs FOR ALL
USING (is_master(auth.uid()));

-- Insert default API configurations
INSERT INTO public.api_configurations (config_key, config_value, provider, is_active, priority) VALUES
('ocr_primary', 'lovable_gateway', 'lovable', true, 1),
('ocr_fallback_1', 'google_vision', 'google', true, 2),
('ai_primary', 'gemini-2.5-flash', 'lovable', true, 1),
('ai_fallback_1', 'gemini-2.5-flash-lite', 'lovable', true, 2),
('ai_fallback_2', 'gemini-2.5-pro', 'lovable', true, 3),
('database_url', '', 'supabase', true, 1),
('supabase_anon_key', '', 'supabase', true, 1),
('google_vision_api_key', '', 'google', false, 1)
ON CONFLICT (config_key) DO NOTHING;
