-- FORCE ACCOUNT TO TEACHER ROLE
-- This script ensures your account is explicitly set to 'teacher' in the database.

BEGIN;

UPDATE public.profiles 
SET role = 'teacher' 
WHERE email = 'arshberi51@gmail.com' 
   OR username = 'Arsh';

-- Verify the change
SELECT id, username, email, role FROM public.profiles WHERE username = 'Arsh' OR email = 'arshberi51@gmail.com';

COMMIT;

-- 🎓 Role successfully set to Teacher!
