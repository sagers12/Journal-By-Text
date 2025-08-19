import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestResult {
  success: boolean
  step: string
  message: string
  data?: any
  error?: string
}

interface ComprehensiveTestResult {
  success: boolean
  testType: string
  phoneNumber: string
  userId?: string
  steps: TestResult[]
  summary: {
    userFound: boolean
    userVerified: boolean
    hasActiveSubscription: boolean
    entryCreated: boolean
    milestoneTriggered: boolean
    totalSteps: number
    passedSteps: number
  }
  timing: {
    startTime: string
    endTime: string
    durationMs: number
  }
}

// Simplified encryption for testing (not for production use)
async function simpleEncrypt(text: string, userId: string): Promise<string> {
  // For testing purposes, just prefix with TEST_ENC: to simulate encryption
  return `TEST_ENC:${btoa(text + ':' + userId)}`
}

// Simplified streak calculation for testing
async function calculateTestStreak(supabaseClient: any, userId: string): Promise<number> {
  try {
    const { data: entries, error } = await supabaseClient
      .from('journal_entries')
      .select('entry_date')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(10) // Only check recent entries for test

    if (error || !entries || entries.length === 0) return 0

    // Get unique entry dates
    const uniqueDates = [...new Set(entries.map((entry: any) => entry.entry_date))].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    )

    if (uniqueDates.length === 0) return 0

    const today = new Date()
    const latestEntryDate = new Date(uniqueDates[0])
    const daysDifference = Math.floor((today.getTime() - latestEntryDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // If the latest entry is more than 1 day old, streak is broken
    if (daysDifference > 1) return 0

    // Calculate streak (simplified version)
    let currentStreak = 1
    let streakDate = new Date(uniqueDates[0])

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i])
      const expectedDate = new Date(streakDate)
      expectedDate.setDate(expectedDate.getDate() - 1)

      if (prevDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        currentStreak++
        streakDate = prevDate
      } else {
        break
      }
    }

    return currentStreak
  } catch (error) {
    console.error('Error calculating test streak:', error)
    return 0
  }
}

