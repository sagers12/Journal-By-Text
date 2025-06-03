
export interface Entry {
  id: string;
  content: string;
  timestamp: Date;
  title: string;
  source: 'web' | 'sms';
  photos?: string[]; // URLs or base64 strings for photos
  tags?: string[];
}
