import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { Eye, EyeOff, KeyRound, Copy, Check, AlertTriangle, Lock } from 'lucide-react';

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
    'bg-blue-500',
    'bg-emerald-500',
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
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#131d31] border border-[#1f2e4d] rounded-xl p-8 shadow-2xl">
        {!recoveryKey ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-500">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">Set Up Master Password</h1>
                <p className="text-xs text-slate-400">Account: {user?.email}</p>
              </div>
            </div>

            <div className="mb-6 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 leading-relaxed">
              Your Master Password unlocks your encrypted vault on this device using client-side{' '}
              <strong className="text-blue-200">Argon2id</strong> and{' '}
              <strong className="text-blue-200">AES-256-GCM</strong>. It is never stored on or transmitted to the server.
            </div>

            {(validationError || unlockError) && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2.5 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{validationError || unlockError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Master Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong master password"
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

                {/* Password strength meter */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 h-1.5 w-full bg-[#0e1628] rounded-full overflow-hidden">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`flex-1 transition-colors ${
                            index < strength ? strengthColors[strength] : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 inline-block">
                      Strength: <span className="font-semibold text-slate-200">{strengthLabels[strength]}</span>
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm Master Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter master password"
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Master Password Hint <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="A memory trigger (never enter your password here)"
                  className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={unlockLoading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20"
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-500">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">Save Your Recovery Key</h1>
                <p className="text-xs text-amber-400 font-medium">Critical Emergency Access Key</p>
              </div>
            </div>

            <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 leading-relaxed">
              If you ever forget your Master Password, this Recovery Key is the <strong>only way</strong> to recover your encrypted passwords. We do not store your master password or unencrypted vault key.
            </div>

            {/* Formatted Key Box */}
            <div className="mb-6 p-4 bg-[#0a0f1d] border border-[#1f2e4d] rounded-xl flex items-center justify-between font-mono text-sm tracking-wider text-slate-200 select-all">
              <span className="break-all">{recoveryKey}</span>
              <button
                type="button"
                onClick={copyRecoveryKey}
                className="ml-3 p-2 bg-[#162036] hover:bg-[#1e2d4d] border border-[#2b3f66] rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0 text-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recoveryConfirmed}
                onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300 leading-normal">
                I have securely saved this recovery key in a password manager, physical safe, or offline document. I understand that losing both my Master Password and Recovery Key means permanent loss of vault access.
              </span>
            </label>

            <button
              type="button"
              disabled={!recoveryConfirmed}
              onClick={handleFinish}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20"
            >
              Continue to Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
