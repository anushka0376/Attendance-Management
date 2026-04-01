-- Core Biometrics Fix: Missing Encodings & Logs Tables
-- These tables are required for the Face Recognition engine to start properly

BEGIN;

-- 1. Face Encodings Table (Biometric Storage)
CREATE TABLE IF NOT EXISTS public.face_encodings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    encoding JSONB NOT NULL, -- Stores 128-d face vector
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Recognition Logs (Analytics & Audit)
CREATE TABLE IF NOT EXISTS public.recognition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    confidence FLOAT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.face_encodings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Public read for authenticated" ON public.face_encodings;
DROP POLICY IF EXISTS "Admins manage encodings" ON public.face_encodings;
DROP POLICY IF EXISTS "Public read for authenticated" ON public.recognition_logs;
DROP POLICY IF EXISTS "Backend can insert logs" ON public.recognition_logs;

CREATE POLICY "Public read for authenticated" ON public.face_encodings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage encodings" ON public.face_encodings FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read for authenticated" ON public.recognition_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Backend can insert logs" ON public.recognition_logs FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;
