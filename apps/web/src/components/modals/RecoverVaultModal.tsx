import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { KeyRound, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';

interface RecoverVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecoverVaultModal: React.FC<RecoverVaultModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { recoverVault, unlockLoading, unlockError, clearUnlockError } = useVault();
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearUnlockError();

    if (!recoveryKey.trim()) {
      setLocalError('Recovery key is required');
      return;
    }

    if (newPassword.length < 8) {
      setLocalError('New Master Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await recoverVault(recoveryKey.trim(), newPassword, hint);
      onSuccess();
    } catch (err: any) {
      // handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#131d31] border border-[#1f2e4d] rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Vault Recovery</h2>
            <p className="text-xs text-slate-400">Restore access using your emergency Recovery Key</p>
          </div>
        </div>

        {(localError || unlockError) && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{localError || unlockError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Emergency Recovery Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              New Master Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new master password"
                className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500"
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Confirm New Master Password <span className="text-red-400">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new master password"
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Optional New Hint
            </label>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="New password hint"
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#162036] hover:bg-[#1e2d4d] text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={unlockLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs disabled:opacity-50"
            >
              {unlockLoading ? 'Recovering Vault...' : 'Recover Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

