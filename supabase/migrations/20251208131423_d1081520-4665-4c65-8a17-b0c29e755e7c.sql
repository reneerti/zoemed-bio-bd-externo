-- Create user goals table
CREATE TABLE public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_person TEXT NOT NULL UNIQUE,
  target_weight NUMERIC,
  target_body_fat NUMERIC,
  target_muscle NUMERIC,
  target_visceral_fat NUMERIC,
  target_bmi NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read goals"
ON public.user_goals
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert goals"
ON public.user_goals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update goals"
ON public.user_goals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete goals"
ON public.user_goals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index
CREATE INDEX idx_user_goals_person ON public.user_goals(user_person);

-- Insert default goals based on reference values
-- Reneer (male, 170cm): ideal weight ~65-70kg, fat 10-20%, muscle 35-40%, visceral <10
-- Ana Paula (female): ideal fat 15-25%, muscle 25-35%, visceral <10
INSERT INTO public.user_goals (user_person, target_weight, target_body_fat, target_muscle, target_visceral_fat, target_bmi)
VALUES 
  ('reneer', 75.0, 18.0, 38.0, 8, 24.0),
  ('ana_paula', 60.0, 22.0, 30.0, 8, 23.0)
ON CONFLICT (user_person) DO NOTHING;