// Shared utility for environment detection and Surge phone number management

interface SurgeEnvironmentConfig {
  phoneNumberId: string;
  phoneNumber: string;
  isDevEnvironment: boolean;
}

/**
 * Determines the environment and returns the appropriate Surge phone configuration
 * based on various detection methods
 */
export function getSurgeEnvironmentConfig(
  destinationPhone?: string,
  isDevEnvironment?: boolean
): SurgeEnvironmentConfig {
  // Method 1: Use explicit isDevEnvironment flag if provided
  if (isDevEnvironment !== undefined) {
    return isDevEnvironment ? getDevConfig() : getProdConfig();
  }
  
  // Method 2: Detect from destination phone number (for webhook processing)
  if (destinationPhone) {
    const devPhoneNumber = Deno.env.get('SURGE_DEV_PHONE_NUMBER') || '+18889849624';
    if (destinationPhone === devPhoneNumber) {
      return getDevConfig();
    }
  }
  
  // Method 3: Check if dev secrets exist (fallback detection)
  const hasDevSecrets = !!(Deno.env.get('DEV_SUPABASE_URL') && Deno.env.get('SURGE_DEV_PHONE_ID'));
  if (hasDevSecrets) {
    return getDevConfig();
  }
  
  // Default to production
  return getProdConfig();
}

/**
 * Get development environment Surge configuration
 */
function getDevConfig(): SurgeEnvironmentConfig {
  return {
    phoneNumberId: Deno.env.get('SURGE_DEV_PHONE_ID') || '',
    phoneNumber: Deno.env.get('SURGE_DEV_PHONE_NUMBER') || '+18889849624',
    isDevEnvironment: true
  };
}

/**
 * Get production environment Surge configuration
 */
function getProdConfig(): SurgeEnvironmentConfig {
  return {
    phoneNumberId: Deno.env.get('SURGE_PROD_PHONE_ID') || '',
    phoneNumber: Deno.env.get('SURGE_PROD_PHONE_NUMBER') || Deno.env.get('SURGE_PHONE_NUMBER') || '8884338015',
    isDevEnvironment: false
  };
}

/**
 * Create a Surge API payload with the correct phone_number_id for the environment
 */
export function createSurgePayload(
  recipientPhoneNumber: string,
  messageBody: string,
  isDevEnvironment: boolean,
  attachments: any[] = []
) {
  const config = getSurgeEnvironmentConfig(undefined, isDevEnvironment);
  
  const payload = {
    conversation: {
      contact: {
        phone_number: recipientPhoneNumber
      },
      phone_number: {
        id: config.phoneNumberId
      }
    },
    body: messageBody,
    attachments: attachments
  };
  
  return payload;
}

/**
 * Mask phone number for logging purposes
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

/**
 * Log environment information for debugging
 */
export function logEnvironmentInfo(config: SurgeEnvironmentConfig, context: string) {
  console.log(`[${context}] Environment: ${config.isDevEnvironment ? 'DEV' : 'PROD'}`);
  console.log(`[${context}] Phone Number: ${maskPhone(config.phoneNumber)}`);
  console.log(`[${context}] Phone Number ID: ${config.phoneNumberId}`);
}