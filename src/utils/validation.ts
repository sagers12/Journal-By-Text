
export const validateEntryContent = (content: string) => {
  if (!content.trim()) {
    throw new Error('Content cannot be empty');
  }

  if (content.length > 10000) {
    throw new Error('Content too long (max 10,000 characters)');
  }
};

export const validatePhotos = (photos: File[]) => {
  const maxTotalSize = 10 * 1024 * 1024; // 10MB total
  const maxIndividualSize = 10 * 1024 * 1024; // 10MB per photo
  
  // Calculate total size
  const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
  if (totalSize > maxTotalSize) {
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    throw new Error(`Total photo size too large: ${totalSizeMB}MB (max 10MB per entry)`);
  }

  photos.forEach((photo) => {
    const fileExt = photo.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      throw new Error(`Invalid file type: ${photo.type}`);
    }

    if (photo.size > maxIndividualSize) {
      throw new Error(`File too large: ${photo.name} (max 10MB)`);
    }
  });
};

export const validateTags = (tags: string[]) => {
  return tags.filter(tag => tag.trim().length > 0).slice(0, 10);
};
