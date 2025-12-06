-- Migration: Create storage buckets for media uploads
-- Note: This requires Supabase Storage API which may need to be configured via Supabase Dashboard

-- Storage buckets should be created manually in Supabase Dashboard under Storage section
-- with the following configuration:
--
-- 1. student-photos
--    - Public: true
--    - File size limit: 5MB
--    - Allowed MIME types: image/*
--
-- 2. morning-bliss-photos
--    - Public: true
--    - File size limit: 5MB
--    - Allowed MIME types: image/*
--
-- Storage policies for all buckets:
-- SELECT: Allow public read access
-- INSERT: Allow authenticated users
-- UPDATE: Allow authenticated users
-- DELETE: Allow authenticated users

-- Note: Since Storage API is not directly accessible via SQL,
-- buckets and policies must be created through:
-- 1. Supabase Dashboard → Storage
-- 2. Or Supabase Management API with service role key

-- Expected bucket names:
-- - student-photos
-- - morning-bliss-photos

