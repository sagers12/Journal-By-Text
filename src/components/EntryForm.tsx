
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
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
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const photoFiles = photos.map(p => p.file);
      onSubmit(content.trim(), photoFiles.length > 0 ? photoFiles : undefined, tagArray.length > 0 ? tagArray : undefined);
      setContent("");
      setPhotos([]);
      setTags("");
    }
  };

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
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                What's on your mind?
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts here... What happened today? How are you feeling? What are you grateful for?"
                className="w-full h-32 border-slate-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                autoFocus
              />
              <div className="text-right text-sm text-slate-400 mt-2">
                {content.length} characters
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
                placeholder="mood, work, gratitude (separate with commas)"
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Image className="w-4 h-4 inline mr-2" />
                Photos (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="w-full border-dashed border-slate-300 hover:border-blue-500 h-20"
              >
                <Image className="w-6 h-6 mr-2 text-slate-400" />
                Click to add photos
              </Button>
              
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
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!content.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Save Entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
