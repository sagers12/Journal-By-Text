import { useState } from "react";
import { JournalHeader } from "@/components/JournalHeader";
import { JournalControls } from "@/components/JournalControls";
import { JournalContent } from "@/components/JournalContent";
import { JournalModals } from "@/components/JournalModals";
import { JournalStats } from "@/components/JournalStats";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useJournalEntries } from "@/hooks/useJournalEntries";
import { useRealtime } from "@/hooks/useRealtime";
import type { Entry } from "@/types/entry";

interface SearchFilters {
  text: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  source?: 'web' | 'sms' | 'all';
  hasPhotos?: boolean;
}

export const JournalDashboard = () => {
  const { user } = useAuth();
  const { entries, isLoading, createEntry, deleteEntry, updateEntry, error } = useJournalEntries(user?.id);
  useRealtime(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ text: '', source: 'all' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const formatEntryTitle = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const addEntry = async (content: string, photos?: File[], tags?: string[]) => {
    const now = new Date();
    const title = `Journal Entry - ${formatEntryTitle(now)}`;
    
    try {
      await createEntry({
        content: content.trim(),
        title,
        tags: tags || [],
        photos: photos || []
      });
      
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to create entry:', error);
      // Error handling is done in the hook
    }
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      deleteEntry(id);
    }
  };

  const handleEditEntry = (id: string, newContent: string, tags?: string[], photos?: File[]) => {
    updateEntry({ id, content: newContent.trim(), tags, photos });
  };

  const applyFilters = (entries: Entry[], filters: SearchFilters): Entry[] => {
    let filtered = entries;

    // Text search
    if (filters.text) {
      const searchLower = filters.text.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.content.toLowerCase().includes(searchLower) ||
        entry.title.toLowerCase().includes(searchLower) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(entry => entry.timestamp >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => entry.timestamp <= toDate);
    }

    // Tag filters
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(entry =>
        entry.tags && filters.tags!.some(filterTag =>
          entry.tags!.some(entryTag => entryTag.toLowerCase().includes(filterTag.toLowerCase()))
        )
      );
    }

    // Source filter
    if (filters.source && filters.source !== 'all') {
      filtered = filtered.filter(entry => entry.source === filters.source);
    }

    // Photo filter
    if (filters.hasPhotos) {
      filtered = filtered.filter(entry => entry.photos && entry.photos.length > 0);
    }

    return filtered;
  };

  const filteredEntries = applyFilters(entries, searchFilters);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-slate-600">Loading your journal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading journal entries</div>
          <div className="text-slate-600 text-sm">Please check your connection and try again</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <JournalHeader />
        
        {/* Show stats if there are entries */}
        {entries.length > 0 && <JournalStats entries={entries} />}
        
        {/* Only show search bar and export button if there are entries */}
        {entries.length > 0 && (
          <JournalControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onFiltersChange={setSearchFilters}
            onExportClick={() => setIsExportOpen(true)}
          />
        )}

        <JournalContent
          entries={entries}
          filteredEntries={filteredEntries}
          onDeleteEntry={handleDeleteEntry}
          onEditEntry={handleEditEntry}
          onCreateEntry={() => setIsFormOpen(true)}
        />

        {/* Floating Action Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center z-10"
        >
          <Plus className="w-6 h-6" />
        </button>

        <JournalModals
          isFormOpen={isFormOpen}
          isExportOpen={isExportOpen}
          entries={entries}
          onFormClose={() => setIsFormOpen(false)}
          onExportClose={() => setIsExportOpen(false)}
          onEntrySubmit={addEntry}
        />
      </div>
    </div>
  );
};
