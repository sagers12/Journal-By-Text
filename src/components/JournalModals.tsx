
import { EntryForm } from "@/components/EntryForm";
import { ExportModal } from "@/components/ExportModal";
import type { Entry } from "@/types/entry";

interface JournalModalsProps {
  isFormOpen: boolean;
  isExportOpen: boolean;
  entries: Entry[];
  onFormClose: () => void;
  onExportClose: () => void;
  onEntrySubmit: (content: string, photos?: File[], tags?: string[]) => Promise<void>;
}

export const JournalModals = ({
  isFormOpen,
  isExportOpen,
  entries,
  onFormClose,
  onExportClose,
  onEntrySubmit
}: JournalModalsProps) => {
  return (
    <>
      {/* Entry Form Modal */}
      {isFormOpen && (
        <EntryForm 
          onSubmit={onEntrySubmit}
          onClose={onFormClose}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          entries={entries}
          onClose={onExportClose}
        />
      )}
    </>
  );
};
