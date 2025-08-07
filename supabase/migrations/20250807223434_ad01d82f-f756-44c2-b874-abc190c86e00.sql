-- Storage RLS for private journal-photos bucket (no need to enable RLS)
-- Idempotent drops
DROP POLICY IF EXISTS "Private journal photos - read own" ON storage.objects;
DROP POLICY IF EXISTS "Private journal photos - insert own" ON storage.objects;
DROP POLICY IF EXISTS "Private journal photos - update own" ON storage.objects;
DROP POLICY IF EXISTS "Private journal photos - delete own" ON storage.objects;

-- Allow authenticated users to manage only their own files in journal-photos bucket
CREATE POLICY "Private journal photos - read own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Private journal photos - insert own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Private journal photos - update own" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Private journal photos - delete own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'journal-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);