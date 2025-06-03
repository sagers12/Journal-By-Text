
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Split, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Entry } from '@/types/entry';

interface EntrySplitterProps {
  entry: Entry;
  onSplit: (entryId: string, splitEntries: { content: string; timestamp?: string }[]) => Promise<void>;
  onClose: () => void;
}

export const EntrySplitter = ({ entry, onSplit, onClose }: EntrySplitterProps) => {
  const [splitEntries, setSplitEntries] = useState(() => {
    // Parse the entry content to extract timestamped segments
    const segments = entry.content.split(/\n\n(?=\[)/);
    return segments.map(segment => ({
      content: segment.trim(),
      timestamp: segment.match(/^\[([^\]]+)\]/)?.[1] || ''
    }));
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateSegment = (index: number, newContent: string) => {
    setSplitEntries(prev => prev.map((segment, i) => 
      i === index ? { ...segment, content: newContent } : segment
    ));
  };

  const removeSegment = (index: number) => {
    if (splitEntries.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "You must have at least one entry segment",
        variant: "destructive"
      });
      return;
    }
    setSplitEntries(prev => prev.filter((_, i) => i !== index));
  };

  const addSegment = () => {
    setSplitEntries(prev => [...prev, { content: '', timestamp: new Date().toLocaleTimeString() }]);
  };

  const handleSplit = async () => {
    setLoading(true);
    try {
      const validEntries = splitEntries.filter(segment => segment.content.trim());
      if (validEntries.length === 0) {
        throw new Error('At least one entry must have content');
      }
      
      await onSplit(entry.id, validEntries);
      onClose();
      toast({
        title: "Entry split successfully",
        description: `Created ${validEntries.length} separate entries`,
      });
    } catch (error: any) {
      toast({
        title: "Error splitting entry",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            Split Journal Entry
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-gray-600 mb-4">
            Split this SMS journal entry into separate entries. Each segment will become its own journal entry.
          </p>
          
          {splitEntries.map((segment, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Entry {index + 1}</h4>
                {splitEntries.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeSegment(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {segment.timestamp && (
                <p className="text-xs text-gray-500">Timestamp: {segment.timestamp}</p>
              )}
              
              <Textarea
                value={segment.content}
                onChange={(e) => updateSegment(index, e.target.value)}
                placeholder="Entry content..."
                className="min-h-[100px]"
              />
              
              {index < splitEntries.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={addSegment}>
              Add Segment
            </Button>
            <Button onClick={handleSplit} disabled={loading} className="ml-auto">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Splitting...' : 'Split Entry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
