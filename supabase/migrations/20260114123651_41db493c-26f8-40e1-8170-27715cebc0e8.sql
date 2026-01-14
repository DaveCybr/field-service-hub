-- Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'superadmin'
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.employee_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop existing policies on user_roles if they exist
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin can delete roles" ON public.user_roles;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_superadmin(auth.uid()));

-- Create a profiles table to store additional user info
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Superadmin can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Superadmin can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_superadmin(auth.uid()));

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();