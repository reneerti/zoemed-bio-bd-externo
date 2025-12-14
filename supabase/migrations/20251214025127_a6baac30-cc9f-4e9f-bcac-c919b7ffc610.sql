-- Create table for API key version history
CREATE TABLE public.api_key_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES public.api_configurations(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  provider TEXT,
  rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rotated_by UUID REFERENCES auth.users(id),
  rotation_reason TEXT,
  version_number INTEGER NOT NULL DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.api_key_history ENABLE ROW LEVEL SECURITY;

-- Only admins can access key history
CREATE POLICY "Only admins can view key history"
ON public.api_key_history
FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Only admins can insert key history"
ON public.api_key_history
FOR INSERT
WITH CHECK (is_master(auth.uid()));

-- Add index for faster queries
CREATE INDEX idx_api_key_history_config_id ON public.api_key_history(config_id);
CREATE INDEX idx_api_key_history_rotated_at ON public.api_key_history(rotated_at DESC);