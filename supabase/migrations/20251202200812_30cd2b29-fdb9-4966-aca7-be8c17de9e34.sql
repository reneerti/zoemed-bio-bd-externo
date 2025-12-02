-- Drop existing public RLS policies on bioimpedance
DROP POLICY IF EXISTS "Allow public delete access" ON public.bioimpedance;
DROP POLICY IF EXISTS "Allow public insert access" ON public.bioimpedance;
DROP POLICY IF EXISTS "Allow public read access" ON public.bioimpedance;
DROP POLICY IF EXISTS "Allow public update access" ON public.bioimpedance;

-- Create new authenticated RLS policies for bioimpedance
CREATE POLICY "Authenticated users can read bioimpedance"
ON public.bioimpedance FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert bioimpedance"
ON public.bioimpedance FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bioimpedance"
ON public.bioimpedance FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bioimpedance"
ON public.bioimpedance FOR DELETE
TO authenticated
USING (true);

-- Drop existing public RLS policies on user_profiles
DROP POLICY IF EXISTS "Allow public insert access on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public read access on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public update access on user_profiles" ON public.user_profiles;

-- Create new authenticated RLS policies for user_profiles
CREATE POLICY "Authenticated users can read profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert profiles"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (true);