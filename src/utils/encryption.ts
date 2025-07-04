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
  // But also check for other long base64-like patterns that don't contain readable text
  if (text.startsWith('U2FsdGVkX1')) {
    return true;
  }
  
  // Check for long base64-like strings that are likely encrypted
  if (text.length > 40 && /^[A-Za-z0-9+/=]+$/.test(text)) {
    // If it's a long base64 string without spaces or common readable patterns, it's likely encrypted
    const hasReadableWords = /\b(the|and|or|in|on|at|to|for|of|with|by|is|are|was|were|will|would|could|should)\b/i.test(text);
    const hasSpaces = text.includes(' ');
    
    // If it's a long base64 string without readable words or spaces, it's probably encrypted
    return !hasReadableWords && !hasSpaces;
  }
  
  return false;
};