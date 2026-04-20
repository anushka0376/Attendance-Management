-- SmartFace Internal Auth & Profile Synchronization
-- Ensures public.profiles is always in sync with auth.users

BEGIN;

-- 1. Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    'teacher', 
    new.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users (Requires superuser/service_role to set up in dashboard)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Retroactive Sync: Insert profiles for existing auth users who don't have one
INSERT INTO public.profiles (id, email, full_name, role, created_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    'teacher', 
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Bucket Consistency & Public Access (Run as service_role/dashboard)
-- Ensure 'profiles' and 'students' buckets exist and are public
-- (Note: These often require manual set up in the dashboard, but policies can be scripted)

DROP POLICY IF EXISTS "Public Profile Images" ON storage.objects;
CREATE POLICY "Public Profile Images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "Public Student Faces" ON storage.objects;
CREATE POLICY "Public Student Faces" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-faces');

COMMIT;

-- 🛡️ Auth Sync Active! System is now fully integrated.
