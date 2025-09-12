import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  userId: string
  confirmationText: string
}

interface DeletionSummary {
  userId: string
  userEmail: string
  deletedRecords: {
    journalEntries: number
    journalPhotos: number
    smsMessages: number
    profileRecord: boolean
    subscriberRecord: boolean
    userPromptHistory: number
    smsConsents: number
    accountLockouts: number
    oversizedMessages: number
    phoneVerificationTokens: number
    securityEvents: number
    smsProcessingEvents: number
    subscriptionEvents: number
    trialReminderHistory: number
    weeklyRecapHistory: number
  }
  filesDeleted: string[]
  filesFailedToDelete: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the token and check admin status
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, is_active')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser?.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, confirmationText }: DeleteUserRequest = await req.json()

    // Validate inputs
    if (!userId || !confirmationText) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId and confirmationText are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (confirmationText !== 'DELETE') {
      return new Response(
        JSON.stringify({ success: false, error: 'Confirmation text must be "DELETE"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${user.email} initiating deletion of user ${userId}`)

    // Get user info before deletion
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's auth record for email
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    const userEmail = authUser?.user?.email || 'unknown@example.com'

    // Initialize deletion summary
    const summary: DeletionSummary = {
      userId,
      userEmail,
      deletedRecords: {
        journalEntries: 0,
        journalPhotos: 0,
        smsMessages: 0,
        profileRecord: false,
        subscriberRecord: false,
        userPromptHistory: 0,
        smsConsents: 0,
        accountLockouts: 0,
        oversizedMessages: 0,
        phoneVerificationTokens: 0,
        securityEvents: 0,
        smsProcessingEvents: 0,
        subscriptionEvents: 0,
        trialReminderHistory: 0,
        weeklyRecapHistory: 0
      },
      filesDeleted: [],
      filesFailedToDelete: []
    }

    // Step 1: Get all file paths before deleting records
    const { data: photoFiles } = await supabaseAdmin
      .from('journal_photos')
      .select('file_path')
      .eq('entry_id', userId) // This should be joined with journal_entries properly

    // Get photo file paths through journal entries
    const { data: userPhotos } = await supabaseAdmin
      .from('journal_photos')
      .select('file_path')
      .in('entry_id', 
        (await supabaseAdmin
          .from('journal_entries')
          .select('id')
          .eq('user_id', userId)
        ).data?.map(entry => entry.id) || []
      )

    const filePaths = userPhotos?.map(photo => photo.file_path) || []

    // Step 2: Delete all user data in correct order (most dependent first)
    
    // Delete journal photos
    const { data: deletedPhotos } = await supabaseAdmin
      .from('journal_photos')
      .delete()
      .in('entry_id', 
        (await supabaseAdmin
          .from('journal_entries')
          .select('id')
          .eq('user_id', userId)
        ).data?.map(entry => entry.id) || []
      )
      .select()

    summary.deletedRecords.journalPhotos = deletedPhotos?.length || 0

    // Delete journal entries
    const { data: deletedEntries } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.journalEntries = deletedEntries?.length || 0

    // Delete SMS messages
    const { data: deletedSMS } = await supabaseAdmin
      .from('sms_messages')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.smsMessages = deletedSMS?.length || 0

    // Delete user prompt history
    const { data: deletedPrompts } = await supabaseAdmin
      .from('user_prompt_history')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.userPromptHistory = deletedPrompts?.length || 0

    // Delete SMS consents
    const { data: deletedConsents } = await supabaseAdmin
      .from('sms_consents')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.smsConsents = deletedConsents?.length || 0

    // Delete account lockouts
    const { data: deletedLockouts } = await supabaseAdmin
      .from('account_lockouts')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.accountLockouts = deletedLockouts?.length || 0

    // Delete oversized messages
    const { data: deletedOversized } = await supabaseAdmin
      .from('oversized_messages')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.oversizedMessages = deletedOversized?.length || 0

    // Delete phone verification tokens
    const { data: deletedTokens } = await supabaseAdmin
      .from('phone_verification_tokens')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.phoneVerificationTokens = deletedTokens?.length || 0

    // Delete security events
    const { data: deletedSecurityEvents } = await supabaseAdmin
      .from('security_events')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.securityEvents = deletedSecurityEvents?.length || 0

    // Delete SMS processing events
    const { data: deletedSmsProcessing } = await supabaseAdmin
      .from('sms_processing_events')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.smsProcessingEvents = deletedSmsProcessing?.length || 0

    // Delete subscription events
    const { data: deletedSubscriptionEvents } = await supabaseAdmin
      .from('subscription_events')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.subscriptionEvents = deletedSubscriptionEvents?.length || 0

    // Delete trial reminder history
    const { data: deletedTrialHistory } = await supabaseAdmin
      .from('trial_reminder_history')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.trialReminderHistory = deletedTrialHistory?.length || 0

    // Delete weekly recap history
    const { data: deletedWeeklyHistory } = await supabaseAdmin
      .from('weekly_recap_history')
      .delete()
      .eq('user_id', userId)
      .select()

    summary.deletedRecords.weeklyRecapHistory = deletedWeeklyHistory?.length || 0

    // Delete subscriber record
    const { error: subscriberError } = await supabaseAdmin
      .from('subscribers')
      .delete()
      .eq('user_id', userId)

    summary.deletedRecords.subscriberRecord = !subscriberError

    // Delete profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    summary.deletedRecords.profileRecord = !profileDeleteError

    // Step 3: Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Failed to delete auth user:', authDeleteError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to delete authentication record',
          partialSummary: summary 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Delete files from storage
    if (filePaths.length > 0) {
      const { data: deletedFiles, error: storageError } = await supabaseAdmin.storage
        .from('journal-photos')
        .remove(filePaths)

      if (storageError) {
        console.error('Storage deletion error:', storageError)
        summary.filesFailedToDelete = filePaths
      } else {
        summary.filesDeleted = filePaths
      }
    }

    // Log the deletion for audit purposes
    console.log(`User ${userId} successfully deleted by admin ${user.email}`)
    console.log('Deletion summary:', JSON.stringify(summary, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User successfully deleted',
        summary 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})