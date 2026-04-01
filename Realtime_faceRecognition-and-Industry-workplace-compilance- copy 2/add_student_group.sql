-- Add Student Group Feature
-- Run this script in the Supabase SQL Editor

-- 1. Add the group_name column to the students table securely
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT '';

-- ✅ Successfully added group_name to students table.
