
import { useState } from "react";
import { Search, Filter, Calendar, Tag, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchFilters {
  text: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  source?: 'web' | 'sms' | 'all';
  hasPhotos?: boolean;
}

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange, onFiltersChange }: SearchBarProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    text: searchTerm,
    source: 'all'
  });

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = { text: '', source: 'all' };
    setFilters(clearedFilters);
    onSearchChange('');
    onFiltersChange?.(clearedFilters);
    setShowAdvanced(false);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || (filters.tags && filters.tags.length > 0) || (filters.source && filters.source !== 'all') || filters.hasPhotos;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-600 w-5 h-5 z-10" />
        <input
          type="text"
          placeholder="Search your journal entries..."
          value={searchTerm}
          onChange={(e) => {
            onSearchChange(e.target.value);
            handleFilterChange({ text: e.target.value });
          }}
          className="w-full pl-12 pr-16 py-4 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-slate-500 text-slate-800"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`h-8 w-8 p-0 ${showAdvanced ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200 space-y-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date From
              </label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date To
              </label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Tag className="w-4 h-4 inline mr-2" />
              Tags
            </label>
            <Input
              type="text"
              placeholder="Enter tags separated by commas"
              value={filters.tags?.join(', ') || ''}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                handleFilterChange({ tags: tags.length > 0 ? tags : undefined });
              }}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
            <div className="flex gap-2">
              {(['all', 'web', 'sms'] as const).map((source) => (
                <Button
                  key={source}
                  variant={filters.source === source ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange({ source })}
                  className="capitalize"
                >
                  {source}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Camera className="w-4 h-4 inline mr-2" />
              Photos
            </label>
            <Button
              variant={filters.hasPhotos ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange({ hasPhotos: filters.hasPhotos ? undefined : true })}
              className="flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              {filters.hasPhotos ? 'Show all entries' : 'Only with photos'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
