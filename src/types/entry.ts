
export interface Entry {
  id: string;
  content: string;
  timestamp: Date;
  title: string;
  source: 'web' | 'sms';
  photos?: string[]; // URLs from Supabase storage
  tags?: string[];
  entry_date: string; // For grouping daily entries
  user_id: string;
}

export interface Profile {
  id: string;
  phone_number?: string;
  phone_verified: boolean;
  timezone: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  reminder_timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface SMSMessage {
  id: string;
  user_id: string;
  phone_number: string;
  message_content: string;
  entry_date: string;
  received_at: string;
  processed: boolean;
  entry_id?: string;
}
