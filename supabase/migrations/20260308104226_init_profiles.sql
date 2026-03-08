-- Sprint 0: moddatetime extension, role enum, profiles table, auth trigger

-- 1. Enable moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- 2. Create role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'technik',
  'klient'
);

-- 3. Profiles table (1:1 with auth.users)
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                 public.app_role[] NOT NULL DEFAULT '{technik}',
  jmeno                TEXT NOT NULL DEFAULT '',
  prijmeni             TEXT NOT NULL DEFAULT '',
  email                TEXT NOT NULL,
  telefon              TEXT DEFAULT '',
  aktivni_role         public.app_role NOT NULL DEFAULT 'technik',
  koeficient_rychlosti NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ DEFAULT NULL
);

-- 4. moddatetime trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- 5. Indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_active ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

-- 6. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User can view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- User can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin/super_admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND ('admin' = ANY(p.role) OR 'super_admin' = ANY(p.role))
    )
  );

-- Admin/super_admin can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND ('admin' = ANY(p.role) OR 'super_admin' = ANY(p.role))
    )
  );

-- Admin/super_admin can insert profiles (creating users)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND ('admin' = ANY(p.role) OR 'super_admin' = ANY(p.role))
    )
  );

-- 7. Auth trigger: auto-create profile after registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, jmeno, prijmeni)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'jmeno', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'prijmeni', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