// Simplified journal entry creation for testing
async function createTestJournalEntry(
  supabaseClient: any,
  messageBody: string,
  userId: string,
  messageId: string,
  fromPhone: string,
  lengthMetrics?: { charCount: number; byteCount: number; truncated: boolean }
): Promise<{ success: boolean; entryId?: string; messageId: string }> {
  try {
    // Get user's timezone
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .single()
    
    const userTimezone = userProfile?.timezone || 'UTC'
    
    // Calculate entry date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const correctedEntryDate = formatter.format(new Date())
    
    console.log(`Test: Calculated entry date for timezone ${userTimezone}: ${correctedEntryDate}`)

    // Encrypt message content (simplified for testing)
    const encryptedMessageContent = await simpleEncrypt(messageBody || '', userId)

    // Store SMS message record
    const { data: smsMessage, error: smsError } = await supabaseClient
      .from('sms_messages')
      .insert({
        user_id: userId,
        surge_message_id: messageId,
        phone_number: fromPhone,
        message_content: encryptedMessageContent,
        entry_date: correctedEntryDate,
        processed: false,
        char_count: lengthMetrics?.charCount || 0,
        byte_count: lengthMetrics?.byteCount || 0,
        truncated: lengthMetrics?.truncated || false
      })
      .select()
      .single()

    if (smsError) {
      console.error('Test: Error storing SMS message:', smsError)
      throw new Error(`Failed to store SMS message: ${smsError.message}`)
    }

    console.log('Test: SMS message stored:', smsMessage.id)

    // Check for existing journal entry for today
    const { data: existingEntry, error: existingError } = await supabaseClient
      .from('journal_entries')
      .select('id, content')
      .eq('user_id', userId)
      .eq('entry_date', correctedEntryDate)
      .eq('source', 'sms')
      .single()

    let entryId: string

    if (existingEntry) {
      // Update existing entry (simplified for testing)
      const updatedContent = messageBody ? `${existingEntry.content}\n\nTEST: ${messageBody}` : existingEntry.content
      const encryptedUpdatedContent = await simpleEncrypt(updatedContent, userId)
      
      const { data: updatedEntry, error: updateError } = await supabaseClient
        .from('journal_entries')
        .update({ content: encryptedUpdatedContent })
        .eq('id', existingEntry.id)
        .select()
        .single()

      if (updateError) {
        console.error('Test: Error updating journal entry:', updateError)
        throw updateError
      }
      
      console.log('Test: Updated existing entry:', updatedEntry.id)
      entryId = existingEntry.id
    } else {
      // Create new journal entry
      const title = `Test Journal Entry - ${new Date(correctedEntryDate).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`
      
      const content = messageBody || 'Test message content'
      
      // Encrypt content and title for testing
      const encryptedContent = await simpleEncrypt(content, userId)
      const encryptedTitle = await simpleEncrypt(title, userId)

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
        console.error('Test: Error creating journal entry:', entryError)
        throw entryError
      }

      console.log('Test: Created new entry:', newEntry.id)
      entryId = newEntry.id
    }

    // Update SMS message as processed
    await supabaseClient
      .from('sms_messages')
      .update({ processed: true, entry_id: entryId })
      .eq('id', smsMessage.id)

    console.log('Test: SMS processing complete')

    return { success: true, entryId, messageId }
  } catch (error) {
    console.error('Test: Journal entry creation failed:', error)
    return { success: false, messageId }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { testType, phoneNumber, messageContent } = await req.json()

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const result: ComprehensiveTestResult = {
      success: true,
      testType,
      phoneNumber,
      steps: [],
      summary: {
        userFound: false,
        userVerified: false,
        hasActiveSubscription: false,
        entryCreated: false,
        milestoneTriggered: false,
        totalSteps: 0,
        passedSteps: 0
      },
      timing: {
        startTime: new Date().toISOString(),
        endTime: '',
        durationMs: 0
      }
    }

    // Step 1: Look up user by phone number
    try {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, phone_verified, phone_number, timezone, reminder_enabled')
        .eq('phone_number', phoneNumber)
        .single()

      if (profileError) {
        result.steps.push({
          success: false,
          step: 'user_lookup',
          message: 'User not found by phone number',
          error: profileError.message
        })
      } else {
        result.steps.push({
          success: true,
          step: 'user_lookup', 
          message: `User found: ${profile.id}`,
          data: {
            userId: profile.id,
            verified: profile.phone_verified,
            timezone: profile.timezone,
            reminderEnabled: profile.reminder_enabled
          }
        })
        result.userId = profile.id
        result.summary.userFound = true
        result.summary.userVerified = profile.phone_verified
      }
    } catch (error) {
      result.steps.push({
        success: false,
        step: 'user_lookup',
        message: 'Failed to lookup user',
        error: error.message
      })
    }

    // Step 2: Check subscription status (only if user found)
    if (result.userId) {
      try {
        const { data: subscription, error: subError } = await supabaseClient
          .from('subscribers')
          .select('subscribed, is_trial, trial_end, subscription_tier')
          .eq('user_id', result.userId)
          .single()

        if (subscription) {
          const hasAccess = subscription.subscribed || (
            subscription.is_trial && new Date(subscription.trial_end) > new Date()
          )
          
          result.steps.push({
            success: true,
            step: 'subscription_check',
            message: `Subscription status: ${hasAccess ? 'Active' : 'Expired'}`,
            data: {
              subscribed: subscription.subscribed,
              isTrial: subscription.is_trial,
              trialEnd: subscription.trial_end,
              tier: subscription.subscription_tier,
              hasAccess
            }
          })
          result.summary.hasActiveSubscription = hasAccess
        } else {
          result.steps.push({
            success: false,
            step: 'subscription_check',
            message: 'No subscription record found',
            error: subError?.message
          })
        }
      } catch (error) {
        result.steps.push({
          success: false,
          step: 'subscription_check',
          message: 'Failed to check subscription',
          error: error.message
        })
      }
    }

    // Step 3: Process journal entry (only if user found and verified)
    if (result.userId && result.summary.userVerified) {
      try {
        const testMessageContent = messageContent || `Test message from ${testType} test at ${new Date().toISOString()}`
        const messageId = `test_${Date.now()}`
        
        const journalResult = await createTestJournalEntry(
          supabaseClient,
          testMessageContent,
          result.userId,
          messageId,
          phoneNumber,
          {
            charCount: testMessageContent.length,
            byteCount: new TextEncoder().encode(testMessageContent).length,
            truncated: false
          }
        )

        if (journalResult.success) {
          result.steps.push({
            success: true,
            step: 'journal_entry_creation',
            message: `Journal entry created successfully`,
            data: {
              entryId: journalResult.entryId,
              messageId: journalResult.messageId,
              contentLength: testMessageContent.length
            }
          })
          result.summary.entryCreated = true

          // Step 4: Check current streak and milestones
          try {
            const currentStreak = await calculateTestStreak(supabaseClient, result.userId)
            
            result.steps.push({
              success: true,
              step: 'streak_calculation',
              message: `Current streak calculated: ${currentStreak} days`,
              data: {
                streak: currentStreak,
                qualifiesForMilestone: currentStreak >= 2
              }
            })

            if (currentStreak >= 2) {
              result.summary.milestoneTriggered = true
            }
          } catch (error) {
            result.steps.push({
              success: false,
              step: 'streak_calculation',
              message: 'Failed to calculate streak',
              error: error.message
            })
          }
        } else {
          result.steps.push({
            success: false,
            step: 'journal_entry_creation',
            message: 'Failed to create journal entry',
            error: 'Journal entry creation returned failure'
          })
        }

      } catch (error) {
        result.steps.push({
          success: false,
          step: 'journal_entry_creation',
          message: 'Failed to create journal entry',
          error: error.message
        })
      }
    } else if (result.userId && !result.summary.userVerified) {
      result.steps.push({
        success: false,
        step: 'journal_entry_creation',
        message: 'Cannot process journal entry - user phone not verified',
        error: 'Phone verification required'
      })
    }

    // Step 5: Verify entry exists in database
    if (result.summary.entryCreated && result.userId) {
      try {
        const { data: entries, error: entriesError } = await supabaseClient
          .from('journal_entries')
          .select('id, title, source, entry_date, created_at')
          .eq('user_id', result.userId)
          .eq('source', 'sms')
          .order('created_at', { ascending: false })
          .limit(1)

        if (entries && entries.length > 0) {
          result.steps.push({
            success: true,
            step: 'entry_verification',
            message: 'Journal entry verified in database',
            data: {
              entryId: entries[0].id,
              entryDate: entries[0].entry_date,
              createdAt: entries[0].created_at
            }
          })
        } else {
          result.steps.push({
            success: false,
            step: 'entry_verification',
            message: 'Journal entry not found in database',
            error: entriesError?.message
          })
        }
      } catch (error) {
        result.steps.push({
          success: false,
          step: 'entry_verification',
          message: 'Failed to verify journal entry',
          error: error.message
        })
      }
    }

    // Calculate summary
    result.summary.totalSteps = result.steps.length
    result.summary.passedSteps = result.steps.filter(step => step.success).length
    result.success = result.summary.passedSteps > 0

    const endTime = Date.now()
    result.timing.endTime = new Date().toISOString()
    result.timing.durationMs = endTime - startTime

    // Log comprehensive test result
    await supabaseClient
      .from('sms_test_logs')
      .insert({
        test_type: `comprehensive_${testType}`,
        phone_number: phoneNumber,
        message_content: messageContent || `${testType} test message`,
        character_count: (messageContent || '').length,
        byte_count: new TextEncoder().encode(messageContent || '').length,
        success: result.success,
        webhook_status: 200,
        webhook_response: JSON.stringify(result),
        payload: { 
          testType,
          comprehensiveTest: true,
          steps: result.steps.length,
          passedSteps: result.summary.passedSteps 
        }
      })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Comprehensive SMS test error:', error)
    
    const errorResult: ComprehensiveTestResult = {
      success: false,
      testType: 'unknown',
      phoneNumber: 'unknown',
      steps: [{
        success: false,
        step: 'initialization',
        message: 'Test initialization failed',
        error: error.message
      }],
      summary: {
        userFound: false,
        userVerified: false,
        hasActiveSubscription: false,
        entryCreated: false,
        milestoneTriggered: false,
        totalSteps: 1,
        passedSteps: 0
      },
      timing: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - startTime
      }
    }

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})