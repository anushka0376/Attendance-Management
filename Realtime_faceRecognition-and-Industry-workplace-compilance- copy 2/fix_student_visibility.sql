-- Final RLS Fix for Student Visibility & Face Recognition
-- This ensures teachers can see students they need to mark attendance for.

BEGIN;

-- 1. Enable RLS on Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy or broken policies
DROP POLICY IF EXISTS "Public read for authenticated" ON public.students;
DROP POLICY IF EXISTS "Teachers can see students in their batches" ON public.students;
DROP POLICY IF EXISTS "Teachers see students in their classes" ON public.students;

-- 3. Policy: Teachers can see students belonging to ANY batch assigned to them in 'classes'
-- This is the most secure and accurate policy.
CREATE POLICY "Teachers see students in their academic classes"
ON public.students
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE public.classes.batch_id = public.students.batch_id
        AND public.classes.teacher_id = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
);

-- 4. Policy: Teachers can see students in batches THEY OWN (Phase 11/12 sync)
CREATE POLICY "Teachers see students in their owned batches"
ON public.students
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.batches
        WHERE public.batches.id = public.students.batch_id
        AND public.batches.teacher_id = auth.uid()
    )
);

-- 5. Ensure face_encodings is also visible
ALTER TABLE public.face_encodings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for authenticated" ON public.face_encodings;
CREATE POLICY "Authenticated read all encodings" ON public.face_encodings FOR SELECT TO authenticated USING (true);

COMMIT;
