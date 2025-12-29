-- Fix RLS recursion for development
-- This allows all authenticated users to view profiles to prevent recursion
-- In production, implement proper role-based policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Accounts and Reports can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "All authenticated can view profiles" ON public.profiles;

-- Drop function if exists
DROP FUNCTION IF EXISTS public.can_view_profile(uuid);

-- Create simple policy for development
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- For development: Allow all authenticated users to view all profiles
-- This prevents recursion during development
-- TODO: Implement proper role-based policies for production
CREATE POLICY "All authenticated can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

































