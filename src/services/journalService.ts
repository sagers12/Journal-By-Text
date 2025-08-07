
import { supabase } from '@/integrations/supabase/client';
import type { Entry } from '@/types/entry';
import { validateEntryContent, validatePhotos, validateTags } from '@/utils/validation';
import { uploadPhotos, checkPhotoLimit, deleteEntryPhotos } from '@/utils/photoUpload';
import { encrypt, decrypt } from '@/utils/encryption';

export const fetchJournalEntries = async (userId: string): Promise<Entry[]> => {
  if (!userId) return [];
  
  console.log('Fetching journal entries for user:', userId);
  
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

    console.log('Raw journal entries from database:', data?.length || 0);

    if (error) throw error;

    console.log('Raw database entries:', data?.map(entry => ({
      id: entry.id,
      entry_date: entry.entry_date,
      source: entry.source,
      created_at: entry.created_at
    })));

    // Transform data to match Entry interface and decrypt content
    const processedEntries = await Promise.all(data.map(async (entry): Promise<Entry | null> => {
      try {
        console.log(`Processing entry ${entry.id} from ${entry.entry_date}`);
        const decryptedContent = await decrypt(entry.content, userId);
        const decryptedTitle = await decrypt(entry.title, userId);
        
        const processedEntry = {
          id: entry.id,
          content: decryptedContent,
          title: decryptedTitle,
          source: entry.source as 'web' | 'sms',
          timestamp: new Date(entry.created_at),
          entry_date: entry.entry_date,
          user_id: entry.user_id,
          tags: entry.tags || [],
          photos: await (async () => {
            const photosArr = entry.journal_photos || [];
            const signed = await Promise.all(photosArr.map(async (photo: any) => {
              const { data } = await supabase.storage
                .from('journal-photos')
                .createSignedUrl(photo.file_path, 3600);
              return data?.signedUrl || '';
            }));
            return signed.filter(Boolean);
          })()
        };
        
        console.log(`Successfully processed entry ${entry.id}:`, {
          entry_date: processedEntry.entry_date,
          title: processedEntry.title.substring(0, 50) + '...',
          content_length: processedEntry.content.length
        });
        
        return processedEntry;
      } catch (error) {
        console.error(`Error processing entry ${entry.id}:`, error);
        // Return entry with original content if decryption fails
        const fallbackEntry = {
          id: entry.id,
          content: entry.content,
          title: entry.title,
          source: entry.source as 'web' | 'sms',
          timestamp: new Date(entry.created_at),
          entry_date: entry.entry_date,
          user_id: entry.user_id,
          tags: entry.tags || [],
          photos: await (async () => {
            const photosArr = entry.journal_photos || [];
            const signed = await Promise.all(photosArr.map(async (photo: any) => {
              const { data } = await supabase.storage
                .from('journal-photos')
                .createSignedUrl(photo.file_path, 3600);
              return data?.signedUrl || '';
            }));
            return signed.filter(Boolean);
          })()
        };
        
        console.log(`Using fallback for entry ${entry.id}`);
        return fallbackEntry;
      }
    }));

    // Filter out any null entries and log final result
    const validEntries = processedEntries.filter((entry): entry is Entry => entry !== null);
    
    console.log('Final processed entries:', validEntries.map(entry => ({
      id: entry.id,
      entry_date: entry.entry_date,
      source: entry.source
    })));
    
    return validEntries;
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
  validateEntryContent(content, photos);
  if (photos) validatePhotos(photos);

  // Encrypt content and title before storing
  const encryptedContent = await encrypt(content.trim(), userId);
  const encryptedTitle = await encrypt(title.trim(), userId);

  // Get user's timezone to determine the correct entry date
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  
  const userTimezone = userProfile?.timezone || 'UTC';
  
  // Convert current time to user's timezone to get the correct entry date
  const now = new Date();
  const userDate = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
  const entryDate = userDate.toISOString().split('T')[0];
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
  tags,
  photos, 
  removedPhotos,
  userId 
}: { 
  id: string; 
  content: string; 
  tags?: string[];
  photos?: File[];
  removedPhotos?: string[];
  userId: string;
}) => {
  validateEntryContent(content, photos);

  // Encrypt content before updating
  const encryptedContent = await encrypt(content.trim(), userId);

  // Prepare update data
  const updateData: any = { content: encryptedContent };
  if (tags !== undefined) {
    updateData.tags = validateTags(tags);
  }

  // Update the entry content and tags
  const { error } = await supabase
    .from('journal_entries')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;

  // Remove photos if any
  if (removedPhotos && removedPhotos.length > 0) {
    console.log('Processing photo removals:', removedPhotos);
    
    for (const photoUrl of removedPhotos) {
      try {
        // First, find the photo record in the database using the URL
        const { data: photoRecords, error: findError } = await supabase
          .from('journal_photos')
          .select('id, file_path, file_name')
          .eq('entry_id', id);
        
        if (findError) {
          console.error('Error finding photo records:', findError);
          continue;
        }
        
        // Determine matching photo by extracting the storage file path from the URL
        const extractPath = (url: string) => {
          try {
            const u = new URL(url);
            // Expect path like /storage/v1/object/(sign|public)/journal-photos/<file_path>
            const afterObject = u.pathname.split('/object/')[1];
            if (!afterObject) return null;
            const parts = afterObject.split('/');
            // parts[0] is 'sign' or 'public' or 'download'; next should be bucket id
            const bucketIdx = (parts[0] === 'sign' || parts[0] === 'public' || parts[0] === 'download') ? 1 : 0;
            const bucket = parts[bucketIdx];
            if (bucket !== 'journal-photos') return null;
            const filePath = parts.slice(bucketIdx + 1).join('/');
            return decodeURIComponent(filePath);
          } catch { return null; }
        };
        const targetPath = extractPath(photoUrl) || photoUrl;
        const matchingPhoto = photoRecords?.find(photo => photo.file_path === targetPath);
        
        if (matchingPhoto) {
          console.log('Found matching photo to delete:', matchingPhoto);
          
          // Delete from storage using the file_path from database
          const { error: storageError } = await supabase.storage
            .from('journal-photos')
            .remove([matchingPhoto.file_path]);
          
          if (storageError) {
            console.error('Error deleting photo from storage:', storageError);
          } else {
            console.log('Successfully deleted from storage:', matchingPhoto.file_path);
          }
          
          // Delete from database using the photo ID
          const { error: dbError } = await supabase
            .from('journal_photos')
            .delete()
            .eq('id', matchingPhoto.id);
          
          if (dbError) {
            console.error('Error deleting photo from database:', dbError);
          } else {
            console.log('Successfully deleted from database:', matchingPhoto.id);
          }
        } else {
          console.error('Could not find matching photo record for URL:', photoUrl);
        }
      } catch (error) {
        console.error('Error processing photo removal:', error);
      }
    }
  }

  // Upload new photos if any
  if (photos && photos.length > 0) {
    validatePhotos(photos);
    await checkPhotoLimit(id, photos);
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
