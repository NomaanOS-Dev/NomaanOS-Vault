import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import {
  Settings,
  User,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  LogOut,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Save,
  CheckCircle2,
  Calendar,
  Mail,
  Fingerprint,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { changeMasterPassword, rotateRecoveryKey, isVaultUnlocked } = useVault();

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'recovery'>('profile');

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Master Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Recovery Key Rotation State
  const [rotatingRecovery, setRotatingRecovery] = useState(false);
  const [newRotatedKey, setNewRotatedKey] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [showRotateConfirmModal, setShowRotateConfirmModal] = useState(false);

  // Password strength
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(newPassword);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-red-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-emerald-500',
  ];

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!displayName.trim()) {
      setProfileError('Display name cannot be empty');
      return;
    }

    try {
      setProfileSaving(true);
      await updateProfile({ username: displayName.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Master Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Current master password is required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New master password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New master passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New master password cannot be identical to your current password');
      return;
    }

    try {
      setPasswordLoading(true);
      await changeMasterPassword(currentPassword, newPassword, hint || undefined);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHint('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change master password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Recovery Key Rotation
  const handleRotateRecoveryKey = async () => {
    setRecoveryError(null);
    try {
      setRotatingRecovery(true);
      const res = await rotateRecoveryKey();
      setNewRotatedKey(res.recoveryKey);
      setShowRotateConfirmModal(false);
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to rotate recovery key');
    } finally {
      setRotatingRecovery(false);
    }
  };

  const copyRecoveryKey = () => {
    if (newRotatedKey) {
      navigator.clipboard.writeText(newRotatedKey);
      setRecoveryCopied(true);
      setTimeout(() => setRecoveryCopied(false), 2500);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f1d] overflow-y-auto">
      {/* Header */}
      <div className="h-16 border-b border-[#1e293b] px-8 flex items-center justify-between shrink-0 bg-[#0c1322]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Account & Settings</h1>
            <p className="text-[11px] text-slate-400">
              Manage your profile, encryption keys, and zero-knowledge security.
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="border-b border-[#1e293b] bg-[#0c1322]/50 px-8 flex items-center gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Master Password</span>
        </button>

        <button
          onClick={() => setActiveTab('recovery')}
          className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'recovery'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Emergency Recovery Key</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* ================= TAB 1: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Overview Card */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span>Profile Information</span>
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#1e293b]">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.username}
                    className="w-16 h-16 rounded-2xl border-2 border-blue-500/40 shadow-md object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{user?.username}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{user?.email}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Member since {formattedDate}</span>
                  </p>
                </div>
              </div>

              {/* Edit Display Name Form */}
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                {profileSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Profile updated successfully!</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-[#131d31] border border-[#1f2e4d] focus:border-blue-500 rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address (Locked)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-[#131d31]/50 border border-[#1f2e4d]/50 rounded-lg px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving || displayName === user?.username}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Account Metadata & Security Identity */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                <span>Authentication & Security Identity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Sign-in Provider
                  </span>
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Google OAuth 2.0 / OIDC
                  </span>
                </div>

                <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Vault Security Status
                  </span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AES-256-GCM + Argon2id
                  </span>
                </div>

                <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Session Lock
                  </span>
                  <span className="font-semibold text-slate-200">
                    {isVaultUnlocked ? 'Unlocked in Memory' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MASTER PASSWORD ================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Change Master Password</h2>
                  <p className="text-[11px] text-slate-400">
                    Re-encrypts your vault key with a new Master Password using Argon2id and fresh salt.
                  </p>
                </div>
              </div>

              <div className="mb-6 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 leading-relaxed">
                <strong>Zero-Knowledge Preservation:</strong> Changing your master password re-wraps
                your symmetric Vault Key with a newly derived Argon2id key. None of your stored passwords
                or encrypted items will be modified or lost.
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Master password changed and vault keys updated successfully!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Current Master Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current master password"
                      className="w-full bg-[#131d31] border border-[#1f2e4d] focus:border-blue-500 rounded-lg px-3.5 py-2 pr-10 text-xs text-slate-200 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Master Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters (12+ recommended)"
                      className="w-full bg-[#131d31] border border-[#1f2e4d] focus:border-blue-500 rounded-lg px-3.5 py-2 pr-10 text-xs text-slate-200 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength Bar */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Strength:</span>
                        <span className="font-semibold text-slate-300">
                          {strengthLabels[strength]}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#1f2e4d] rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-full flex-1 transition-colors ${
                              strength >= lvl ? strengthColors[strength] : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new master password"
                      className="w-full bg-[#131d31] border border-[#1f2e4d] focus:border-blue-500 rounded-lg px-3.5 py-2 pr-10 text-xs text-slate-200 outline-none transition-colors"
                      required
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

                {/* Optional Hint */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Master Password Hint <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="A memory trigger (never include your actual password)"
                    className="w-full bg-[#131d31] border border-[#1f2e4d] focus:border-blue-500 rounded-lg px-3.5 py-2 text-xs text-slate-200 outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{passwordLoading ? 'Re-encrypting Vault Keys...' : 'Change Master Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TAB 3: EMERGENCY RECOVERY KEY ================= */}
        {activeTab === 'recovery' && (
          <div className="space-y-6">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Emergency Recovery Key</h2>
                  <p className="text-[11px] text-slate-400">
                    Zero-knowledge emergency recovery in case your Master Password is forgotten.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed space-y-2 mb-6">
                <div className="flex items-center gap-2 font-semibold text-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Important Security Safeguard</span>
                </div>
                <p>
                  Because SecureVault operates under strict zero-knowledge encryption, nobody — not
                  even administrators — can recover your account if you lose your Master Password.
                  Your Recovery Key allows you to regain access and establish a new Master Password.
                </p>
              </div>

              {recoveryError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {/* Newly Rotated Key Display Card */}
              {newRotatedKey ? (
                <div className="p-5 bg-gradient-to-r from-blue-950/40 via-[#131d31] to-[#0f172a] border border-blue-500/40 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      New Emergency Recovery Key Generated
                    </span>
                    <button
                      onClick={copyRecoveryKey}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {recoveryCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{recoveryCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] border border-[#1f2e4d] rounded-xl font-mono text-sm text-center text-blue-300 tracking-wider break-all select-all">
                    {newRotatedKey}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Write down or store this key in a secure location (e.g. physical safe, password-protected USB).
                    Your old recovery key is now deactivated.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#131d31] border border-[#1f2e4d] rounded-xl">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200 mb-0.5">
                      Rotate Emergency Recovery Key
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Generate a fresh 32-character recovery key and invalidate the previous one.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowRotateConfirmModal(true)}
                    disabled={rotatingRecovery || !isVaultUnlocked}
                    className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{rotatingRecovery ? 'Rotating...' : 'Rotate Recovery Key'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rotate Key Confirmation Dialog */}
      {showRotateConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131d31] border border-[#1f2e4d] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Rotate Recovery Key?</h3>
                <p className="text-xs text-slate-400">This action will invalidate your current key.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Generating a new Emergency Recovery Key will immediately re-wrap your vault key and
              deactivate your previous recovery key. Be prepared to store the new key in a safe offline location.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRotateConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-[#1a2948] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateRecoveryKey}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                Yes, Rotate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

