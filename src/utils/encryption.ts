import CryptoJS from 'crypto-js';

// Generate encryption key from user ID and a static salt
const generateEncryptionKey = (userId: string): string => {
  // Use user ID as part of the key derivation
  // In a production app, you might want to use a user-provided passphrase
  const salt = 'journal-encryption-salt-2024';
  return CryptoJS.PBKDF2(userId, salt, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString();
};

export const encryptText = (text: string, userId: string): string => {
  try {
    const key = generateEncryptionKey(userId);
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decryptText = (encryptedText: string, userId: string): string => {
  try {
    const key = generateEncryptionKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plaintext) {
      throw new Error('Failed to decrypt: invalid key or corrupted data');
    }
    
    return plaintext;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Helper to check if text appears to be encrypted
export const isEncrypted = (text: string): boolean => {
  // CryptoJS AES encrypted strings typically start with 'U2FsdGVkX1' in base64
  if (text.startsWith('U2FsdGVkX1')) {
    return true;
  }
  
  // Check for base64 patterns that don't look like readable text
  // Must be longer than typical readable text and match base64 pattern
  if (text.length > 50 && /^[A-Za-z0-9+/=]+$/.test(text) && !text.includes(' ')) {
    // Additional check: if it doesn't contain common readable patterns, it's likely encrypted
    const hasReadablePattern = /[aeiou]{2,}|th[eiy]|and|ing|ion|ly\b/i.test(text);
    return !hasReadablePattern;
  }
  
  return false;
};