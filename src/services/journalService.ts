
import { supabase } from '@/integrations/supabase/client';
import type { Entry } from '@/types/entry';
import { validateEntryContent, validatePhotos, validateTags } from '@/utils/validation';
import { uploadPhotos, checkPhotoLimit, deleteEntryPhotos } from '@/utils/photoUpload';
import { encrypt, decrypt } from '@/utils/encryption';

export const fetchJournalEntries = async (userId: string): Promise<Entry[]> => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_photos (
          id,
          file_path,
          file_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to match Entry interface and decrypt content
    return Promise.all(data.map(async (entry): Promise<Entry> => {
      try {
        const decryptedContent = await decrypt(entry.content, userId);
        const decryptedTitle = await decrypt(entry.title, userId);
        
        return {
          id: entry.id,
          content: decryptedContent,
          title: decryptedTitle,
          source: entry.source as 'web' | 'sms',
          timestamp: new Date(entry.created_at),
          entry_date: entry.entry_date,
          user_id: entry.user_id,
          tags: entry.tags || [],
          photos: entry.journal_photos?.map((photo: any) => {
            const { data: publicUrl } = supabase.storage
              .from('journal-photos')
              .getPublicUrl(photo.file_path);
            return publicUrl.publicUrl;
          }) || []
        };
      } catch (error) {
        console.error('Error decrypting entry:', error);
        // Return entry with original content if decryption fails
        return {
          id: entry.id,
          content: entry.content,
          title: entry.title,
          source: entry.source as 'web' | 'sms',
          timestamp: new Date(entry.created_at),
          entry_date: entry.entry_date,
          user_id: entry.user_id,
          tags: entry.tags || [],
          photos: entry.journal_photos?.map((photo: any) => {
            const { data: publicUrl } = supabase.storage
              .from('journal-photos')
              .getPublicUrl(photo.file_path);
            return publicUrl.publicUrl;
          }) || []
        };
      }
    }));
  } catch (error) {
    console.error('Error fetching entries:', error);
    throw error;
  }
};

export const createJournalEntry = async ({ 
  content, 
  title, 
  tags = [], 
  photos = [], 
  userId 
}: {
  content: string;
  title: string;
  tags?: string[];
  photos?: File[];
  userId: string;
}) => {
  if (!userId) throw new Error('User not authenticated');

  // Validate inputs
  validateEntryContent(content);
  validatePhotos(photos);

  // Encrypt content and title before storing
  const encryptedContent = await encrypt(content.trim(), userId);
  const encryptedTitle = await encrypt(title.trim(), userId);

  // Create the entry
  const entryDate = new Date().toISOString().split('T')[0];
  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content: encryptedContent,
      title: encryptedTitle,
      source: 'web',
      entry_date: entryDate,
      tags: validateTags(tags)
    })
    .select()
    .single();

  if (error) throw error;

  // Upload photos if any
  if (photos.length > 0) {
    await uploadPhotos(photos, entry.id, userId);
  }

  return entry;
};

export const updateJournalEntry = async ({ 
  id, 
  content, 
  photos, 
  userId 
}: { 
  id: string; 
  content: string; 
  photos?: File[];
  userId: string;
}) => {
  validateEntryContent(content);

  // Encrypt content before updating
  const encryptedContent = await encrypt(content.trim(), userId);

  // Update the entry content
  const { error } = await supabase
    .from('journal_entries')
    .update({ content: encryptedContent })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;

  // Upload new photos if any
  if (photos && photos.length > 0) {
    validatePhotos(photos);
    await checkPhotoLimit(id, photos.length);
    await uploadPhotos(photos, id, userId);
  }
};

export const deleteJournalEntry = async (entryId: string, userId: string) => {
  // First delete associated photos from storage
  await deleteEntryPhotos(entryId);

  // Delete the entry (photos will be deleted via cascade)
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);

  if (error) throw error;
};
