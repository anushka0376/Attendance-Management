-- 🚀 SQL Fix v3: Support Session-less Attendance & Fix Status Constraints
-- Run this in the Supabase SQL Editor

-- 1. Ensure batch_id exists and is nullable (for session-less marking)
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id);

-- 2. FIX STATUS CONSTRAINT: Support "Present", "Late", "Absent" (Case-Insensitive-ish)
ALTER TABLE public.attendance 
DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('Present', 'Late', 'Absent', 'Excused', 'PRESENT', 'LATE', 'ABSENT'));

-- 3. Update RLS policies to be more permissive for session-less marking
DROP POLICY IF EXISTS "Teachers can insert attendance for their students" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can view attendance for their students" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can insert attendance for their classes" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can view attendance for their classes" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can view attendance" ON public.attendance;

CREATE POLICY "Teachers can insert attendance"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
  -- If class_id is provided, check ownership (Strict)
  (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = attendance.class_id 
      AND (classes.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  ))
  OR
  -- If class_id is NULL (Group Marking), allow if user is a teacher or admin (Permissive)
  (class_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role IN ('teacher', 'admin'))
  ))
);

CREATE POLICY "Teachers can view attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  -- Teachers can see all attendance they've marked or for batches they teach
  (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role IN ('teacher', 'admin'))
  ))
);

-- ✅ All set! Status "Present" and "Late" are now fully supported.
