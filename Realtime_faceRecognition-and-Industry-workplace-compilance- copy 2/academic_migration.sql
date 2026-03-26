-- Academic Schema Upgrade: Subjects & Classes Migration
-- Target: Real-world university architecture

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

-- 5. RLS Policies (Security)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view subjects/classes
CREATE POLICY "Public read for authenticated" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read for authenticated" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read for authenticated" ON teacher_subjects FOR SELECT TO authenticated USING (true);

-- Only admins can manage definitions
CREATE POLICY "Admins manage subjects" ON subjects ALL TO authenticated 
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins manage teacher assignments" ON teacher_subjects ALL TO authenticated 
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins manage classes" ON classes ALL TO authenticated 
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 6. Helper: Comment for documentation
COMMENT ON TABLE subjects IS 'Academic subjects/curriculum definitions';
COMMENT ON TABLE teacher_subjects IS 'Junction table assigning subjects to faculty members';
COMMENT ON TABLE classes IS 'Specific lecture sessions linking a teacher, subject, and batch';
