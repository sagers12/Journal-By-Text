import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { testType, phoneNumber } = await req.json()

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const testMessages = {
      short: "Short test message",
      medium: "This is a medium length test message. ".repeat(50), // ~1,750 chars
      long: "This is a long test message that approaches the limit. ".repeat(170), // ~9,350 chars
      exactLimit: "A".repeat(10000), // Exactly 10,000 chars
      oversized: "This message exceeds the limit. ".repeat(350), // ~11,550 chars
      unicode: "Testing unicode: 🌟 Hello world! 👋 This message contains emojis and special characters: àáâãäåæçèéêë 中文 العربية русский 日本語 🎉✨🚀💫",
      empty: "",
      whitespace: "   \n\t   \n   ",
      phoneVerification: "YES",
      subscription: "How do I subscribe?",
      help: "HELP"
    }

    const testMessage = testMessages[testType as keyof typeof testMessages] || testMessages.short

    // Create test webhook payload
    const webhookPayload = {
      type: "message.received",
      account_id: "test_account",
      data: {
        id: `test_msg_${Date.now()}`,
        body: testMessage,
        conversation: {
          contact: {
            phone_number: phoneNumber
          },
          id: "test_conversation"
        },
        received_at: new Date().toISOString(),
        attachments: []
      }
    }

    // Log test initiation
    await supabaseClient
      .from('sms_test_logs')
      .insert({
        test_type: testType,
        phone_number: phoneNumber,
        message_content: testMessage,
        character_count: testMessage.length,
        byte_count: new TextEncoder().encode(testMessage).length,
        payload: webhookPayload
      })

    // Send to SMS webhook
    const webhookResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sms-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': 'test_signature'
      },
      body: JSON.stringify(webhookPayload)
    })

    const responseStatus = webhookResponse.status
    const responseText = await webhookResponse.text()

    return new Response(JSON.stringify({
      success: true,
      testType,
      messageLength: testMessage.length,
      webhookStatus: responseStatus,
      webhookResponse: responseText,
      testMessage: testMessage.substring(0, 100) + (testMessage.length > 100 ? '...' : '')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('SMS test error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})