import {
  generateRandomBytes,
  bytesToBase64,
  base64ToBytes,
  encryptWithKey,
  decryptWithKey,
} from './crypto';

/**
 * Generate a random 256-bit AES-GCM Send Key
 */
export async function generateSendKey(): Promise<{ key: CryptoKey; keyBase64Url: string }> {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await window.crypto.subtle.exportKey('raw', key);
  const keyBase64 = bytesToBase64(new Uint8Array(raw));
  const keyBase64Url = keyBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { key, keyBase64Url };
}

/**
 * Import a Base64URL string as an AES-GCM CryptoKey
 */
export async function importSendKeyFromBase64Url(base64Url: string): Promise<CryptoKey> {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const bytes = base64ToBytes(base64);
  return await window.crypto.subtle.importKey(
    'raw',
    bytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext string for Send
 */
export async function encryptSendText(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  const encrypted = await encryptWithKey(key, plaintextBytes);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt ciphertext string for Send
 */
export async function decryptSendText(
  key: CryptoKey,
  encryptedJson: string
): Promise<string> {
  const payload = JSON.parse(encryptedJson);
  const decryptedBytes = await decryptWithKey(key, payload);
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}

/**
 * Encrypt File buffer for Send
 */
export async function encryptSendFile(
  key: CryptoKey,
  file: File
): Promise<{ encryptedBlob: Blob; originalFileName: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);
  const iv = generateRandomBytes(12);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    fileBytes as BufferSource
  );

  // Prepend 12-byte IV directly to ciphertext blob
  const combined = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuffer), iv.length);

  return {
    encryptedBlob: new Blob([combined], { type: 'application/octet-stream' }),
    originalFileName: file.name,
    mimeType: file.type || 'application/octet-stream',
  };
}

/**
 * Decrypt downloaded Send File blob
 */
export async function decryptSendFile(
  key: CryptoKey,
  encryptedBlob: Blob,
  mimeType: string
): Promise<Blob> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const fullBytes = new Uint8Array(arrayBuffer);

  const iv = fullBytes.slice(0, 12);
  const ciphertext = fullBytes.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new Blob([decryptedBuffer], { type: mimeType });
}
