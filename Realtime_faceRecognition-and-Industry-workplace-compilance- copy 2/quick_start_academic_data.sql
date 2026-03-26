-- Quick Start: Assigning your first Academic Class
-- This script creates a subject and assigns it to a Teacher and Batch

DO $$
DECLARE
    v_teacher_id UUID;
    v_batch_id UUID;
    v_subject_id UUID;
BEGIN
    -- 1. Find a teacher from profiles (Picking the first one found)
    SELECT id INTO v_teacher_id FROM profiles WHERE role IN ('teacher', 'admin') LIMIT 1;
    
    -- 2. Find a batch from batches (Picking the first one found)
    SELECT id INTO v_batch_id FROM batches LIMIT 1;
    
    IF v_teacher_id IS NULL OR v_batch_id IS NULL THEN
        RAISE NOTICE 'No teachers or batches found. Please create them in the Supabase Table Editor first.';
        RETURN;
    END IF;

    -- 3. Create a Subject
    INSERT INTO subjects (name, code)
    VALUES ('Data Structures & Algorithms', 'DSA-101')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_subject_id;

    -- 4. Assign the Class (Teacher + Subject + Batch)
    INSERT INTO classes (teacher_id, subject_id, batch_id, semester, is_active)
    VALUES (v_teacher_id, v_subject_id, v_batch_id, 1, true)
    ON CONFLICT (teacher_id, subject_id, batch_id) DO NOTHING;

    RAISE NOTICE 'Success! Class assigned for Teacher ID: %, Batch ID: %', v_teacher_id, v_batch_id;
END $$;
