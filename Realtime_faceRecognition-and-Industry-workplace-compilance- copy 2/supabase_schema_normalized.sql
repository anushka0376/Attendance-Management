-- University-Level Normalized Schema v2.0
-- DROP OLD TABLES IF NEEDED (CAUTION: DATA LOSS)
-- DROP TABLE IF EXISTS recognition_logs CASCADE;
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS face_encodings CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS batches CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles Table (Consolidated Teachers/Admins)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'teacher')) DEFAULT 'teacher',
    department TEXT,
    employee_id TEXT UNIQUE,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g. "Computer Science - 2024"
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    degree_duration INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Students Table (Clean, no encodings)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Multi-Face Encodings Table
CREATE TABLE IF NOT EXISTS face_encodings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    encoding FLOAT8[] NOT NULL, -- 128D encoding array
    encoding_path TEXT, -- Optional backlink to storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    day TEXT,
    entry_time TIME DEFAULT (CURRENT_TIME AT TIME ZONE 'UTC'),
    status TEXT CHECK (status IN ('Present', 'Late', 'Absent')) DEFAULT 'Present',
    late_minutes INT DEFAULT 0,
    marking_method TEXT CHECK (marking_method IN ('face', 'manual')) DEFAULT 'face',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Recognition Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS recognition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type TEXT NOT NULL, -- match_found, spoof_detected, unknown_face, batch_mismatch
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    confidence FLOAT,
    message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- SECURE RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_encodings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_logs ENABLE ROW LEVEL SECURITY;

-- Unified Policies
CREATE POLICY "Authenticated users can manage all facets" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage all facets" ON batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage all facets" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage all facets" ON face_encodings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage all facets" ON attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage all facets" ON recognition_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
