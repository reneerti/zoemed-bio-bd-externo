-- Fix 1: Drop the overly permissive notifications insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive insert policy - only admins/master or via triggers
CREATE POLICY "Only admins can insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (is_master(auth.uid()));

-- Fix 2: Add explicit policies to deny public/anonymous access to patients
-- The existing policies are RESTRICTIVE which is good, but we need to ensure
-- only authenticated users can access. Drop and recreate with proper TO clause.

DROP POLICY IF EXISTS "Master can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Master can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Master can update all patients" ON public.patients;
DROP POLICY IF EXISTS "Master can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view only their own patient record" ON public.patients;
DROP POLICY IF EXISTS "Users can update only their own patient record" ON public.patients;
DROP POLICY IF EXISTS "Users can insert their own patient record" ON public.patients;

-- Recreate with explicit TO authenticated clause
CREATE POLICY "Master can view all patients" 
ON public.patients FOR SELECT TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Master can insert patients" 
ON public.patients FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Master can update all patients" 
ON public.patients FOR UPDATE TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Master can delete patients" 
ON public.patients FOR DELETE TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Users can view only their own patient record" 
ON public.patients FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update only their own patient record" 
ON public.patients FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own patient record" 
ON public.patients FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix 3: Add explicit TO authenticated for bioimpedance policies
DROP POLICY IF EXISTS "Master can view all bioimpedance" ON public.bioimpedance;
DROP POLICY IF EXISTS "Only admins can delete bioimpedance" ON public.bioimpedance;
DROP POLICY IF EXISTS "Only admins can insert bioimpedance" ON public.bioimpedance;
DROP POLICY IF EXISTS "Only admins can update bioimpedance" ON public.bioimpedance;
DROP POLICY IF EXISTS "Users can insert their own bioimpedance via patient" ON public.bioimpedance;
DROP POLICY IF EXISTS "Users can view their own bioimpedance by user_person" ON public.bioimpedance;
DROP POLICY IF EXISTS "Users can view their own bioimpedance via patient" ON public.bioimpedance;

CREATE POLICY "Master can view all bioimpedance" 
ON public.bioimpedance FOR SELECT TO authenticated
USING (is_master(auth.uid()));

CREATE POLICY "Only admins can delete bioimpedance" 
ON public.bioimpedance FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert bioimpedance" 
ON public.bioimpedance FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update bioimpedance" 
ON public.bioimpedance FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own bioimpedance via patient" 
ON public.bioimpedance FOR INSERT TO authenticated
WITH CHECK (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients WHERE patients.id = bioimpedance.patient_id AND patients.user_id = auth.uid())
);

CREATE POLICY "Users can view their own bioimpedance by user_person" 
ON public.bioimpedance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.user_id = auth.uid() 
    AND (p.name = bioimpedance.user_person::text OR lower(replace(p.name, ' ', '_')) = bioimpedance.user_person::text)
  )
);

CREATE POLICY "Users can view their own bioimpedance via patient" 
ON public.bioimpedance FOR SELECT TO authenticated
USING (
  patient_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM patients WHERE patients.id = bioimpedance.patient_id AND patients.user_id = auth.uid())
);