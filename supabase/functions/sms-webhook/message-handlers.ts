/**
 * Message sending utilities for SMS responses
 */

import Stripe from 'https://esm.sh/stripe@14.21.0'

// Function to create Stripe checkout URL for subscription reminder
async function createStripeCheckoutUrl(email: string): Promise<string> {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.log('Stripe secret key not configured, using fallback URL')
      return 'https://journalbytext.com'
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    
    // Check for existing customer
    const customers = await stripe.customers.list({ email: email, limit: 1 })
    let customerId
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    }

    // Create checkout session for monthly plan
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Monthly Subscription' },
            unit_amount: 499, // $4.99
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://journalbytext.com/success',
      cancel_url: 'https://journalbytext.com/cancel',
    })

    return session.url || 'https://journalbytext.com'
  } catch (error) {
    console.error('Error creating Stripe checkout URL:', error)
    return 'https://journalbytext.com'
  }
}

export async function sendInstructionMessage(phoneNumber: string, isDevEnvironment: boolean = false) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for instruction message')
    return
  }

  try {
    // Determine app URL based on environment
    const appUrl = isDevEnvironment 
      ? Deno.env.get('DEV_APP_URL') || 'https://dev-journal-dop24vhye-ryans-projects-e481d356.vercel.app'
      : (Deno.env.get('APP_URL') || 'https://journalbytext.com')

    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: `Perfect! Your phone is now verified. To create a journal entry, simply send a message to this number. You can view all your entries on our website at ${appUrl}`,
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

export async function sendConfirmationMessage(phoneNumber: string, isDevEnvironment: boolean = false) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for confirmation message')
    return
  }

  try {
    // Environment-specific confirmation message
    const confirmationText = isDevEnvironment 
      ? '✅ [DEV] Your journal entry has been saved!'
      : '✅ Your journal entry has been saved!'

    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: confirmationText,
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

export async function sendSubscriptionReminderMessage(phoneNumber: string, userEmail: string = '', isDevEnvironment: boolean = false) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for subscription reminder message')
    return
  }

  try {
    // Generate Stripe checkout link for monthly plan (only for production)
    const checkoutUrl = isDevEnvironment 
      ? 'https://dev-journal-dop24vhye-ryans-projects-e481d356.vercel.app'
      : await createStripeCheckoutUrl(userEmail)
    
    const subscriptionText = isDevEnvironment
      ? `[DEV] Your trial has expired. Visit the dev site to continue: ${checkoutUrl}`
      : `Hey, still looking to use Journal By Text? We'd love to get you journaling again. Your free trial has already expired, but you can continue with one of our paid plans! Here's the link to subscribe: ${checkoutUrl}`
    
    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: subscriptionText,
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
      console.log('Subscription reminder message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send subscription reminder message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending subscription reminder message:', error)
  }
}

export async function sendFirstEntryPromptMessage(phoneNumber: string, isDevEnvironment: boolean = false) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for first entry prompt message')
    return
  }

  try {
    const promptText = isDevEnvironment
      ? "[DEV] Alright, time to make your first entry! It's easy. Just reply to this message and we'll add it to your journal. If you're not sure what to write about, just respond to this prompt: Why am I starting a journal and what am I going to do to ensure I stick with it?"
      : "Alright, time to make your first entry! It's easy. Just reply to this message and we'll add it to your journal. If you're not sure what to write about, just respond to this prompt: Why am I starting a journal and what am I going to do to ensure I stick with it?"

    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: promptText,
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
      console.log('First entry prompt message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send first entry prompt message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending first entry prompt message:', error)
  }
}

export async function sendFirstJournalEntryMessage(phoneNumber: string, isDevEnvironment: boolean = false) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for first journal entry message')
    return
  }

  try {
    // Environment-specific app URL
    const appUrl = isDevEnvironment 
      ? 'https://dev-journal-dop24vhye-ryans-projects-e481d356.vercel.app/sign-in'
      : 'https://journalbytext.com/sign-in'

    const congratsText = isDevEnvironment
      ? `[DEV] You're on your way! While it's a small step, writing in your journal is a gateway to better mental and emotional health, improved memory and creative, and most importantly, a written record of your life, your thoughts, and what mattered to you. Remember, you can always view your entries on the web by going here 👉 ${appUrl}`
      : `You're on your way! While it's a small step, writing in your journal is a gateway to better mental and emotional health, improved memory and creative, and most importantly, a written record of your life, your thoughts, and what mattered to you. Remember, you can always view your entries on the web by going here 👉 ${appUrl}`

    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: congratsText,
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
      console.log('First journal entry message sent successfully')
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send first journal entry message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending first journal entry message:', error)
  }
}

export async function sendWelcomeMessage(phoneNumber: string, isDevEnvironment: boolean = false) {
  const surgeApiToken = Deno.env.get('SURGE_API_TOKEN')
  const surgeAccountId = Deno.env.get('SURGE_ACCOUNT_ID')

  if (!surgeApiToken || !surgeAccountId || !phoneNumber) {
    console.log('Missing Surge credentials or phone number for welcome message')
    return
  }

  try {
    // Environment-specific app URL
    const appUrl = isDevEnvironment 
      ? 'https://dev-journal-dop24vhye-ryans-projects-e481d356.vercel.app'
      : (Deno.env.get('APP_URL') || 'https://journalbytext.com')
    const signUpUrl = `${appUrl}/sign-up`
    
    const welcomeText = isDevEnvironment
      ? `[DEV] Welcome to Journal By Text! You just took the first step to building a lasting journaling habit. Every message you send here will become part of your private journal. Tap this link to finish the sign-up process and get journaling 👉 ${signUpUrl}`
      : `Welcome to Journal By Text! You just took the first step to building a lasting journaling habit. Every message you send here will become part of your private journal. Tap this link to finish the sign-up process and get journaling 👉 ${signUpUrl}`
    
    const responsePayload = {
      conversation: {
        contact: {
          phone_number: phoneNumber
        }
      },
      body: welcomeText,
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
      console.log('Welcome message sent successfully to:', phoneNumber.replace(/.(?=.{4})/g, '*'))
    } else {
      const errorText = await surgeResponse.text()
      console.error('Failed to send welcome message:', surgeResponse.status, errorText)
    }
  } catch (error) {
    console.error('Error sending welcome message:', error)
  }
}