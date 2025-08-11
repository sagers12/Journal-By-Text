/**
 * Webhook signature validation utilities
 */

export async function validateSurgeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Parse the signature header: t=1737830031,v1=41f947e88a483327c878d6c08b27b22fbe7c9ea5608b035707c6667d1df866dd
    const parts = signature.split(',')
    let timestamp = ''
    const v1Hashes: string[] = []

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key === 't') {
        timestamp = value
      } else if (key === 'v1') {
        v1Hashes.push(value)
      }
    }

    if (!timestamp || v1Hashes.length === 0) {
      console.error('Invalid signature format')
      return false
    }

    // Check timestamp is within 15 minutes (900 seconds) to prevent replay attacks
    const now = Math.floor(Date.now() / 1000)
    const webhookTime = parseInt(timestamp)
    if (Math.abs(now - webhookTime) > 900) {
      console.error('Webhook timestamp too old or too far in future')
      return false
    }

    // Generate the payload: timestamp + '.' + raw body
    const payload = `${timestamp}.${body}`

    // Compute expected HMAC-SHA256 hash
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature_buffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const expectedHash = Array.from(new Uint8Array(signature_buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Compare with any of the v1 hashes using constant-time comparison
    for (const v1Hash of v1Hashes) {
      if (constantTimeEqual(expectedHash, v1Hash)) {
        return true
      }
    }

    console.error('Signature validation failed')
    return false
  } catch (error) {
    console.error('Error validating signature:', error)
    return false
  }
}

// Constant-time string comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}