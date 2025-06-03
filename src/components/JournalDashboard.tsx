
import { useState } from "react";
import { JournalHeader } from "@/components/JournalHeader";
import { SearchBar } from "@/components/SearchBar";
import { JournalEntry } from "@/components/JournalEntry";
import { EntryForm } from "@/components/EntryForm";
import { ExportModal } from "@/components/ExportModal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export const JournalDashboard = () => {
  const { user } = useAuth();
  const { entries, isLoading, createEntry, deleteEntry, updateEntry } = useJournalEntries(user?.id);
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

  const addEntry = (content: string, photos?: File[], tags?: string[]) => {
    const now = new Date();
    const title = `Journal Entry - ${formatEntryTitle(now)}`;
    
    createEntry({
      content: content.trim(),
      title,
      tags: tags || [],
      photos: photos || []
    });
    
    setIsFormOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
  };

  const handleEditEntry = (id: string, newContent: string) => {
    updateEntry({ id, content: newContent.trim() });
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

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <JournalHeader />
        
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <SearchBar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm}
                onFiltersChange={setSearchFilters}
              />
            </div>
            {entries.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {filteredEntries.length === 0 && entries.length === 0 ? (
          <EmptyState onCreateEntry={() => setIsFormOpen(true)} />
        ) : (
          <div className="space-y-6 mb-20">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-slate-600 text-lg mb-2">No entries match your search</div>
                <div className="text-slate-400 text-sm">Try adjusting your search terms or filters</div>
              </div>
            ) : (
              <>
                <div className="text-sm text-slate-600 mb-4">
                  Showing {filteredEntries.length} of {entries.length} entries
                </div>
                {filteredEntries.map((entry) => (
                  <JournalEntry 
                    key={entry.id} 
                    entry={entry} 
                    onDelete={handleDeleteEntry}
                    onEdit={handleEditEntry}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center z-10"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Entry Form Modal */}
        {isFormOpen && (
          <EntryForm 
            onSubmit={addEntry}
            onClose={() => setIsFormOpen(false)}
          />
        )}

        {/* Export Modal */}
        {isExportOpen && (
          <ExportModal
            entries={entries}
            onClose={() => setIsExportOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
