import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { processJournalEntry } from '../sms-webhook/sms-processing.ts'
import { calculateCurrentStreak } from '../sms-webhook/sms-processing.ts'

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
        
        const journalResult = await processJournalEntry(
          supabaseClient,
          testMessageContent,
          result.userId,
          messageId,
          phoneNumber,
          new Date().toISOString().split('T')[0],
          [],
          {
            charCount: testMessageContent.length,
            byteCount: new TextEncoder().encode(testMessageContent).length,
            truncated: false
          }
        )

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
          const currentStreak = await calculateCurrentStreak(supabaseClient, result.userId)
          
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