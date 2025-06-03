
import { useState, useEffect } from "react";
import { JournalHeader } from "@/components/JournalHeader";
import { SearchBar } from "@/components/SearchBar";
import { JournalEntry } from "@/components/JournalEntry";
import { EntryForm } from "@/components/EntryForm";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";

export interface Entry {
  id: string;
  content: string;
  timestamp: Date;
  title: string;
  source: 'web' | 'sms';
}

export const JournalDashboard = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const addEntry = (content: string) => {
    const now = new Date();
    const newEntry: Entry = {
      id: Date.now().toString(),
      content: content.trim(),
      timestamp: now,
      title: `Journal Entry - ${formatEntryTitle(now)}`,
      source: 'web'
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

  const filteredEntries = entries.filter(entry =>
    entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <JournalHeader />
        
        <div className="mb-8">
          <SearchBar 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm}
          />
        </div>

        {filteredEntries.length === 0 && searchTerm === "" ? (
          <EmptyState onCreateEntry={() => setIsFormOpen(true)} />
        ) : (
          <div className="space-y-6 mb-20">
            {filteredEntries.length === 0 && searchTerm !== "" ? (
              <div className="text-center py-16">
                <div className="text-slate-600 text-lg mb-2">No entries found for "{searchTerm}"</div>
                <div className="text-slate-400 text-sm">Try a different search term</div>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <JournalEntry 
                  key={entry.id} 
                  entry={entry} 
                  onDelete={deleteEntry}
                  onEdit={editEntry}
                />
              ))
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
      </div>
    </div>
  );
};
