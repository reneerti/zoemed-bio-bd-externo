-- Create supplementation table
CREATE TABLE public.supplementation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_person text NOT NULL,
  supplement_name text NOT NULL,
  dosage text NOT NULL,
  notes text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplementation ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read supplementation" 
ON public.supplementation FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert supplementation" 
ON public.supplementation FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update supplementation" 
ON public.supplementation FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete supplementation" 
ON public.supplementation FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_supplementation_updated_at
BEFORE UPDATE ON public.supplementation
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Insert default data for Ana Paula
INSERT INTO public.supplementation (user_person, supplement_name, dosage, notes) VALUES
('ana_paula', 'Whey Protein', '1 dosador por dia (30g)', NULL),
('ana_paula', 'Creatina', '1 colher rasa todos os dias', 'treinos e descanso'),
('ana_paula', 'Ômega-3', '2 caps dia', NULL);

-- Insert default data for Reneer
INSERT INTO public.supplementation (user_person, supplement_name, dosage, notes) VALUES
('reneer', 'Creatina', '1 colher rasa todos os dias', 'treinos e descanso'),
('reneer', 'Whey', '2 dosadores normal (60g), 5 treino (150g)', 'dia normal vs dia de treino'),
('reneer', 'BCAA', '3 caps em dias de treino', NULL),
('reneer', 'Ômega-3', '2 caps todo dia antes de dormir', NULL);