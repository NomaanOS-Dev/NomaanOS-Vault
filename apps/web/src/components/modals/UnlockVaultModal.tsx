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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1d]/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#131d31] border border-[#1f2e4d] rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-500 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Unlock Your Vault</h2>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <span className="text-slate-200 font-medium">{user?.email}</span>
          </p>
        </div>

        {unlockError && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{unlockError}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {hint && (
            <div className="text-xs text-slate-400 bg-[#0e1628] border border-[#1f2e4d] rounded-lg p-2.5">
              <strong className="text-slate-300">Master Password Hint:</strong> {hint}
            </div>
          )}

          <button
            type="submit"
            disabled={unlockLoading || !password}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20"
          >
            {unlockLoading ? (
              <>
                <span className="inline-block animate-spin mr-1">⚙️</span>
                <span>Unlocking Vault (Argon2id)...</span>
              </>
            ) : (
              <span>Unlock Vault</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1f2e4d] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsRecoverOpen(true)}
            className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Recover with Recovery Key</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-slate-400 hover:text-slate-200"
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

