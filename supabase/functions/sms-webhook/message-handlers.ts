/**
 * Message sending utilities for SMS responses
 */

export async function sendInstructionMessage(phoneNumber: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for instruction message')
    return
  }

  try {
    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: 'Perfect! Your phone is now verified. To create a journal entry, simply send a message to this number. You can view all your entries on our website.',
      attachments: []
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

export async function sendConfirmationMessage(phoneNumber: string) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for confirmation message')
    return
  }

  try {
    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: '✅ Your journal entry has been saved!',
      attachments: []
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