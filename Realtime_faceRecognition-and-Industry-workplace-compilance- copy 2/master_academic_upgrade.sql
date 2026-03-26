-- Masters Academic Upgrade: Schema + Security
-- Target: Real-world university architecture with session-based tracking

BEGIN;

-- 1. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- e.g., CS101, MAT202
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Teacher-Subjects (N:N Junction)
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, subject_id)
);

-- 3. Classes (The core link: Teacher + Subject + Batch)
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    semester INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, subject_id, batch_id)
);

-- 4. Attendance Table Update
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- 5. Row-Level Security (RLS) Configuration
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop old/conflicting policies
DROP POLICY IF EXISTS "Public read for authenticated" ON subjects;
DROP POLICY IF EXISTS "Public read for authenticated" ON classes;
DROP POLICY IF EXISTS "Public read for authenticated" ON teacher_subjects;
DROP POLICY IF EXISTS "Teachers can insert attendance for their classes" ON attendance;
DROP POLICY IF EXISTS "Teachers can view attendance for their classes" ON attendance;
DROP POLICY IF EXISTS "Admins have full access to attendance" ON attendance;

-- Create university-grade session-aware policies

-- Subjects/Classes: Read-only for all faculty
CREATE POLICY "Public read for authenticated" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read for authenticated" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read for authenticated" ON teacher_subjects FOR SELECT TO authenticated USING (true);

-- Attendance: Teachers can mark for their own classes
CREATE POLICY "Teachers can insert attendance for their classes"
ON attendance FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Attendance: Teachers can view records for their classes
CREATE POLICY "Teachers can view attendance for their classes"
ON attendance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = attendance.class_id
    AND classes.teacher_id = auth.uid()
  )
);

-- Admins: Full management control
CREATE POLICY "Admins manage everything" ON subjects FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage classes" ON classes FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full attendance" ON attendance FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

COMMIT;
