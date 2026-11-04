export type ItemType = 'LOGIN' | 'CARD' | 'IDENTITY' | 'SECURE_NOTE' | 'SSH_KEY';

export interface CustomField {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'hidden' | 'boolean';
}

export interface LoginPayload {
  username?: string;
  password?: string;
  totpSecret?: string;
  uris?: string[];
  notes?: string;
  rePrompt?: boolean;
  customFields?: CustomField[];
}

export interface CardPayload {
  cardholderName?: string;
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  cvv?: string;
  brand?: string;
  billingAddress?: string;
  notes?: string;
  customFields?: CustomField[];
}

export interface IdentityPayload {
  fullName?: string;
  dob?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  postalCode?: string;
  company?: string;
  notes?: string;
  customFields?: CustomField[];
}

export interface SecureNotePayload {
  content?: string;
  notes?: string;
  customFields?: CustomField[];
}

export interface SSHKeyPayload {
  privateKey?: string;
  publicKey?: string;
  passphrase?: string;
  host?: string;
  username?: string;
  notes?: string;
  customFields?: CustomField[];
}

export type AnyVaultPayload = LoginPayload & CardPayload & IdentityPayload & SecureNotePayload & SSHKeyPayload;

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes nonce for AES-GCM)
  tag?: string;       // Optional if combined in ciphertext
}

export interface KdfParameters {
  memory: number;      // in KiB (e.g. 65536 = 64MB)
  iterations: number;  // e.g. 3
  parallelism: number; // e.g. 4
  hashLength: number;  // 32 bytes (256 bits)
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  profileImage?: string | null;
  createdAt: string;
  hasMasterPassword: boolean;
  authProvider?: string;
  onboardingDismissed?: boolean;
}

export interface VaultKeyMetadataInfo {
  vaultId: string;
  encryptedVaultKey: string;
  masterPasswordSalt: string;
  kdfAlgorithm: string;
  kdfParameters: KdfParameters;
  recoveryWrappedVaultKey?: string | null;
  recoveryMetadata?: string | null;
}

export interface FolderSummary {
  id: string;
  userId: string;
  vaultId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface VaultItemSummary {
  id: string;
  vaultId: string;
  userId: string;
  itemName: string;
  itemType: ItemType;
  folderId?: string | null;
  folderName?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  encryptedPayload: string;
  decryptedPayload?: AnyVaultPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface SetupMasterPasswordRequest {
  encryptedVaultKey: string;
  masterPasswordSalt: string;
  kdfAlgorithm: string;
  kdfParameters: KdfParameters;
  recoveryWrappedVaultKey: string;
  recoveryMetadata?: string;
  hint?: string;
}

export interface RecoverVaultRequest {
  recoveryKey: string;
  newEncryptedVaultKey: string;
  newMasterPasswordSalt: string;
  newKdfParameters: KdfParameters;
  newRecoveryWrappedVaultKey: string;
}

// Day 2 Types: Send, Generator, Import, Export

export type SendType = 'TEXT' | 'FILE';
export type RecipientPolicy = 'ANYONE' | 'SPECIFIC' | 'PASSWORD';

export interface SecureSendSummary {
  id: string;
  userId: string;
  publicTokenHash: string;
  sendType: SendType;
  name: string;
  expiresAt: string;
  maxAccessCount: number | null;
  currentAccessCount: number;
  recipientPolicy: RecipientPolicy;
  hideSenderEmail: boolean;
  hideTextByDefault: boolean;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  shareUrl?: string;
  fileInfo?: {
    originalFileName: string;
    encryptedSize: number;
    mimeType: string;
  } | null;
  recipients?: string[];
}

export interface CreateSendRequest {
  name: string;
  sendType: SendType;
  encryptedPayload?: string;
  hideTextByDefault?: boolean;
  expiration: '1h' | '1d' | '7d' | '14d' | '31d' | string;
  maxAccessCount?: number | null;
  password?: string;
  recipientPolicy: RecipientPolicy;
  specificEmails?: string[];
  hideSenderEmail?: boolean;
}

export interface PublicSendResponse {
  name: string;
  sendType: SendType;
  hideTextByDefault: boolean;
  expiresAt: string;
  hideSenderEmail: boolean;
  senderEmail?: string;
  requiresPassword: boolean;
  requiresEmailVerification: boolean;
  isEmailVerified?: boolean;
  encryptedPayload?: string;
  fileInfo?: {
    originalFileName: string;
    encryptedSize: number;
    mimeType: string;
  } | null;
}

export interface ImportPreviewItem {
  itemName: string;
  username?: string;
  password?: string;
  uri?: string;
  notes?: string;
  totp?: string;
  folder?: string;
  isValid: boolean;
  isDuplicate?: boolean;
  validationError?: string;
}

export interface RotateRecoveryKeyRequest {
  recoveryWrappedVaultKey: string;
  recoveryMetadata?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  onboardingDismissed?: boolean;
}
