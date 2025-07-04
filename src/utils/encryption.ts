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
  // Check for base64 patterns that indicate encrypted content
  // Encrypted strings are typically long base64-encoded strings
  if (text.length < 50) return false; // Plain text is usually shorter
  
  // Check if it matches base64 pattern and doesn't contain common plaintext words
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  const hasCommonWords = /\b(the|and|or|in|on|at|to|for|of|with|by)\b/i.test(text);
  
  return base64Pattern.test(text) && !hasCommonWords;
};