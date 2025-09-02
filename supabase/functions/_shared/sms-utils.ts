// Simple SMS utilities for production environment

/**
 * Mask phone number for logging purposes
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

/**
 * Create a Surge API payload with production phone number ID
 */
export function createSurgePayload(
  recipientPhoneNumber: string,
  messageBody: string,
  attachments: any[] = []
) {
  const payload = {
    conversation: {
      contact: {
        phone_number: recipientPhoneNumber
      },
      phone_number: {
        id: Deno.env.get('SURGE_PROD_PHONE_ID') || ''
      }
    },
    body: messageBody,
    attachments: attachments
  };
  
  return payload;
}