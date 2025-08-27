
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
}

export const JournalControls = ({
  searchTerm,
  onSearchChange,
  onFiltersChange
}: JournalControlsProps) => {
  return (
    <div className="mb-8">
      <SearchBar 
        searchTerm={searchTerm} 
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
};
