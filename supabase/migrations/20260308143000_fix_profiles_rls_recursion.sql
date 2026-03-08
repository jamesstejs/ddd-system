-- Fix infinite recursion in profiles RLS policies.
-- The admin policies query profiles to check if current user is admin,
-- which triggers the same RLS policies → infinite loop.
-- Solution: use a SECURITY DEFINER function that bypasses RLS.

-- 1. Create helper function (runs as DB owner, bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND ('admin' = ANY(role) OR 'super_admin' = ANY(role))
  );
$$;

-- 2. Drop old recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- 3. Recreate policies using the helper function
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_or_super_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin());
