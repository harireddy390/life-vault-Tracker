import axios from 'axios';

const API_URL = '/api/vault/auth';
const PBKDF2_ITERATIONS = 100000;

// Store in memory for true zero-knowledge (cleared on reload/close)
// SessionStorage is an alternative if we want it to survive reloads within the same tab
let inMemoryMasterPassword = sessionStorage.getItem('vaultMasterPassword') || null;

const getAuthHeaders = () => {
  // Read token from the same key that authService uses: 'lifevault_user'
  const stored = localStorage.getItem('lifevault_user');
  const token = stored ? JSON.parse(stored).token : null;
  return {
    Authorization: `Bearer ${token}`,
  };
};

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

export async function checkHasMasterPassword() {
  try {
    const response = await axios.get(`${API_URL}/status`, {
      headers: getAuthHeaders()
    });
    return response.data.hasMasterPassword;
  } catch (error) {
    console.error('Error checking master password status:', error);
    return false;
  }
}

export function hasMasterPasswordInMemory() {
  return !!inMemoryMasterPassword;
}

export function getMasterPassword() {
  return inMemoryMasterPassword;
}

export async function setMasterPassword(password) {
  if (!password || password.length < 6) {
    throw new Error('Master password must be at least 6 characters.');
  }

  try {
    await axios.post(`${API_URL}/setup`, { vaultPassword: password }, {
      headers: getAuthHeaders()
    });
    
    inMemoryMasterPassword = password;
    sessionStorage.setItem('vaultMasterPassword', password);
    
    // Automatically verify to get the token
    await verifyMasterPassword(password);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to setup master password');
  }
}

export async function verifyMasterPassword(password) {
  try {
    const response = await axios.post(`${API_URL}/verify`, { vaultPassword: password }, {
      headers: getAuthHeaders()
    });
    
    inMemoryMasterPassword = password;
    sessionStorage.setItem('vaultMasterPassword', password);
    sessionStorage.setItem('vaultToken', response.data.vaultToken);
    
    return true;
  } catch (error) {
    return false;
  }
}

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
  checkHasMasterPassword,
  hasMasterPasswordInMemory,
  getMasterPassword,
  setMasterPassword,
  verifyMasterPassword,
  encryptBlob,
  decryptBlob,
};
