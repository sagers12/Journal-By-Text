
import { useState } from "react";
import { X, Download, FileText, Calendar, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Entry } from "@/types/entry";

interface ExportModalProps {
  entries: Entry[];
  onClose: () => void;
}

export const ExportModal = ({ entries, onClose }: ExportModalProps) => {
  const [format, setFormat] = useState<'pdf' | 'txt'>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const getFilteredEntries = () => {
    let filtered = entries;
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(entry => entry.timestamp >= fromDate);
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => entry.timestamp <= toDate);
    }
    
    return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const exportAsText = () => {
    const filteredEntries = getFilteredEntries();
    let content = `My Journal Export\nGenerated on: ${new Date().toLocaleDateString()}\n\n`;
    
    filteredEntries.forEach((entry, index) => {
      content += `${index + 1}. ${entry.title}\n`;
      content += `${entry.timestamp.toLocaleString()}\n`;
      content += `Source: ${entry.source.toUpperCase()}\n`;
      if (entry.tags && entry.tags.length > 0) {
        content += `Tags: ${entry.tags.join(', ')}\n`;
      }
      content += `\n${entry.content}\n`;
      if (entry.photos && entry.photos.length > 0 && includePhotos) {
        content += `\nPhotos: ${entry.photos.length} attached\n`;
      }
      content += '\n---\n\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    // For now, we'll create a simple HTML version that can be printed as PDF
    const filteredEntries = getFilteredEntries();
    let htmlContent = `
      <html>
        <head>
          <title>My Journal Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            .entry { margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .entry-header { margin-bottom: 15px; color: #64748b; font-size: 14px; }
            .entry-content { margin-bottom: 15px; }
            .entry-tags { font-size: 12px; color: #2563eb; }
            .photo-note { font-style: italic; color: #64748b; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>My Journal Export</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Total entries: ${filteredEntries.length}</p>
    `;

    filteredEntries.forEach((entry, index) => {
      htmlContent += `
        <div class="entry">
          <div class="entry-header">
            <strong>${entry.title}</strong><br>
            ${entry.timestamp.toLocaleString()} | Source: ${entry.source.toUpperCase()}
          </div>
          <div class="entry-content">${entry.content}</div>
          ${entry.tags && entry.tags.length > 0 ? `<div class="entry-tags">Tags: ${entry.tags.join(', ')}</div>` : ''}
          ${entry.photos && entry.photos.length > 0 && includePhotos ? `<div class="photo-note">${entry.photos.length} photo(s) attached</div>` : ''}
        </div>
      `;
    });

    htmlContent += '</body></html>';

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url);
    if (newWindow) {
      newWindow.onload = () => {
        newWindow.print();
      };
    }
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (format === 'txt') {
        exportAsText();
      } else {
        exportAsPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const filteredCount = getFilteredEntries().length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">Export Journal</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Format</label>
            <div className="flex gap-2">
              <Button
                variant={format === 'pdf' ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat('pdf')}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                variant={format === 'txt' ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat('txt')}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Text
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-photos"
              checked={includePhotos}
              onCheckedChange={(checked) => setIncludePhotos(checked as boolean)}
            />
            <label htmlFor="include-photos" className="text-sm font-medium text-slate-700 flex items-center">
              <Image className="w-4 h-4 mr-2" />
              Include photos
            </label>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-600">
              <strong>{filteredCount}</strong> entries will be exported
              {dateFrom && ` from ${new Date(dateFrom).toLocaleDateString()}`}
              {dateTo && ` to ${new Date(dateTo).toLocaleDateString()}`}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredCount === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
};
