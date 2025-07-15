/**
 * SMS message processing logic
 */

import { encrypt, decrypt } from './encryption.ts'

// Function to format phone number to international format (same as working reminders)
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit US number, add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // If it already starts with +, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Default: assume US number and add +1
  return `+1${digitsOnly}`;
}

// Function to send milestone SMS using the correct API
async function sendMilestoneSMS(phoneNumber: string, message: string, surgeApiToken: string, surgeAccountId: string) {
  // Use the EXACT SAME payload structure as working reminders
  const payload = {
    conversation: {
      contact: {
        phone_number: phoneNumber
      }
    },
    body: message,
    attachments: []
  }

  console.log('Sending milestone to Surge API:', JSON.stringify(payload, null, 2));

  try {
    // Use the EXACT SAME API endpoint as working reminders
    const response = await fetch(`https://api.surge.app/accounts/${surgeAccountId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const responseText = await response.text();
    console.log('Milestone Surge API response status:', response.status);
    console.log('Milestone Surge API response body:', responseText);

    if (!response.ok) {
      console.error('Milestone Surge error:', responseText)
      throw new Error(`Failed to send milestone SMS: ${responseText}`)
    }

    const result = JSON.parse(responseText);
    console.log('Milestone SMS sent successfully via Surge:', result)
    return result;
  } catch (error) {
    console.error(`Failed to send milestone SMS to ${phoneNumber}:`, error)
    throw error
  }
}

// Constants for milestone functionality
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

const calculateCurrentStreak = async (supabase: any, userId: string): Promise<number> => {
  try {
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('entry_date')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });

    if (error || !entries || entries.length === 0) return 0;

    // Get unique entry dates
    const uniqueDates = [...new Set(entries.map((entry: any) => entry.entry_date))].sort((a, b) => 
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
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
};

const checkAndSendMilestone = async (supabase: any, userId: string, streak: number, phoneNumber: string): Promise<void> => {
  try {
    console.log(`=== MILESTONE CHECK START ===`);
    console.log(`User ${userId}: Checking milestone for ${streak} day streak`);
    
    // Check if this streak number is a milestone
    if (!MILESTONE_DAYS.includes(streak)) {
      console.log(`User ${userId}: ${streak} days is not a milestone (valid: ${MILESTONE_DAYS.join(', ')})`);
      return;
    }

    console.log(`User ${userId}: ✅ ${streak} days IS a milestone!`);

    // Check if we've already sent a congratulatory message for this milestone
    const { data: existingMessages } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('user_id', userId)
      .ilike('message_content', `%${streak} days in a row%`)
      .limit(1);

    // If we've already sent a message for this milestone, don't send another
    if (existingMessages && existingMessages.length > 0) {
      console.log(`User ${userId}: Already sent milestone message for ${streak} days - skipping`);
      return;
    }

    console.log(`User ${userId}: No existing milestone message found for ${streak} days - proceeding`);

    // Get Surge credentials (no longer need surgePhoneNumber)
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN');
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID');

    if (!surgeApiToken || !surgeAccountId) {
      console.error('Surge credentials not configured for milestone messaging:', {
        hasToken: !!surgeApiToken,
        hasAccountId: !!surgeAccountId
      });
      return;
    }

    console.log(`User ${userId}: Surge credentials verified`);

    // Create milestone message
    const randomOpener = CELEBRATION_OPENERS[Math.floor(Math.random() * CELEBRATION_OPENERS.length)];
    const message = `${randomOpener} That's ${streak} days in a row you've submitted a journal entry. Keep up the good work! Your future self will thank you.`;

    console.log(`User ${userId}: Generated milestone message: "${message}"`);
    
    // Format phone number using the same approach as working reminders
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log(`User ${userId}: Original phone: ${phoneNumber}, Formatted: ${formattedPhoneNumber}`);

    console.log(`User ${userId}: Sending milestone message for ${streak} day streak to ${formattedPhoneNumber}`);

    // Use the EXACT SAME API approach as working reminders
    await sendMilestoneSMS(formattedPhoneNumber, message, surgeApiToken, surgeAccountId);

    console.log(`User ${userId}: Milestone message sent successfully via Surge API`);

    // Store the milestone message in our database for tracking
    const entryDate = new Date().toISOString().split('T')[0];
    const { error: dbError } = await supabase
      .from('sms_messages')
      .insert({
        user_id: userId,
        phone_number: formattedPhoneNumber,
        message_content: message,
        entry_date: entryDate,
        processed: true,
        surge_message_id: null
      });

    if (dbError) {
      console.error(`User ${userId}: Error storing milestone message in database:`, dbError);
    } else {
      console.log(`User ${userId}: Milestone message stored in database successfully`);
    }

    console.log(`=== MILESTONE CHECK COMPLETE ===`);
  } catch (error) {
    console.error(`User ${userId}: Error in milestone messaging:`, error);
  }
};

export async function processPhoneVerification(
  supabaseClient: any,
  messageBody: string,
  userId: string,
  messageId: string,
  fromPhone: string,
  entryDate: string
) {
  console.log('Processing YES response for phone verification')
  
  // Update phone verification status
  const { error: verifyError } = await supabaseClient
    .from('profiles')
    .update({ phone_verified: true })
    .eq('id', userId)

  if (verifyError) {
    console.error('Error updating phone verification:', verifyError)
  } else {
    console.log('Phone verified successfully for user:', userId)
  }

  // Store the YES message
  await supabaseClient
    .from('sms_messages')
    .insert({
      user_id: userId,
      surge_message_id: messageId,
      phone_number: fromPhone,
      message_content: messageBody,
      entry_date: entryDate,
      processed: true
    })

  return { success: true, action: 'phone_verified', messageId }
}

export async function processJournalEntry(
  supabaseClient: any,
  messageBody: string,
  userId: string,
  messageId: string,
  fromPhone: string,
  entryDate: string,
  attachments: any[]
) {
  // Get user's timezone to determine the correct entry date
  const { data: userProfile } = await supabaseClient
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .single();
  
  const userTimezone = userProfile?.timezone || 'UTC';
  
  // Convert current time to user's timezone to get the correct entry date
  const now = new Date();
  const userDate = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
  const correctedEntryDate = userDate.toISOString().split('T')[0];

  // Encrypt message content before storing
  const encryptedMessageContent = await encrypt(messageBody, userId)

  // Store SMS message record first
  const { data: smsMessage, error: smsError } = await supabaseClient
    .from('sms_messages')
    .insert({
      user_id: userId,
      surge_message_id: messageId,
      phone_number: fromPhone,
      message_content: encryptedMessageContent,
      entry_date: correctedEntryDate,
      processed: false
    })
    .select()
    .single()

  if (smsError) {
    console.error('Error storing SMS message:', smsError)
    throw new Error(`Failed to store SMS message: ${smsError.message}`)
  }

  console.log('SMS message stored:', smsMessage.id)

  // Check for existing journal entry for today (using corrected entry date)
  const { data: existingEntry, error: existingError } = await supabaseClient
    .from('journal_entries')
    .select('id, content')
    .eq('user_id', userId)
    .eq('entry_date', correctedEntryDate)
    .eq('source', 'sms')
    .single()

  console.log('Existing entry check:', { hasExisting: !!existingEntry, existingError })

  let entryId: string

  if (existingEntry) {
    // Decrypt existing content, append new message, then re-encrypt
    let decryptedExistingContent = existingEntry.content
    try {
      // Try to decrypt existing content (it might be encrypted)
      if (existingEntry.content.startsWith('ENC:')) {
        decryptedExistingContent = await decrypt(existingEntry.content, userId)
      }
    } catch (error) {
      console.error('Failed to decrypt existing content, using as-is:', error)
    }
    
    const updatedContent = `${decryptedExistingContent}\n\n${messageBody}`
    const encryptedUpdatedContent = await encrypt(updatedContent, userId)
    
    const { data: updatedEntry, error: updateError } = await supabaseClient
      .from('journal_entries')
      .update({ content: encryptedUpdatedContent })
      .eq('id', existingEntry.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating journal entry:', updateError)
      throw updateError
    }
    
    console.log('Updated existing entry:', updatedEntry.id)
    entryId = existingEntry.id
  } else {
    // Create new journal entry
    const title = `Journal Entry - ${new Date(correctedEntryDate).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })}`
    
    const content = messageBody
    
    // Encrypt content and title before storing
    const encryptedContent = await encrypt(content, userId)
    const encryptedTitle = await encrypt(title, userId)

    const { data: newEntry, error: entryError } = await supabaseClient
      .from('journal_entries')
      .insert({
        user_id: userId,
        content: encryptedContent,
        title: encryptedTitle,
        source: 'sms',
        entry_date: correctedEntryDate,
        tags: []
      })
      .select()
      .single()

    if (entryError) {
      console.error('Error creating journal entry:', entryError)
      throw entryError
    }

    console.log('Created new entry:', newEntry.id)
    entryId = newEntry.id
  }

  // Process attachments (photos) if any
  if (attachments && attachments.length > 0) {
    console.log('Processing attachments:', attachments.length)
    
    for (const attachment of attachments) {
      if (attachment.type === 'image' && attachment.url) {
        try {
          // Download the image
          const imageResponse = await fetch(attachment.url)
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer()
            const fileExt = 'jpg' // Default to jpg for images
            const fileName = `${userId}/${entryId}/${Date.now()}.${fileExt}`
            
            // Upload to Supabase storage
            const { error: uploadError } = await supabaseClient.storage
              .from('journal-photos')
              .upload(fileName, imageBuffer, {
                contentType: 'image/jpeg'
              })

            if (uploadError) {
              console.error('Error uploading photo:', uploadError)
            } else {
              // Save photo record
              await supabaseClient
                .from('journal_photos')
                .insert({
                  entry_id: entryId,
                  file_path: fileName,
                  file_name: `sms_photo_${Date.now()}.${fileExt}`,
                  file_size: imageBuffer.byteLength,
                  mime_type: 'image/jpeg'
                })
              
              console.log('Photo uploaded and saved:', fileName)
            }
          }
        } catch (photoError) {
          console.error('Error processing photo attachment:', photoError)
        }
      }
    }
  }

  // Update SMS message as processed
  await supabaseClient
    .from('sms_messages')
    .update({ processed: true, entry_id: entryId })
    .eq('id', smsMessage.id)

  // Check for milestone streak and send congratulatory message if needed
  try {
    const currentStreak = await calculateCurrentStreak(supabaseClient, userId);
    if (currentStreak >= 2) { // Check milestones for streaks of 2 or higher
      await checkAndSendMilestone(supabaseClient, userId, currentStreak, fromPhone);
    }
  } catch (error) {
    console.error('Error checking milestone:', error);
    // Don't fail the entry creation if milestone check fails
  }

  console.log('SMS processing complete')

  return { success: true, entryId, messageId }
}