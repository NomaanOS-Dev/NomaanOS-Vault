import { argon2id } from 'hash-wasm';
import { EncryptedPayload, KdfParameters } from '@pwm/shared';

export const DEFAULT_KDF_PARAMS: KdfParameters = {
  memory: 64 * 1024, // 64 MB (65536 KiB)
  iterations: 3,
  parallelism: 4,
  hashLength: 32, // 256 bits
};

/**
 * Convert Uint8Array to Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a random salt as Base64 string
 */
export function generateSalt(length = 16): string {
  return bytesToBase64(generateRandomBytes(length));
}

/**
 * Derive a 256-bit Key Encryption Key (KEK) from Master Password using Argon2id
 */
export async function deriveKeyFromMasterPassword(
  masterPassword: string,
  saltBase64: string,
  params: KdfParameters = DEFAULT_KDF_PARAMS
): Promise<CryptoKey> {
  const saltBytes = base64ToBytes(saltBase64);

  // Argon2id key derivation using WebAssembly
  const derivedKeyBytes = await argon2id({
    password: masterPassword,
    salt: saltBytes,
    iterations: params.iterations,
    memorySize: params.memory,
    parallelism: params.parallelism,
    hashLength: params.hashLength || 32,
    outputType: 'binary',
  });

  // Import into Web Crypto API
  return await window.crypto.subtle.importKey(
    'raw',
    derivedKeyBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a new random 256-bit AES-GCM Vault Key
 */
export async function generateVaultKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can wrap it
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to raw Uint8Array
 */
export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

/**
 * Import a raw Uint8Array as an AES-GCM CryptoKey
 */
export async function importRawVaultKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary bytes with AES-256-GCM using a CryptoKey
 */
export async function encryptWithKey(
  key: CryptoKey,
  plaintext: Uint8Array
): Promise<EncryptedPayload> {
  const iv = generateRandomBytes(12); // Standard 96-bit unique IV
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plaintext as BufferSource
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

/**
 * Decrypt AES-256-GCM ciphertext using a CryptoKey
 */
export async function decryptWithKey(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<Uint8Array> {
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    ciphertext as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Wrap (encrypt) the Vault Key using a Key-Encryption-Key
 */
export async function wrapVaultKey(
  vaultKey: CryptoKey,
  kek: CryptoKey
): Promise<string> {
  const rawVaultKey = await exportRawKey(vaultKey);
  const encrypted = await encryptWithKey(kek, rawVaultKey);
  return JSON.stringify(encrypted);
}

/**
 * Unwrap (decrypt) the Vault Key using a Key-Encryption-Key
 */
export async function unwrapVaultKey(
  wrappedKeyJson: string,
  kek: CryptoKey
): Promise<CryptoKey> {
  const payload: EncryptedPayload = JSON.parse(wrappedKeyJson);
  const rawVaultKey = await decryptWithKey(kek, payload);
  return await importRawVaultKey(rawVaultKey);
}

/**
 * Generate a formatted cryptographically secure Recovery Key
 * Returns formatted string: 32 hex chars grouped into 8 blocks of 4 chars
 */
export function generateRecoveryKey(): { key: string; rawBytes: Uint8Array } {
  const rawBytes = generateRandomBytes(32);
  const hex = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  // Format as 8 blocks of 4 chars: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const chunks: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    chunks.push(hex.substring(i, i + 4));
  }
  return {
    key: chunks.join('-'),
    rawBytes,
  };
}

/**
 * Derive a CryptoKey from a Recovery Key string
 */
export async function deriveKeyFromRecoveryKey(recoveryKeyString: string): Promise<CryptoKey> {
  const clean = recoveryKeyString.replace(/[^A-Fa-f0-9]/g, '').toLowerCase();
  if (clean.length < 32) {
    throw new Error('Invalid recovery key length');
  }

  const bytes = new Uint8Array(clean.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const hash = await window.crypto.subtle.digest('SHA-256', bytes);

  return await window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt client-side item payload (JSON object) using the Vault Key
 */
export async function encryptItemPayload(vaultKey: CryptoKey, data: any): Promise<string> {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(json);
  const encrypted = await encryptWithKey(vaultKey, plaintextBytes);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt client-side item payload using the Vault Key
 */
export async function decryptItemPayload<T = any>(
  vaultKey: CryptoKey,
  encryptedJson: string
): Promise<T> {
  const payload: EncryptedPayload = JSON.parse(encryptedJson);
  const decryptedBytes = await decryptWithKey(vaultKey, payload);
  const decoder = new TextDecoder();
  const json = decoder.decode(decryptedBytes);
  return JSON.parse(json);
}
