const CryptoJS = require('crypto-js');
const crypto = require('crypto');

// Generate a derivative key from PIN (32 bytes)
function generateKeyFromPin(pin) {
  // Use PBKDF2 to derive a key from the PIN
  const salt = 'MNFUSStaticSalt'; // In a real application, use a unique salt per user
  const iterations = 10000;
  const keySize = 32; // 32 bytes = 256 bits
  
  // Using pin as the password and deriving a 32-byte key
  return CryptoJS.PBKDF2(pin, salt, {
    keySize: keySize / 4, // keySize is in words (32 bits), so divide by 4 to get bytes
    iterations: iterations
  }).toString();
}

// Generate Solana-like keypair (simplified for demo)
function generateKeypair() {
  // Generate a random keypair
  const privateKey = crypto.randomBytes(32).toString('hex');
  const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
  
  return {
    publicKey,
    privateKey
  };
}

// Encrypt private key with a derived key
function encryptPrivateKey(privateKey, derivedKey) {
  return CryptoJS.AES.encrypt(privateKey, derivedKey).toString();
}

// Decrypt private key using a derived key
function decryptPrivateKey(encryptedPrivateKey, derivedKey) {
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, derivedKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = {
  generateKeyFromPin,
  generateKeypair,
  encryptPrivateKey,
  decryptPrivateKey
}; 