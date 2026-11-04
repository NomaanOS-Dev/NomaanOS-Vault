import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  generateVaultKey,
  generateSalt,
  deriveKeyFromMasterPassword,
  wrapVaultKey,
  unwrapVaultKey,
  generateRecoveryKey,
  deriveKeyFromRecoveryKey,
  encryptItemPayload,
  decryptItemPayload,
  DEFAULT_KDF_PARAMS,
} from '../lib/crypto';
import { api } from '../services/api';

interface VaultContextType {
  isVaultUnlocked: boolean;
  vaultKey: CryptoKey | null;
  unlockLoading: boolean;
  unlockError: string | null;
  setupMasterPassword: (
    masterPassword: string,
    hint?: string
  ) => Promise<{ recoveryKey: string }>;
  unlockVault: (masterPassword: string) => Promise<boolean>;
  lockVault: () => void;
  recoverVault: (
    recoveryKey: string,
    newMasterPassword: string
  ) => Promise<void>;
  rotateRecoveryKey: () => Promise<{ recoveryKey: string }>;
  encryptItem: (data: any) => Promise<string>;
  decryptItem: <T = any>(encryptedJson: string) => Promise<T>;
  clearUnlockError: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { refreshUser } = useAuth();
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const isVaultUnlocked = Boolean(vaultKey);

  /**
   * Setup Master Password:
   * 1. Generate new 256-bit AES-GCM Vault Key
   * 2. Derive KEK from master password with Argon2id
   * 3. Wrap Vault Key with KEK
   * 4. Generate Recovery Key and wrap Vault Key with Recovery Key
   * 5. Send encrypted metadata to server
   * 6. Retain unlocked Vault Key in memory
   */
  const setupMasterPassword = async (
    masterPassword: string,
    hint?: string
  ): Promise<{ recoveryKey: string }> => {
    try {
      setUnlockLoading(true);
      setUnlockError(null);

      // 1. Generate vault key
      const newVaultKey = await generateVaultKey();

      // 2. Derive key from master password using Argon2id
      const salt = generateSalt(16);
      const kek = await deriveKeyFromMasterPassword(masterPassword, salt, DEFAULT_KDF_PARAMS);

      // 3. Wrap vault key with KEK
      const encryptedVaultKey = await wrapVaultKey(newVaultKey, kek);

      // 4. Generate recovery key
      const { key: recoveryKeyStr } = generateRecoveryKey();
      const recoveryKey = await deriveKeyFromRecoveryKey(recoveryKeyStr);
      const recoveryWrappedVaultKey = await wrapVaultKey(newVaultKey, recoveryKey);

      // 5. Send to backend
      await api.setupMasterPassword({
        encryptedVaultKey,
        masterPasswordSalt: salt,
        kdfAlgorithm: 'Argon2id',
        kdfParameters: DEFAULT_KDF_PARAMS,
        recoveryWrappedVaultKey,
        hint: hint || undefined,
      });

      // 6. Set in memory
      setVaultKey(newVaultKey);
      await refreshUser();

      return { recoveryKey: recoveryKeyStr };
    } catch (err: any) {
      setUnlockError(err.message || 'Failed to setup master password');
      throw err;
    } finally {
      setUnlockLoading(false);
    }
  };

  /**
   * Unlock Vault with Master Password:
   * 1. Fetch encrypted key metadata from server
   * 2. Derive KEK with Argon2id using stored salt
   * 3. Unwrap vault key
   * 4. Store in memory
   */
  const unlockVault = async (masterPassword: string): Promise<boolean> => {
    try {
      setUnlockLoading(true);
      setUnlockError(null);

      const keysMeta = await api.getVaultKeys();

      // Derive KEK
      const kek = await deriveKeyFromMasterPassword(
        masterPassword,
        keysMeta.masterPasswordSalt,
        keysMeta.kdfParameters || DEFAULT_KDF_PARAMS
      );

      // Unwrap vault key
      const unlockedKey = await unwrapVaultKey(keysMeta.encryptedVaultKey, kek);

      setVaultKey(unlockedKey);
      return true;
    } catch (err: any) {
      console.error('Unlock failed:', err);
      setUnlockError('Incorrect master password. Please verify and try again.');
      return false;
    } finally {
      setUnlockLoading(false);
    }
  };

