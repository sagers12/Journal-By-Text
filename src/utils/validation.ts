
export const validateEntryContent = (content: string) => {
  if (!content.trim()) {
    throw new Error('Content cannot be empty');
  }

  if (content.length > 10000) {
    throw new Error('Content too long (max 10,000 characters)');
  }
};

export const validatePhotos = (photos: File[]) => {
  if (photos.length > 10) {
    throw new Error('Too many photos (max 10)');
  }

  photos.forEach((photo) => {
    const fileExt = photo.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      throw new Error(`Invalid file type: ${photo.type}`);
    }

    if (photo.size > 10 * 1024 * 1024) {
      throw new Error(`File too large: ${photo.name} (max 10MB)`);
    }
  });
};

export const validateTags = (tags: string[]) => {
  return tags.filter(tag => tag.trim().length > 0).slice(0, 10);
};
