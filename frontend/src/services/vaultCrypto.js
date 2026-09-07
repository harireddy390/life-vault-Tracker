/**
 * Client-Side Web Cryptography Helper for Life Vault
 * Uses Web Crypto API (window.crypto.subtle) for AES-GCM 256-bit encryption
 * Key derivation via PBKDF2 with SHA-256 from a 4-digit user PIN.
 */

const PBKDF2_ITERATIONS = 100000;
const PIN_STORAGE_KEY = 'lifevault_secret_safe_pin_hash';
const PIN_SALT_KEY = 'lifevault_secret_safe_salt';

/**
 * Derives a CryptoKey from a PIN string and salt Uint8Array
 */
export async function deriveKey(pin, salt) {
  const enc = new TextEncoder();
  const pinBytes = enc.encode(String(pin));
  const saltBytes = salt instanceof Uint8Array ? salt : new Uint8Array(salt);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    pinBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a Blob using AES-GCM and a user-provided PIN
 * Returns { encryptedBlob: Blob, salt: number[], iv: number[] }
 */
export async function encryptBlob(blob, pin) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);

  const rawBuffer = await blob.arrayBuffer();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    rawBuffer
  );

  return {
    encryptedBlob: new Blob([ciphertextBuffer], { type: 'application/octet-stream' }),
    salt: Array.from(salt),
    iv: Array.from(iv),
  };
}

/**
 * Decrypts encrypted data using the PIN, salt, and IV
 * Throws an error if PIN is wrong (AES-GCM auth tag check fails)
 * Returns decrypted ArrayBuffer
 */
export async function decryptBlob(encryptedData, pin, salt, iv) {
  let arrayBuffer;
  if (encryptedData instanceof Blob) {
    arrayBuffer = await encryptedData.arrayBuffer();
  } else if (encryptedData instanceof ArrayBuffer) {
    arrayBuffer = encryptedData;
  } else if (Array.isArray(encryptedData)) {
    arrayBuffer = new Uint8Array(encryptedData).buffer;
  } else {
    throw new Error('Unsupported encryptedData format');
  }

  const saltBytes = salt instanceof Uint8Array ? salt : new Uint8Array(salt);
  const ivBytes = iv instanceof Uint8Array ? iv : new Uint8Array(iv);

  const key = await deriveKey(pin, saltBytes);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      arrayBuffer
    );
    return decryptedBuffer;
  } catch (err) {
    throw new Error('Incorrect PIN or corrupted encrypted payload.');
  }
}

/**
 * Checks if a master Vault PIN has been configured
 */
export function hasMasterPin() {
  return !!localStorage.getItem(PIN_STORAGE_KEY);
}

/**
 * Sets or updates the master Vault PIN hash
 */
export async function setMasterPin(pin) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(pin)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  localStorage.setItem(PIN_STORAGE_KEY, hashHex);
  localStorage.setItem(PIN_SALT_KEY, saltHex);
  return true;
}

/**
 * Verifies a PIN against the stored hash
 */
export async function verifyMasterPin(pin) {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  const storedSaltHex = localStorage.getItem(PIN_SALT_KEY);

  if (!storedHash || !storedSaltHex) {
    // If no pin is set yet, any 4-digit pin can establish it or be accepted
    return false;
  }

  const saltBytes = new Uint8Array(
    storedSaltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(pin)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex === storedHash;
}
