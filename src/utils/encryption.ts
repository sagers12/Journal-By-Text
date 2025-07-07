/**
 * Encryption utilities for journal entries
 * Uses AES-GCM encryption with user-specific key derivation
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Derives an encryption key from user ID using PBKDF2
 */
async function deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts text using AES-GCM with user-specific key
 */
export async function encrypt(text: string, userId: string): Promise<string> {
  if (!text || !userId) {
    throw new Error('Text and userId are required for encryption');
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Derive key from user ID
    const key = await deriveKey(userId, salt);
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv },
      key,
      data
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    // Return base64 encoded result with prefix to identify encrypted data
    return 'ENC:' + btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts text using AES-GCM with user-specific key
 */
export async function decrypt(encryptedText: string, userId: string): Promise<string> {
  if (!encryptedText || !userId) {
    throw new Error('Encrypted text and userId are required for decryption');
  }

  // Check if text is actually encrypted
  if (!isEncrypted(encryptedText)) {
    return encryptedText; // Return as-is if not encrypted (backward compatibility)
  }

  try {
    // Remove the ENC: prefix and decode base64
    const combined = new Uint8Array(
      atob(encryptedText.substring(4))
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encryptedData = combined.slice(SALT_LENGTH + IV_LENGTH);
    
    // Derive key from user ID
    const key = await deriveKey(userId, salt);
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv },
      key,
      encryptedData
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Checks if text is encrypted (has ENC: prefix)
 */
export function isEncrypted(text: string): boolean {
  return typeof text === 'string' && text.startsWith('ENC:');
}