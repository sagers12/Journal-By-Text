
-- Create storage bucket for journal photos (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
SELECT 'journal-photos', 'journal-photos', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'journal-photos');

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create storage policy to allow users to upload their own photos
CREATE POLICY "Users can upload their own photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'journal-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policy to allow users to view their own photos  
CREATE POLICY "Users can view their own photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'journal-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policy to allow users to delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'journal-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable Row Level Security on all journal tables (safe to repeat)
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;

-- Create RLS policies for journal_entries
CREATE POLICY "Users can view their own journal entries" 
ON journal_entries FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal entries" 
ON journal_entries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries" 
ON journal_entries FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries" 
ON journal_entries FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can create their own journal photos" ON journal_photos;
DROP POLICY IF EXISTS "Users can delete their own journal photos" ON journal_photos;

-- Create RLS policies for journal_photos
CREATE POLICY "Users can view their own journal photos" 
ON journal_photos FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM journal_entries WHERE id = entry_id));

CREATE POLICY "Users can create their own journal photos" 
ON journal_photos FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM journal_entries WHERE id = entry_id));

CREATE POLICY "Users can delete their own journal photos" 
ON journal_photos FOR DELETE 
USING (auth.uid() = (SELECT user_id FROM journal_entries WHERE id = entry_id));

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can create their own SMS messages" ON sms_messages;

-- Create RLS policies for sms_messages
CREATE POLICY "Users can view their own SMS messages" 
ON sms_messages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SMS messages" 
ON sms_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for journal entries so new SMS entries appear immediately
ALTER TABLE journal_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_entries;

-- Enable realtime for journal photos
ALTER TABLE journal_photos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE journal_photos;
