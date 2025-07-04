
import { supabase } from '@/integrations/supabase/client';
import type { Entry } from '@/types/entry';
import { validateEntryContent, validatePhotos, validateTags } from '@/utils/validation';
import { uploadPhotos, checkPhotoLimit, deleteEntryPhotos } from '@/utils/photoUpload';
import { encryptText, decryptText, isEncrypted } from '@/utils/encryption';

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
    return data.map((entry): Entry => {
      let decryptedContent = entry.content;
      let decryptedTitle = entry.title;
      
      // Decrypt content if it appears to be encrypted
      try {
        if (isEncrypted(entry.content)) {
          console.log('Decrypting content for entry:', entry.id);
          decryptedContent = decryptText(entry.content, userId);
        }
        if (isEncrypted(entry.title)) {
          console.log('Decrypting title for entry:', entry.id);
          decryptedTitle = decryptText(entry.title, userId);
        }
      } catch (error) {
        console.error('Failed to decrypt entry:', entry.id, error);
        console.error('Entry content length:', entry.content.length);
        console.error('User ID:', userId);
        // Keep encrypted content if decryption fails
      }
      
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
    });
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
  const encryptedContent = encryptText(content.trim(), userId);
  const encryptedTitle = encryptText(title.trim(), userId);
  
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
  const encryptedContent = encryptText(content.trim(), userId);

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
