-- Drop existing policies on supplementation table
DROP POLICY IF EXISTS "Authenticated users can read supplementation" ON public.supplementation;
DROP POLICY IF EXISTS "Only admins can insert supplementation" ON public.supplementation;
DROP POLICY IF EXISTS "Only admins can update supplementation" ON public.supplementation;
DROP POLICY IF EXISTS "Only admins can delete supplementation" ON public.supplementation;

-- Master can view all supplementation
CREATE POLICY "Master can view all supplementation" 
ON public.supplementation 
FOR SELECT 
USING (is_master(auth.uid()));

-- Users can only view their own supplementation (matching user_person via patients table)
CREATE POLICY "Users can view their own supplementation" 
ON public.supplementation 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.user_id = auth.uid() 
    AND (p.name = supplementation.user_person OR LOWER(REPLACE(p.name, ' ', '_')) = supplementation.user_person)
  )
);

-- Only master can insert supplementation
CREATE POLICY "Master can insert supplementation" 
ON public.supplementation 
FOR INSERT 
WITH CHECK (is_master(auth.uid()));

-- Only master can update supplementation
CREATE POLICY "Master can update supplementation" 
ON public.supplementation 
FOR UPDATE 
USING (is_master(auth.uid()));

-- Only master can delete supplementation
CREATE POLICY "Master can delete supplementation" 
ON public.supplementation 
FOR DELETE 
USING (is_master(auth.uid()));