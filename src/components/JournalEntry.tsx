
import { useState } from "react";
import { Edit3, Trash2, Calendar, Smartphone, Monitor, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Entry } from "@/components/JournalDashboard";

interface JournalEntryProps {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
}

export const JournalEntry = ({ entry, onDelete, onEdit }: JournalEntryProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== entry.content) {
      onEdit(entry.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(entry.content);
    setIsEditing(false);
  };

  return (
    <div 
      className="group bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 hover:border-slate-300"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span className="font-medium text-sm">{entry.title}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            {entry.source === 'sms' ? (
              <Smartphone className="w-3 h-3" />
            ) : (
              <Monitor className="w-3 h-3" />
            )}
            <span className="text-xs">{formatTime(entry.timestamp)}</span>
          </div>
        </div>
        
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
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full min-h-[100px] border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base mb-0">
            {entry.content}
          </p>
        </div>
      )}
    </div>
  );
};
