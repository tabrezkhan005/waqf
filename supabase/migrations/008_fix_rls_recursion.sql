-- Fix infinite recursion in RLS policies for profiles table
-- The issue: is_admin() function queries profiles table, which triggers RLS again

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate is_admin() with proper security settings to prevent recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- SECURITY DEFINER allows this function to bypass RLS
  -- search_path = '' prevents schema search issues
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()::uuid
      AND role = 'admin'
  );
END;
$$;

-- Recreate policies in correct order (more specific first)
-- Users can view their own profile (most specific - evaluated first)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles (less specific - evaluated after)
-- This policy will only be checked if the user policy doesn't match
CREATE POLICY "Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Only check if not viewing own profile (to avoid recursion)
    id != auth.uid() AND public.is_admin()
  );

-- Fix other helper functions
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()::uuid);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_district_id()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  RETURN (SELECT district_id FROM public.profiles WHERE id = auth.uid()::uuid);
END;
$$;

























