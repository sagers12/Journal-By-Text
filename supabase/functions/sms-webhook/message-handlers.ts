/**
 * Message sending utilities for SMS responses
 */

export async function sendInstructionMessage(conversationId: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !conversationId) {
    console.log('Missing Surge credentials or conversation ID for instruction message')
    return
  }

  try {
    const responsePayload = {
      conversation: { id: conversationId },
      body: 'Perfect! Your phone is now verified. To create a journal entry, simply send a message to this number. You can view all your entries on our website.'
    }

    const surgeUrl = `https://api.surge.app/accounts/${surgeAccountId}/messages`
    
    const surgeResponse = await fetch(surgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responsePayload)
    })

    if (surgeResponse.ok) {
      console.log('Instruction message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send instruction message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending instruction message:', error)
  }
}

export async function sendConfirmationMessage(conversationId: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !conversationId) {
    console.log('Missing Surge credentials or conversation ID for confirmation message')
    return
  }

  try {
    const responsePayload = {
      conversation: { id: conversationId },
      body: '✅ Your journal entry has been saved!'
    }

    const surgeUrl = `https://api.surge.app/accounts/${surgeAccountId}/messages`
    
    const surgeResponse = await fetch(surgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${surgeApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responsePayload)
    })

    if (surgeResponse.ok) {
      console.log('Confirmation message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send confirmation message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending confirmation message:', error)
  }
}