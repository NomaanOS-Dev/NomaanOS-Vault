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
    } catch {
      // handled in context
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E9E5] rounded-2xl shadow-modal p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#78827B] hover:text-[#202923] p-1 rounded-lg hover:bg-[#F3F5F2]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#202923]">Account Recovery</h3>
            <p className="text-xs text-[#78827B]">Reset master password with emergency recovery key</p>
          </div>
        </div>

        {(localError || unlockError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{localError || unlockError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1">
              32-Character Emergency Recovery Key
            </label>
            <input
              type="text"
              required
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#202923] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1">
              New Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2 text-xs text-[#202923] pr-10 outline-none"
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

          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1">
              Confirm New Master Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new master password"
              className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2 text-xs text-[#202923] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1">
              Password Hint <span className="text-[#78827B] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="A memory trigger (never your password)"
              className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2 text-xs text-[#202923] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#78827B] hover:bg-[#F3F5F2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={unlockLoading}
              className="px-5 py-2 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white rounded-xl text-xs font-semibold transition-colors shadow-subtle"
            >
              {unlockLoading ? 'Recovering...' : 'Recover Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
