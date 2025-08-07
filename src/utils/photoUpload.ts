
import { supabase } from '@/integrations/supabase/client';

export const uploadPhotos = async (photos: File[], entryId: string, userId: string) => {
  const photoPromises = photos.map(async (photo) => {
    const fileExt = photo.name.split('.').pop()?.toLowerCase();
    const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('journal-photos')
      .upload(fileName, photo, {
        contentType: photo.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Save photo record
    const { error: photoError } = await supabase
      .from('journal_photos')
      .insert({
        entry_id: entryId,
        file_path: fileName,
        file_name: photo.name,
        file_size: photo.size,
        mime_type: photo.type
      });

    if (photoError) throw photoError;

    return fileName;
  });

  return Promise.all(photoPromises);
};

export const checkPhotoLimit = async (entryId: string, newPhotos: File[]) => {
  const maxTotalSize = 10 * 1024 * 1024; // 10MB total per entry
  
  // Get existing photos and their sizes
  const { data: existingPhotos } = await supabase
    .from('journal_photos')
    .select('file_size')
    .eq('entry_id', entryId);

  const currentTotalSize = existingPhotos?.reduce((sum, photo) => sum + (photo.file_size || 0), 0) || 0;
  const newPhotosSize = newPhotos.reduce((sum, photo) => sum + photo.size, 0);
  const totalSize = currentTotalSize + newPhotosSize;
  
  if (totalSize > maxTotalSize) {
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    const currentSizeMB = (currentTotalSize / (1024 * 1024)).toFixed(1);
    throw new Error(`Cannot add photos. Total size would be ${totalSizeMB}MB (currently ${currentSizeMB}MB, max 10MB per entry)`);
  }
};

export const deleteEntryPhotos = async (entryId: string) => {
  const { data: photos } = await supabase
    .from('journal_photos')
    .select('file_path')
    .eq('entry_id', entryId);

  if (photos && photos.length > 0) {
    const filePaths = photos.map(photo => photo.file_path);
    const { error: storageError } = await supabase.storage
      .from('journal-photos')
      .remove(filePaths);

    if (storageError) {
      console.error('Error deleting photos from storage:', storageError);
    }
  }
};
