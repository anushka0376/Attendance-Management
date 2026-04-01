-- Auth Recovery & Identity Sync (Fixed Version)
-- This script safely adds missing columns to 'profiles' and syncs from Supabase Auth.

BEGIN;

-- 1. Ensure 'profiles' table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Safely add missing columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. SYNC: Map all existing Supabase Auth users into 'profiles'
INSERT INTO public.profiles (id, email, username, full_name, role)
SELECT 
    id, 
    email, 
    LOWER(SPLIT_PART(email, '@', 1)) as username, -- Default username from email prefix
    'New User' as full_name,
    'teacher' as role
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username);

-- 5. RECOVERY: Pull data from legacy 'teachers' table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers') THEN
        UPDATE public.profiles p
        SET 
            full_name = t.full_name,
            username = t.username,
            role = 'teacher'
        FROM teachers t
        WHERE p.email = t.email AND p.full_name = 'New User';
    END IF;
END $$;

-- 6. RECOVERY: Pull data from legacy 'admins' table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        UPDATE public.profiles p
        SET 
            full_name = a.full_name,
            username = a.username,
            role = 'admin'
        FROM admins a
        WHERE p.email = a.email;
    END IF;
END $$;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

COMMIT;
