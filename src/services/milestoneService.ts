import { supabase } from '@/integrations/supabase/client';
import type { Entry } from '@/types/entry';

const MILESTONE_DAYS = [2, 5, 10, 15, 20, 25, 40, 50, 75, 100];

const CELEBRATION_OPENERS = [
  "You're doing great!",
  "Nice work!",
  "Keep it up!",
  "You're on a hot streak!",
  "Journaling is becoming second nature!",
  "You were made to keep a journal.",
  "Way to go!",
  "This is awesome!",
  "Keep the journal entries coming!",
  "You're on a roll!"
];

export const calculateCurrentStreak = (entries: Entry[]): number => {
  if (entries.length === 0) return 0;

  // Sort entries by date descending
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
  );

  // Get unique entry dates
  const uniqueDates = [...new Set(sortedEntries.map(entry => entry.entry_date))].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  const latestEntryDate = new Date(uniqueDates[0]);
  const daysDifference = Math.floor((today.getTime() - latestEntryDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If the latest entry is more than 1 day old, streak is broken
  if (daysDifference > 1) return 0;

  // Calculate streak
  let currentStreak = 1;
  let streakDate = new Date(uniqueDates[0]);

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i]);
    const expectedDate = new Date(streakDate);
    expectedDate.setDate(expectedDate.getDate() - 1);

    if (prevDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      currentStreak++;
      streakDate = prevDate;
    } else {
      break;
    }
  }

  return currentStreak;
};

export const checkForMilestone = async (userId: string, currentStreak: number): Promise<boolean> => {
  // Check if this streak number is a milestone
  if (!MILESTONE_DAYS.includes(currentStreak)) {
    return false;
  }

  // Check if we've already sent a congratulatory message for this milestone
  const { data: existingMessages } = await supabase
    .from('sms_messages')
    .select('id')
    .eq('user_id', userId)
    .ilike('message_content', `%${currentStreak} days in a row%`)
    .limit(1);

  // If we've already sent a message for this milestone, don't send another
  if (existingMessages && existingMessages.length > 0) {
    return false;
  }

  return true;
};

export const sendMilestoneMessage = async (userId: string, streak: number, phoneNumber: string): Promise<void> => {
  try {
    // Get a random celebration opener
    const randomOpener = CELEBRATION_OPENERS[Math.floor(Math.random() * CELEBRATION_OPENERS.length)];
    
    const message = `${randomOpener} That's ${streak} days in a row you've submitted a journal entry. Keep up the good work! Your future self will thank you.`;

    // Call the edge function to send the SMS
    const { error } = await supabase.functions.invoke('send-milestone-message', {
      body: {
        phone_number: phoneNumber,
        message: message,
        user_id: userId
      }
    });

    if (error) {
      console.error('Error sending milestone message:', error);
      throw error;
    }

    console.log(`Milestone message sent for ${streak} day streak to user ${userId}`);
  } catch (error) {
    console.error('Failed to send milestone message:', error);
    throw error;
  }
};