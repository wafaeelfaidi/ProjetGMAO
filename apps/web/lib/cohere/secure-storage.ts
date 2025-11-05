/**
 * Secure storage for Cohere API key with optional localStorage persistence.
 * Uses Web Crypto API for encryption when persisting to localStorage.
 */

const STORAGE_KEY = "gmao_cohere_key_encrypted";
const SALT_KEY = "gmao_cohere_salt";

/**
 * Generate a cryptographic key from a password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a device fingerprint to use as encryption password
 * This creates a unique identifier based on browser characteristics
 */
function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || "0",
  ];
  return parts.join("|");
}

/**
 * Encrypt API key for storage
 */
async function encryptKey(apiKey: string): Promise<{ encrypted: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const password = getDeviceFingerprint();
  const key = await deriveKey(password, salt);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(apiKey)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return {
    encrypted: btoa(String.fromCharCode(...combined)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

/**
 * Decrypt API key from storage
 */
async function decryptKey(encryptedData: string, saltData: string): Promise<string> {
  try {
    const decoder = new TextDecoder();
    const combined = new Uint8Array(
      atob(encryptedData).split("").map(c => c.charCodeAt(0))
    );
    const salt = new Uint8Array(
      atob(saltData).split("").map(c => c.charCodeAt(0))
    );
    
    const password = getDeviceFingerprint();
    const key = await deriveKey(password, salt);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Save API key to localStorage (encrypted)
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  try {
    const { encrypted, salt } = await encryptKey(apiKey);
    localStorage.setItem(STORAGE_KEY, encrypted);
    localStorage.setItem(SALT_KEY, salt);
  } catch (error) {
    console.error("Failed to save API key:", error);
    throw new Error("Failed to save API key securely");
  }
}

/**
 * Load API key from localStorage (decrypt)
 */
export async function loadApiKey(): Promise<string | null> {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    const salt = localStorage.getItem(SALT_KEY);
    
    if (!encrypted || !salt) {
      return null;
    }
    
    return await decryptKey(encrypted, salt);
  } catch (error) {
    console.error("Failed to load API key:", error);
    // If decryption fails, clear the corrupted data
    clearApiKey();
    return null;
  }
}

/**
 * Clear API key from localStorage
 */
export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SALT_KEY);
}

/**
 * Check if API key exists in localStorage
 */
export function hasStoredApiKey(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
