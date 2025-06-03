
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";

interface SearchFilters {
  text: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  source?: 'web' | 'sms' | 'all';
}

interface JournalControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onExportClick: () => void;
}

export const JournalControls = ({
  searchTerm,
  onSearchChange,
  onFiltersChange,
  onExportClick
}: JournalControlsProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <SearchBar 
            searchTerm={searchTerm} 
            onSearchChange={onSearchChange}
            onFiltersChange={onFiltersChange}
          />
        </div>
        <Button
          variant="outline"
          onClick={onExportClick}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
    </div>
  );
};
