/**
 * Client-Side Web Cryptography Helper for Life Vault
 * Uses Web Crypto API (window.crypto.subtle) for AES-GCM 256-bit encryption.
 * Key derivation via PBKDF2 with SHA-256 from a custom user master password.
 * Zero hardcoded or fallback passwords.
 */

const PBKDF2_ITERATIONS = 100000;
const MASTER_HASH_STORAGE_KEY = 'lifevault_master_vault_key_hash';
const MASTER_SALT_STORAGE_KEY = 'lifevault_master_vault_key_salt';

/**
 * Evaluates password strength based on length, numbers, symbols, and casing.
 * Returns { score, label, color, percent, rules }
 */
export function calculatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      color: 'slate',
      percent: 0,
      rules: {
        minLength: false,
        hasNumber: false,
        hasSymbol: false,
        hasMixedCase: false,
      },
    };
  }

  const rules = {
    minLength: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
    hasMixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
  };

  let score = 0;
  if (password.length >= 6) score += 1;
  if (rules.minLength) score += 1;
  if (rules.hasNumber) score += 1;
  if (rules.hasMixedCase) score += 1;
  if (rules.hasSymbol) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Very Weak', color: 'rose', percent: 20, rules };
  }
  if (score === 2) {
    return { score: 2, label: 'Weak', color: 'rose', percent: 40, rules };
  }
  if (score === 3) {
    return { score: 3, label: 'Moderate', color: 'amber', percent: 60, rules };
  }
  if (score === 4) {
    return { score: 4, label: 'Strong', color: 'indigo', percent: 80, rules };
  }
  return { score: 5, label: 'Very Strong', color: 'emerald', percent: 100, rules };
}

/**
 * Derives an AES-GCM CryptoKey from a password and salt using PBKDF2
 */
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(String(password));
  const saltBytes = salt instanceof Uint8Array ? salt : new Uint8Array(salt);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
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
 * Checks if a master password has already been established by the user
 */
export function hasMasterPassword() {
  return Boolean(
    localStorage.getItem(MASTER_HASH_STORAGE_KEY) &&
    localStorage.getItem(MASTER_SALT_STORAGE_KEY)
  );
}

/**
 * Sets or updates the user's custom master vault password
 */
export async function setMasterPassword(password) {
  if (!password || password.length < 6) {
    throw new Error('Master password must be at least 6 characters.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(password)),
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

  localStorage.setItem(MASTER_HASH_STORAGE_KEY, hashHex);
  localStorage.setItem(MASTER_SALT_STORAGE_KEY, saltHex);
  return true;
}

/**
 * Verifies if entered password matches the stored master password
 */
export async function verifyMasterPassword(password) {
  const storedHash = localStorage.getItem(MASTER_HASH_STORAGE_KEY);
  const storedSaltHex = localStorage.getItem(MASTER_SALT_STORAGE_KEY);

  if (!storedHash || !storedSaltHex) {
    return false;
  }

  const saltBytes = new Uint8Array(
    storedSaltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );

  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(password)),
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

/**
 * Encrypts a Blob using AES-GCM and a user-provided password
 * Returns { encryptedBlob: Blob, salt: number[], iv: number[] }
 */
export async function encryptBlob(blob, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

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
 * Decrypts encrypted data using the password, salt, and IV
 */
export async function decryptBlob(encryptedData, password, salt, iv) {
  let arrayBuffer;
  if (encryptedData instanceof Blob) {
    arrayBuffer = await encryptedData.arrayBuffer();
  } else if (encryptedData instanceof ArrayBuffer) {
    arrayBuffer = encryptedData;
  } else if (Array.isArray(encryptedData)) {
    arrayBuffer = new Uint8Array(encryptedData).buffer;
  } else {
    throw new Error('Unsupported encrypted data format');
  }

  const saltBytes = salt instanceof Uint8Array ? salt : new Uint8Array(salt);
  const ivBytes = iv instanceof Uint8Array ? iv : new Uint8Array(iv);

  const key = await deriveKey(password, saltBytes);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      arrayBuffer
    );
    return decryptedBuffer;
  } catch {
    throw new Error('Incorrect master password or corrupted encrypted payload.');
  }
}

export default {
  calculatePasswordStrength,
  deriveKey,
  hasMasterPassword,
  setMasterPassword,
  verifyMasterPassword,
  encryptBlob,
  decryptBlob,
};