  /**
   * Lock Vault (destroy in-memory key)
   */
  const lockVault = () => {
    setVaultKey(null);
  };

  /**
   * Recover Vault using Recovery Key
   */
  const recoverVault = async (
    recoveryKeyStr: string,
    newMasterPassword: string
  ): Promise<void> => {
    try {
      setUnlockLoading(true);
      setUnlockError(null);

      const keysMeta = await api.getVaultKeys();
      if (!keysMeta.recoveryWrappedVaultKey) {
        throw new Error('No recovery key metadata found for this vault');
      }

      // Derive recovery key
      const recKey = await deriveKeyFromRecoveryKey(recoveryKeyStr);

      // Unwrap original vault key
      const recoveredVaultKey = await unwrapVaultKey(
        keysMeta.recoveryWrappedVaultKey,
        recKey
      );

      // Wrap with new master password
      const newSalt = generateSalt(16);
      const newKek = await deriveKeyFromMasterPassword(
        newMasterPassword,
        newSalt,
        DEFAULT_KDF_PARAMS
      );
      const newEncryptedVaultKey = await wrapVaultKey(recoveredVaultKey, newKek);

      // Re-wrap with new recovery key or same
      const { key: newRecoveryKeyStr } = generateRecoveryKey();
      const newRecKey = await deriveKeyFromRecoveryKey(newRecoveryKeyStr);
      const newRecoveryWrapped = await wrapVaultKey(recoveredVaultKey, newRecKey);

      await api.recoverVault({
        recoveryKey: recoveryKeyStr,
        newEncryptedVaultKey,
        newMasterPasswordSalt: newSalt,
        newKdfParameters: DEFAULT_KDF_PARAMS,
        newRecoveryWrappedVaultKey: newRecoveryWrapped,
      });

      setVaultKey(recoveredVaultKey);
      await refreshUser();
    } catch (err: any) {
      setUnlockError(err.message || 'Recovery failed. Invalid recovery key.');
      throw err;
    } finally {
      setUnlockLoading(false);
    }
  };

  /**
   * Rotate Emergency Recovery Key:
   * 1. Requires vault to be unlocked
   * 2. Generates fresh 32-character recovery key
   * 3. Wraps existing vault key with new recovery key
   * 4. Updates backend key metadata
   */
  const rotateRecoveryKey = async (): Promise<{ recoveryKey: string }> => {
    if (!vaultKey) {
      throw new Error('Vault is locked. Unlock your vault first to rotate recovery key.');
    }

    try {
      setUnlockLoading(true);
      setUnlockError(null);

      const { key: newRecoveryKeyStr } = generateRecoveryKey();
      const newRecKey = await deriveKeyFromRecoveryKey(newRecoveryKeyStr);
      const newRecoveryWrappedVaultKey = await wrapVaultKey(vaultKey, newRecKey);

      await api.rotateRecoveryKey({
        recoveryWrappedVaultKey: newRecoveryWrappedVaultKey,
        recoveryMetadata: JSON.stringify({ rotatedAt: new Date().toISOString() }),
      });

      await refreshUser();
      return { recoveryKey: newRecoveryKeyStr };
    } catch (err: any) {
      setUnlockError(err.message || 'Failed to rotate recovery key');
      throw err;
    } finally {
      setUnlockLoading(false);
    }
  };

  /**
   * Encrypt item payload using current in-memory vault key
   */
  const encryptItem = async (data: any): Promise<string> => {
    if (!vaultKey) {
      throw new Error('Vault is locked. Unlock the vault to encrypt items.');
    }
    return await encryptItemPayload(vaultKey, data);
  };

  /**
   * Decrypt item payload using current in-memory vault key
   */
  const decryptItem = async <T = any>(encryptedJson: string): Promise<T> => {
    if (!vaultKey) {
      throw new Error('Vault is locked. Unlock the vault to decrypt items.');
    }
    return await decryptItemPayload<T>(vaultKey, encryptedJson);
  };

  return (
    <VaultContext.Provider
      value={{
        isVaultUnlocked,
        vaultKey,
        unlockLoading,
        unlockError,
        setupMasterPassword,
        unlockVault,
        lockVault,
        recoverVault,
        rotateRecoveryKey,
        encryptItem,
        decryptItem,
        clearUnlockError: () => setUnlockError(null),
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
