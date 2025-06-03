
import { supabase } from '@/integrations/supabase/client';

export const uploadPhotos = async (photos: File[], entryId: string, userId: string) => {
  const photoPromises = photos.map(async (photo) => {
    const fileExt = photo.name.split('.').pop()?.toLowerCase();
    const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('journal-photos')
      .upload(fileName, photo);

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

export const checkPhotoLimit = async (entryId: string, newPhotosCount: number) => {
  const { data: existingPhotos } = await supabase
    .from('journal_photos')
    .select('id')
    .eq('entry_id', entryId);

  const currentPhotoCount = existingPhotos?.length || 0;
  
  if (currentPhotoCount + newPhotosCount > 10) {
    throw new Error(`Cannot add ${newPhotosCount} photos. Maximum 10 photos per entry (currently ${currentPhotoCount})`);
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
