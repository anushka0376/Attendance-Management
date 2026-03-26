-- Fix for Attendance RLS Error
-- Enabling teachers to mark attendance for their specific classes

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 1. Drop old/conflicting policies
DROP POLICY IF EXISTS "Public can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Authenticated can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can mark attendance" ON attendance;

-- 2. Create high-precision session-aware policy
-- A teacher can only mark attendance for a class session they are assigned to
CREATE POLICY "Teachers can insert attendance for their classes"
ON attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- 3. Allow teachers to view attendance for their own classes
CREATE POLICY "Teachers can view attendance for their classes"
ON attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- 4. Admins can do everything
CREATE POLICY "Admins have full access to attendance"
ON attendance
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
