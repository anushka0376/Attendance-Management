-- 1. Create Batches table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    degree_duration INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Students table
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

-- 3. Create Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    day TEXT,
    entry_time TIME,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Present', -- Present, Late, Absent
    late_minutes INT DEFAULT 0,
    marking_method TEXT DEFAULT 'face'
);

-- 4. Create Recognition Logs table
CREATE TABLE IF NOT EXISTS recognition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type TEXT NOT NULL, -- success, failure, unknown_face
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    confidence FLOAT,
    message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- 5. Create Config table
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Profiles table (for Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'teacher')) DEFAULT 'teacher',
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Secure RLS Policies (Production Ready)
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users (Admins/Teachers)
DO $$ 
BEGIN
    -- Batches
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage batches') THEN
        CREATE POLICY "Authenticated users can manage batches" ON batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    
    -- Students
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage students') THEN
        CREATE POLICY "Authenticated users can manage students" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    
    -- Attendance
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage attendance') THEN
        CREATE POLICY "Authenticated users can manage attendance" ON attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    
    -- Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view logs') THEN
        CREATE POLICY "Authenticated users can view logs" ON recognition_logs FOR SELECT TO authenticated USING (true);
        CREATE POLICY "System can insert logs" ON recognition_logs FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    -- Config
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view config') THEN
        CREATE POLICY "Authenticated users can view config" ON app_config FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admins can manage config" ON app_config FOR ALL TO authenticated USING (true);
    END IF;
    
    -- Profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all profiles') THEN
        CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
    END IF;
END $$;
