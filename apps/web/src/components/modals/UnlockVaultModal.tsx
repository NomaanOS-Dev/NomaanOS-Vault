import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';
import { RecoverVaultModal } from './RecoverVaultModal';

export const UnlockVaultModal: React.FC = () => {
  const { unlockVault, unlockLoading, unlockError, clearUnlockError } = useVault();
  const { user, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);

  const hint = user?.keyMetadata?.hint;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    clearUnlockError();
    await unlockVault(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E9E5] rounded-2xl p-6 sm:p-8 shadow-modal">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center justify-center text-[#168568] mb-3 shadow-subtle">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#202923] tracking-tight">Unlock Your Vault</h2>
          <p className="text-xs text-[#78827B] mt-1">
            Logged in as <span className="text-[#202923] font-semibold">{user?.email}</span>
          </p>
        </div>

        {unlockError && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{unlockError}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#202923] placeholder-[#78827B]/60 pr-10 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {hint && (
            <div className="text-xs text-[#78827B] bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3">
              <strong className="text-[#202923]">Password Hint:</strong> {hint}
            </div>
          )}

          <button
            type="submit"
            disabled={unlockLoading || !password}
            className="w-full py-2.5 px-4 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] disabled:text-[#78827B] disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-subtle transition-all duration-150 flex items-center justify-center gap-2"
          >
            {unlockLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deriving Key & Decrypting...</span>
              </>
            ) : (
              <span>Unlock Vault</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E5E9E5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={() => setIsRecoverOpen(true)}
            className="text-[#168568] hover:text-[#126e56] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Emergency Recovery Key</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-[#78827B] hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <RecoverVaultModal
        isOpen={isRecoverOpen}
        onClose={() => setIsRecoverOpen(false)}
        onSuccess={() => setIsRecoverOpen(false)}
      />
    </div>
  );
};
