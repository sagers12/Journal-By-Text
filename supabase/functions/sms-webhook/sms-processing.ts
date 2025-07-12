/**
 * SMS message processing logic
 */

import { encrypt, decrypt } from './encryption.ts'

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
    // Check if this streak number is a milestone
    if (!MILESTONE_DAYS.includes(streak)) return;

    // Check if we've already sent a congratulatory message for this milestone
    const { data: existingMessages } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('user_id', userId)
      .ilike('message_content', `%${streak} days in a row%`)
      .limit(1);

    // If we've already sent a message for this milestone, don't send another
    if (existingMessages && existingMessages.length > 0) return;

    // Get Surge credentials
    const surgeApiToken = Deno.env.get('SURGE_API_TOKEN');
    const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID');
    const surgePhoneNumber = Deno.env.get('SURGE_PHONE_NUMBER');

    if (!surgeApiToken || !surgeAccountId || !surgePhoneNumber) {
      console.error('Surge credentials not configured for milestone messaging');
      return;
    }

    // Get a random celebration opener
    const randomOpener = CELEBRATION_OPENERS[Math.floor(Math.random() * CELEBRATION_OPENERS.length)];
    const message = `${randomOpener} That's ${streak} days in a row you've submitted a journal entry. Keep up the good work! Your future self will thank you.`;

    console.log(`Sending milestone message for ${streak} day streak to ${phoneNumber}`);

    // Send SMS via Surge API
    const surgeResponse = await fetch('https://api.surgehq.ai/v1/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: surgeAccountId,
        recipient: phoneNumber,
        message: message,
        from: surgePhoneNumber
      }),
    });

    if (surgeResponse.ok) {
      const surgeResult = await surgeResponse.json();
      console.log('Milestone message sent successfully:', surgeResult);

      // Store the milestone message in our database for tracking
      const entryDate = new Date().toISOString().split('T')[0];
      await supabase
        .from('sms_messages')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          message_content: message,
          entry_date: entryDate,
          processed: true,
          surge_message_id: surgeResult.id || null
        });
    } else {
      console.error('Failed to send milestone message:', await surgeResponse.text());
    }
  } catch (error) {
    console.error('Error in milestone messaging:', error);
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
      entry_date: entryDate,
      processed: false
    })
    .select()
    .single()

  if (smsError) {
    console.error('Error storing SMS message:', smsError)
    throw new Error(`Failed to store SMS message: ${smsError.message}`)
  }

  console.log('SMS message stored:', smsMessage.id)

  // Check for existing journal entry for today
  const { data: existingEntry, error: existingError } = await supabaseClient
    .from('journal_entries')
    .select('id, content')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
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
    const title = `Journal Entry - ${new Date(entryDate).toLocaleDateString('en-US', { 
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
        entry_date: entryDate,
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
    if (currentStreak > 1) { // Only check milestones for streaks > 1
      await checkAndSendMilestone(supabaseClient, userId, currentStreak, fromPhone);
    }
  } catch (error) {
    console.error('Error checking milestone:', error);
    // Don't fail the entry creation if milestone check fails
  }

  console.log('SMS processing complete')

  return { success: true, entryId, messageId }
}