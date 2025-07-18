
import { useState } from "react";
import { X, Send, Image, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface EntryFormProps {
  onSubmit: (content: string, photos?: File[], tags?: string[]) => void;
  onClose: () => void;
}

interface PhotoFile {
  file: File;
  previewUrl: string;
}

export const EntryForm = ({ onSubmit, onClose }: EntryFormProps) => {
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [tags, setTags] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input validation constants
  const MAX_CONTENT_LENGTH = 10000;
  const MAX_TOTAL_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB total
  const MAX_INDIVIDUAL_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB per photo
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const validatePhotoFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`;
    }
    if (file.size > MAX_INDIVIDUAL_PHOTO_SIZE) {
      return `File size too large. Maximum size: ${MAX_INDIVIDUAL_PHOTO_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  };

  const getTotalPhotoSize = () => {
    return photos.reduce((sum, photo) => sum + photo.file.size, 0);
  };

  const validateTotalPhotoSize = (newFiles: File[]): string | null => {
    const currentSize = getTotalPhotoSize();
    const newFilesSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSize = currentSize + newFilesSize;
    
    if (totalSize > MAX_TOTAL_PHOTO_SIZE) {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
      return `Total photo size too large: ${totalSizeMB}MB (max 10MB per entry)`;
    }
    return null;
  };

  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/\s+/g, ' ');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Check total size first
    const totalSizeError = validateTotalPhotoSize(fileArray);
    if (totalSizeError) {
      alert(totalSizeError);
      e.target.value = '';
      return;
    }

    // Validate each file individually
    for (const file of fileArray) {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        alert(validationError);
        e.target.value = '';
        return;
      }
    }

    // Add all valid files
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, {
            file,
            previewUrl: event.target.result as string
          }]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    const sanitizedContent = sanitizeInput(content);
    
    // Validation
    if (!sanitizedContent) {
      alert('Please enter some content for your journal entry');
      return;
    }

    if (sanitizedContent.length > MAX_CONTENT_LENGTH) {
      alert(`Content too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed`);
      return;
    }

    setIsSubmitting(true);

    try {
      const tagArray = tags.split(',')
        .map(tag => sanitizeInput(tag))
        .filter(tag => tag && tag.length > 0)
        .slice(0, 10); // Limit to 10 tags

      const photoFiles = photos.map(p => p.file);
      
      await onSubmit(
        sanitizedContent, 
        photoFiles.length > 0 ? photoFiles : undefined, 
        tagArray.length > 0 ? tagArray : undefined
      );
      
      // Reset form
      setContent("");
      setPhotos([]);
      setTags("");
    } catch (error) {
      console.error('Error submitting entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentLength = content.length;
  const isContentValid = contentLength > 0 && contentLength <= MAX_CONTENT_LENGTH;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">New Journal Entry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                What's on your mind? *
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts here... What happened today? How are you feeling? What are you grateful for?"
                className={`w-full h-32 border-slate-200 focus:border-blue-500 focus:ring-blue-500 resize-none ${
                  !isContentValid && content.length > 0 ? 'border-red-300 focus:border-red-500' : ''
                }`}
                autoFocus
                maxLength={MAX_CONTENT_LENGTH}
                disabled={isSubmitting}
              />
              <div className={`text-right text-sm mt-2 ${
                contentLength > MAX_CONTENT_LENGTH * 0.9 ? 'text-orange-500' : 
                contentLength > MAX_CONTENT_LENGTH ? 'text-red-500' : 'text-slate-400'
              }`}>
                {contentLength} / {MAX_CONTENT_LENGTH} characters
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Tag className="w-4 h-4 inline mr-2" />
                Tags (optional)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="mood, work, gratitude (separate with commas, max 10)"
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Image className="w-4 h-4 inline mr-2" />
                Photos (optional, max 10MB total)
              </label>
              <input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="w-full border-dashed border-slate-300 hover:border-blue-500 h-20"
                disabled={isSubmitting}
              >
                <Image className="w-6 h-6 mr-2 text-slate-400" />
                Click to add photos
              </Button>
              
              {photos.length > 0 && (
                <div className="text-sm text-slate-500 mt-2">
                  Total size: {(getTotalPhotoSize() / (1024 * 1024)).toFixed(1)}MB / 10MB
                </div>
              )}
              
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.previewUrl}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-slate-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isContentValid || isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
