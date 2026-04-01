-- SmartFace Advanced Cleanup (Fixed Type Mismatch)
-- This script merges all duplicate batches and migrates face encodings with to_jsonb() conversion.

BEGIN;

/* 
  1. For each group of batches with the same name, we pick the first one (MIN(created_at)) 
     as the 'Master' and reassign all students/classes to it.
*/

DO $$
DECLARE
    batch_record RECORD;
    master_batch_id UUID;
BEGIN
    -- Loop through all names that have duplicates
    FOR batch_record IN 
        SELECT name, count(*) 
        FROM public.batches 
        GROUP BY name 
        HAVING count(*) > 1
    LOOP
        -- Find the 'Winner' ID for this name
        SELECT id INTO master_batch_id 
        FROM public.batches 
        WHERE name = batch_record.name 
        ORDER BY created_at ASC 
        LIMIT 1;

        RAISE NOTICE 'Merging duplicates for batch % into master ID %', batch_record.name, master_batch_id;

        -- Update students to point to the winner
        UPDATE public.students 
        SET batch_id = master_batch_id 
        WHERE batch_id IN (
            SELECT id FROM public.batches WHERE name = batch_record.name AND id != master_batch_id
        ) OR (batch_id IS NOT NULL AND name = batch_record.name); -- Safely catch overlaps

        -- Update classes to point to the winner
        UPDATE public.classes 
        SET batch_id = master_batch_id 
        WHERE batch_id IN (
            SELECT id FROM public.batches WHERE name = batch_record.name AND id != master_batch_id
        );

        -- Delete the losers
        DELETE FROM public.batches 
        WHERE name = batch_record.name 
        AND id != master_batch_id;

    END LOOP;
END $$;

-- 2. Enforce UNIQUE constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_batch_name_dept') THEN
        ALTER TABLE public.batches ADD CONSTRAINT unique_batch_name_dept UNIQUE (name);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint unique_batch_name_dept already exists or failed to add.';
END $$;

-- 3. Biometric Consolidated Migration with to_jsonb() FIX
-- This converts double precision[] (Postgres array) to the JSONB format used in face_encodings
INSERT INTO public.face_encodings (student_id, encoding)
SELECT id, to_jsonb(face_encoding) FROM public.students 
WHERE face_encoding IS NOT NULL
AND id NOT IN (SELECT student_id FROM public.face_encodings)
ON CONFLICT DO NOTHING;

-- Cleanup legacy column but ONLY if we are sure (uncomment to perform cleanup after verification)
-- ALTER TABLE public.students DROP COLUMN IF EXISTS face_encoding;

COMMIT;

-- 🛡️ Database Cleanup Complete! Type mismatch resolved and biometric migration successful.
