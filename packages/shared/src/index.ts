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
  masterPasswordHint?: string | null;
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
  hint?: string | null;
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
  decryptedPayload?: LoginPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
  newHint?: string;
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

// Day 3 Types: Settings, Profile, Master Password Change, Recovery Rotation

export interface ChangeMasterPasswordRequest {
  encryptedVaultKey: string;
  masterPasswordSalt: string;
  kdfAlgorithm?: string;
  kdfParameters?: KdfParameters;
  hint?: string;
}

export interface RotateRecoveryKeyRequest {
  recoveryWrappedVaultKey: string;
  recoveryMetadata?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  onboardingDismissed?: boolean;
}

