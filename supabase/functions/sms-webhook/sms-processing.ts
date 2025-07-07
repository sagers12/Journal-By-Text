/**
 * SMS message processing logic
 */

import { encrypt, decrypt } from './encryption.ts'

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

  console.log('SMS processing complete')

  return { success: true, entryId, messageId }
}