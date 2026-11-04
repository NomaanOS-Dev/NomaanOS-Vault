import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { Eye, EyeOff, KeyRound, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

export const MasterPasswordSetupPage: React.FC = () => {
  const { user } = useAuth();
  const { setupMasterPassword, unlockLoading, unlockError } = useVault();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Recovery Key State
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password strength calculation
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-red-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-emerald-400',
    'bg-[#168568]',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password.length < 8) {
      setValidationError('Master password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Master passwords do not match');
      return;
    }

    try {
      const res = await setupMasterPassword(password, hint);
      setRecoveryKey(res.recoveryKey);
    } catch (err: any) {
      // error is handled by vault context
    }
  };

  const copyRecoveryKey = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleFinish = () => {
    navigate('/vaults');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white border border-[#E5E9E5] rounded-2xl p-6 sm:p-8 shadow-sm">
        {!recoveryKey ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 bg-[#E7F4EF] border border-[#B7E3D6] rounded-xl flex items-center justify-center text-[#168568] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#202923] tracking-tight">Set Up Master Password</h1>
                <p className="text-xs text-[#78827B]">Account: <span className="font-medium text-[#202923]">{user?.email}</span></p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-[#E7F4EF] border border-[#B7E3D6] rounded-xl text-xs text-[#168568] leading-relaxed">
              Your Master Password unlocks your encrypted vault on this device using client-side{' '}
              <strong className="font-semibold text-[#126e56]">Argon2id</strong> and{' '}
              <strong className="font-semibold text-[#126e56]">AES-256-GCM</strong>. It is never stored on or transmitted to any server.
            </div>

            {(validationError || unlockError) && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">{validationError || unlockError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  Master Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong master password"
                    className="w-full bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl px-3.5 py-2.5 text-sm text-[#202923] placeholder-[#78827B]/60 pr-10 focus:outline-none focus:border-[#168568] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923] transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {password.length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex gap-1.5 h-1.5 w-full bg-[#E5E9E5] rounded-full overflow-hidden">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`flex-1 transition-all rounded-full ${
                            index < strength ? strengthColors[strength] : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[11px] text-[#78827B]">
                      <span>Strength</span>
                      <span className="font-semibold text-[#202923]">{strengthLabels[strength]}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  Confirm Master Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter master password"
                    className="w-full bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl px-3.5 py-2.5 text-sm text-[#202923] placeholder-[#78827B]/60 pr-10 focus:outline-none focus:border-[#168568] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923] transition-colors p-1"
                    title={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  Master Password Hint <span className="text-[#78827B] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="A memory trigger (never enter your actual password here)"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl px-3.5 py-2.5 text-sm text-[#202923] placeholder-[#78827B]/60 focus:outline-none focus:border-[#168568] focus:bg-white transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={unlockLoading}
                className="w-full mt-2 bg-[#168568] hover:bg-[#126e56] disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
              >
                {unlockLoading ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⚙️</span>
                    <span>Deriving Keys (Argon2id 64MB)...</span>
                  </>
                ) : (
                  <span>Initialize Encrypted Vault</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: Recovery Key Modal/Display */
          <div>
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#202923] tracking-tight">Save Your Recovery Key</h1>
                <p className="text-xs text-amber-700 font-medium">Critical Emergency Access Key</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
              If you ever forget your Master Password, this Recovery Key is the <strong>only way</strong> to recover your encrypted vault. We cannot reset your password or decrypt your records on your behalf.
            </div>

            {/* Formatted Key Box */}
            <div className="mb-6 p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-sm tracking-wider text-[#202923] select-all">
              <span className="break-all font-semibold">{recoveryKey}</span>
              <button
                type="button"
                onClick={copyRecoveryKey}
                className="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-[#E7F4EF] border border-[#E5E9E5] hover:border-[#B7E3D6] rounded-lg text-[#202923] hover:text-[#168568] transition-colors flex items-center justify-center gap-1.5 shrink-0 text-xs font-sans font-medium shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4 text-[#168568]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recoveryConfirmed}
                onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#E5E9E5] text-[#168568] focus:ring-[#168568] focus:ring-offset-0"
              />
              <span className="text-xs text-[#78827B] leading-relaxed">
                I have securely saved this recovery key in an offline safe or printed copy. I understand that losing both my Master Password and Recovery Key means permanent loss of vault access.
              </span>
            </label>

            <button
              type="button"
              disabled={!recoveryConfirmed}
              onClick={handleFinish}
              className="w-full bg-[#168568] hover:bg-[#126e56] disabled:opacity-40 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
            >
              Continue to Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
