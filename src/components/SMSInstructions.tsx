
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Image, Clock, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SMSInstructions = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Updated to use Surge phone number from environment variable
  const surgePhoneNumber = import.meta.env.VITE_SURGE_PHONE_NUMBER || '+1 (555) 123-4567';

  const copyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText(surgePhoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Phone number copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the number manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <MessageSquare className="w-5 h-5" />
          Text Your Journal Entries
        </CardTitle>
        <CardDescription className="text-blue-700">
          Start journaling instantly by sending a text message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
          <Phone className="w-6 h-6 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Text your entries to:</p>
            <p className="text-lg font-bold text-blue-600">{surgePhoneNumber}</p>
          </div>
          <Button
            onClick={copyPhoneNumber}
            variant="outline"
            size="sm"
            className="border-blue-200 hover:bg-blue-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Send text messages</p>
              <p className="text-sm text-gray-600">Just text your thoughts and they'll be saved to your journal</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Image className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Include photos</p>
              <p className="text-sm text-gray-600">Attach photos to your messages to capture visual memories</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Daily grouping</p>
              <p className="text-sm text-gray-600">Multiple texts on the same day are grouped into one entry</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> You can send multiple messages throughout the day and they'll all be combined into a single journal entry with timestamps.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
