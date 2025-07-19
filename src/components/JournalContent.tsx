
import { JournalEntry } from "@/components/JournalEntry";
import { EmptyState } from "@/components/EmptyState";
import type { Entry } from "@/types/entry";

interface JournalContentProps {
  entries: Entry[];
  filteredEntries: Entry[];
  onDeleteEntry: (id: string) => void;
  onEditEntry: (id: string, newContent: string, tags?: string[], photos?: File[]) => void;
  onCreateEntry: () => void;
}

export const JournalContent = ({
  entries,
  filteredEntries,
  onDeleteEntry,
  onEditEntry,
  onCreateEntry
}: JournalContentProps) => {
  if (filteredEntries.length === 0 && entries.length === 0) {
    return <EmptyState onCreateEntry={onCreateEntry} />;
  }

  return (
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
              onDelete={onDeleteEntry}
              onEdit={onEditEntry}
            />
          ))}
        </>
      )}
    </div>
  );
};
