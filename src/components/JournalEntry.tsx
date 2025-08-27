
import { useState, useEffect } from "react";
import { Edit3, Trash2, Calendar, Smartphone, Monitor, Check, X, Tag, Image, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTimezone } from "@/hooks/useTimezone";
import { supabase } from "@/integrations/supabase/client";
import type { Entry } from "@/types/entry";

interface JournalEntryProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string, tags?: string[], photos?: File[], removedPhotos?: string[]) => void;
}

interface PhotoFile {
  file: File;
  previewUrl: string;
}

export const JournalEntry = ({ entry, onDelete, onEdit }: JournalEntryProps) => {
  const { formatTimeInUserTimezone, formatDateInUserTimezone } = useTimezone();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editTags, setEditTags] = useState<string>((entry.tags || []).join(', '));
  const [editPhotos, setEditPhotos] = useState<PhotoFile[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [showActions, setShowActions] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [smsMessageCount, setSmsMessageCount] = useState<number>(0);

  // Photo validation constants
  const MAX_PHOTOS = 10;
  const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  // Fetch SMS message count for this entry if it's from SMS source
  useEffect(() => {
    const fetchSMSMessageCount = async () => {
      if (entry.source === 'sms') {
        try {
          const { count } = await supabase
            .from('sms_messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', entry.user_id)
            .eq('entry_date', entry.entry_date);
          
          setSmsMessageCount(count || 0);
        } catch (error) {
          console.error('Error fetching SMS message count:', error);
          setSmsMessageCount(0);
        }
      } else {
        setSmsMessageCount(0);
      }
    };

    fetchSMSMessageCount();
  }, [entry.source, entry.user_id, entry.entry_date]);

  // Format the entry title
  const getFormattedTitle = () => {
    // entry_date is already in the correct date for the user's timezone
    // Don't convert it through timezone conversion as it will cause date shifts
    const entryDate = new Date(entry.entry_date + 'T12:00:00'); // Add noon time to avoid timezone shifts
    const date = entryDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    return date;
  };


  const validatePhotoFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      return `File size too large. Maximum size: ${MAX_PHOTO_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentPhotoCount = editPhotos.length + (entry.photos?.length || 0);
    if (currentPhotoCount + files.length > MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    Array.from(files).forEach(file => {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        alert(validationError);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEditPhotos(prev => [...prev, {
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

  const removeNewPhoto = (index: number) => {
    setEditPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (photoUrl: string) => {
    setRemovedPhotos(prev => [...prev, photoUrl]);
  };

  const handleSaveEdit = () => {
    const newTags = editTags.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && tag.length > 0)
      .slice(0, 10); // Limit to 10 tags
    
    const hasContentChanged = editContent.trim() !== entry.content;
    const hasTagsChanged = JSON.stringify(newTags) !== JSON.stringify(entry.tags || []);
    const hasPhotosAdded = editPhotos.length > 0;
    const hasPhotosRemoved = removedPhotos.length > 0;
    
    if (hasContentChanged || hasTagsChanged || hasPhotosAdded || hasPhotosRemoved) {
      const photoFiles = editPhotos.map(p => p.file);
      onEdit(
        entry.id, 
        editContent, 
        newTags, 
        photoFiles.length > 0 ? photoFiles : undefined,
        removedPhotos.length > 0 ? removedPhotos : undefined
      );
    }
    setIsEditing(false);
    setEditPhotos([]);
    setRemovedPhotos([]);
  };

  const handleCancelEdit = () => {
    setEditContent(entry.content);
    setEditTags((entry.tags || []).join(', '));
    setEditPhotos([]);
    setRemovedPhotos([]);
    setIsEditing(false);
  };

  // Get preview text (first four lines or 200 characters, whichever is shorter)
  const getPreviewText = (text: string) => {
    const lines = text.split('\n');
    const firstFourLines = lines.slice(0, 4).join('\n');
    
    if (firstFourLines.length <= 200) {
      return firstFourLines;
    }
    
    return text.substring(0, 200) + '...';
  };

  const previewText = getPreviewText(entry.content);
  const needsExpansion = entry.content !== previewText;

  return (
    <>
      <div 
        className="group bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 hover:border-slate-300"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
         {/* Header with title and actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4" />
              <span className="font-medium text-lg">{getFormattedTitle()}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              {entry.source === 'sms' ? (
                <Smartphone className="w-3 h-3" />
              ) : (
                <Monitor className="w-3 h-3" />
              )}
              <span className="text-xs">{formatTimeInUserTimezone(entry.timestamp)}</span>
            </div>
          </div>
          
          {/* Actions buttons */}
          {showActions && !isEditing && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(entry.id)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {isEditing && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveEdit}
                className="h-8 w-8 p-0 text-slate-400 hover:text-green-600 hover:bg-green-50"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[100px] border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
            
            {/* Tags editing section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Tag className="w-4 h-4 inline mr-2" />
                Tags (optional)
              </label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="mood, work, gratitude (separate with commas, max 10)"
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {/* Photo upload section in edit mode */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Image className="w-4 h-4 inline mr-2" />
                Add Photos (optional, max {MAX_PHOTOS} total)
              </label>
              <input
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id={`photo-upload-${entry.id}`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(`photo-upload-${entry.id}`)?.click()}
                className="w-full border-dashed border-slate-300 hover:border-blue-500 h-16"
                disabled={editPhotos.length + (entry.photos?.length || 0) >= MAX_PHOTOS}
              >
                <Image className="w-5 h-5 mr-2 text-slate-400" />
                {editPhotos.length + (entry.photos?.length || 0) >= MAX_PHOTOS ? 'Maximum photos reached' : 'Click to add photos'}
              </Button>
              
              {/* Show existing photos with remove option */}
              {entry.photos && entry.photos.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">Current Photos:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {entry.photos
                      .filter(photo => !removedPhotos.includes(photo))
                      .map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Existing photo ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-slate-200"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExistingPhoto(photo)}
                            className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Show new photos being added */}
              {editPhotos.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700 mb-2">New Photos:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {editPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.previewUrl}
                          alt={`New photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-slate-200"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewPhoto(index)}
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="prose prose-slate max-w-none">
              {/* Preview or full content */}
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base mb-2 break-words overflow-wrap-anywhere">
                {isExpanded ? entry.content : previewText}
              </p>
              
              {/* Show expand/collapse button if content is long */}
              {needsExpansion && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium text-sm mb-3"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>

            {/* Content that appears when expanded (only the remaining text) */}
            <CollapsibleContent>
              {/* This content is now empty as we show photos and tags outside */}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Photos - Only visible when NOT editing */}
        {!isEditing && entry.photos && entry.photos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-slate-600 mb-3">
              <Image className="w-4 h-4" />
              <span className="text-sm font-medium">{entry.photos.length} photo{entry.photos.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {entry.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Entry photo ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedPhoto(photo)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tags - Always visible (moved outside collapsible) */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-3 h-3 text-slate-500" />
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedPhoto}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
