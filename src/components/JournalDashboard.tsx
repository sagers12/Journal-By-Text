
import { useState, useEffect } from "react";
import { JournalHeader } from "@/components/JournalHeader";
import { SearchBar } from "@/components/SearchBar";
import { JournalEntry } from "@/components/JournalEntry";
import { EntryForm } from "@/components/EntryForm";
import { ExportModal } from "@/components/ExportModal";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Entry } from "@/types/entry";

interface SearchFilters {
  text: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  source?: 'web' | 'sms' | 'all';
}

export const JournalDashboard = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ text: '', source: 'all' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load entries from localStorage on mount
  useEffect(() => {
    const savedEntries = localStorage.getItem("journal-entries");
    if (savedEntries) {
      const parsed = JSON.parse(savedEntries);
      setEntries(parsed.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      })));
    }
  }, []);

  // Save entries to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem("journal-entries", JSON.stringify(entries));
  }, [entries]);

  const formatEntryTitle = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const addEntry = (content: string, photos?: string[], tags?: string[]) => {
    const now = new Date();
    const newEntry: Entry = {
      id: Date.now().toString(),
      content: content.trim(),
      timestamp: now,
      title: `Journal Entry - ${formatEntryTitle(now)}`,
      source: 'web',
      photos,
      tags
    };
    setEntries(prev => [newEntry, ...prev]);
    setIsFormOpen(false);
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const editEntry = (id: string, newContent: string) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id 
        ? { ...entry, content: newContent.trim() }
        : entry
    ));
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
                    onDelete={deleteEntry}
                    onEdit={editEntry}
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
