import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import {
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
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Exceptional'];
  const strengthColors = [
    'bg-red-500',
    'bg-red-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-blue-600',
    'bg-[#168568]',
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
    <div className="flex-1 flex flex-col bg-[#F7F8F5] overflow-y-auto min-w-0">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E9E5] px-4 sm:px-8 py-5 shrink-0 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#202923] tracking-tight">
              Account & Settings
            </h1>
            <p className="text-xs text-[#78827B] mt-0.5">
              Manage your profile identity, zero-knowledge master password, and recovery keys.
            </p>
          </div>

          <button
            onClick={logout}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'profile'
                ? 'bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] shadow-subtle'
                : 'bg-white text-[#78827B] border border-[#E5E9E5] hover:text-[#202923]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Account</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] shadow-subtle'
                : 'bg-white text-[#78827B] border border-[#E5E9E5] hover:text-[#202923]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Master Password</span>
          </button>

          <button
            onClick={() => setActiveTab('recovery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'recovery'
                ? 'bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] shadow-subtle'
                : 'bg-white text-[#78827B] border border-[#E5E9E5] hover:text-[#202923]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Emergency Recovery Key</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* ================= TAB 1: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Overview Card */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card">
              <h2 className="text-sm font-bold text-[#202923] mb-5 flex items-center gap-2">
                <User className="w-4 h-4 text-[#168568]" />
                <span>Profile Information</span>
              </h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#E5E9E5]">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.username}
                    className="w-16 h-16 rounded-2xl border-2 border-[#B7E3D6] shadow-subtle object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] text-2xl font-bold shadow-subtle">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-[#202923]">{user?.username}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6]">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-[#78827B] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email}</span>
                  </p>
                  <p className="text-[11px] text-[#78827B] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Member since {formattedDate}</span>
                  </p>
                </div>
              </div>

              {/* Edit Display Name Form */}
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                {profileSuccess && (
                  <div className="p-3 bg-[#E7F4EF] border border-[#B7E3D6] rounded-xl text-xs text-[#168568] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Profile display name updated successfully!</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Email Address (Locked)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-[#EAECE8] border border-[#E5E9E5] rounded-xl px-3.5 py-2.5 text-xs text-[#78827B] cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving || displayName === user?.username}
                    className="px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-subtle transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Account Metadata & Security Identity */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card space-y-4">
              <h3 className="text-sm font-bold text-[#202923] flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#168568]" />
                <span>Authentication & Security Identity</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4">
                  <span className="text-[10px] text-[#78827B] uppercase font-bold tracking-wider block mb-1">
                    Sign-in Provider
                  </span>
                  <span className="font-bold text-[#202923] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#168568]"></span>
                    Google OAuth 2.0 / OIDC
                  </span>
                </div>

                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4">
                  <span className="text-[10px] text-[#78827B] uppercase font-bold tracking-wider block mb-1">
                    Encryption Standards
                  </span>
                  <span className="font-bold text-[#168568] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AES-256-GCM + Argon2id
                  </span>
                </div>

                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4">
                  <span className="text-[10px] text-[#78827B] uppercase font-bold tracking-wider block mb-1">
                    Vault Memory Status
                  </span>
                  <span className="font-bold text-[#202923]">
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
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#202923]">Change Master Password</h2>
                  <p className="text-xs text-[#78827B]">
                    Re-encrypts your vault key with a new Master Password using Argon2id and fresh salt.
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-[#E7F4EF]/60 border border-[#B7E3D6] rounded-2xl text-xs text-[#168568] leading-relaxed">
                <strong>Zero-Knowledge Key Re-wrapping:</strong> Changing your master password
                re-wraps your symmetric Vault Key with a newly derived Argon2id key. None of your stored
                passwords or encrypted items will be modified or lost.
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3.5 bg-[#E7F4EF] border border-[#B7E3D6] rounded-xl text-xs text-[#168568] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Master password changed and vault keys updated successfully!</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Current Master Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Current Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current master password"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#202923] outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Master Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    New Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters (14+ recommended)"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#202923] outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength Bar */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#78827B]">Strength:</span>
                        <span className="font-bold text-[#202923]">{strengthLabels[strength]}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#E5E9E5] rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-full flex-1 rounded-full transition-colors ${
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
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Confirm New Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new master password"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#202923] outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Optional Hint */}
                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Master Password Hint <span className="text-[#78827B] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="A memory trigger (never your actual password)"
                    className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#202923] outline-none"
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-6 py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white rounded-xl text-xs font-semibold shadow-subtle flex items-center gap-2 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {passwordLoading ? 'Re-wrapping Vault Key...' : 'Change Master Password'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TAB 3: EMERGENCY RECOVERY KEY ================= */}
        {activeTab === 'recovery' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#202923]">Emergency Recovery Key</h2>
                  <p className="text-xs text-[#78827B]">
                    Zero-knowledge emergency recovery in case your Master Password is forgotten.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed space-y-1.5 mb-6">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Important Zero-Knowledge Security Safeguard</span>
                </div>
                <p>
                  Because SecureVault operates under strict zero-knowledge encryption, nobody — not
                  even administrators — can recover your account if you lose your Master Password.
                  Your Recovery Key allows you to regain access and establish a new Master Password.
                </p>
              </div>

              {recoveryError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {/* Newly Rotated Key Display Card */}
              {newRotatedKey ? (
                <div className="p-6 bg-[#E7F4EF]/50 border border-[#B7E3D6] rounded-2xl shadow-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#168568] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      New Emergency Recovery Key Generated
                    </span>
                    <button
                      onClick={copyRecoveryKey}
                      className="px-3.5 py-1.5 bg-[#168568] hover:bg-[#126e56] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-subtle"
                    >
                      {recoveryCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{recoveryCopied ? 'Copied' : 'Copy Key'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-white border border-[#B7E3D6] rounded-xl font-mono text-sm sm:text-base font-bold text-center text-[#168568] tracking-wider break-all select-all shadow-subtle">
                    {newRotatedKey}
                  </div>

                  <p className="text-[11px] text-[#202923]/80 leading-relaxed">
                    Write down or store this key in a secure location (e.g. physical safe, password-protected USB).
                    Your old recovery key is now deactivated.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-[#202923] mb-0.5">
                      Rotate Emergency Recovery Key
                    </h4>
                    <p className="text-[11px] text-[#78827B]">
                      Generate a fresh 32-character recovery key and invalidate the previous one.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowRotateConfirmModal(true)}
                    disabled={rotatingRecovery || !isVaultUnlocked}
                    className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
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
        <div className="fixed inset-0 bg-[#202923]/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-modal space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202923]">Rotate Recovery Key?</h3>
                <p className="text-xs text-[#78827B]">This action will invalidate your current key.</p>
              </div>
            </div>

            <p className="text-xs text-[#202923] leading-relaxed">
              Generating a new Emergency Recovery Key will immediately re-wrap your vault key and
              deactivate your previous recovery key. Be prepared to store the new key in a safe offline location.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E9E5]">
              <button
                type="button"
                onClick={() => setShowRotateConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78827B] hover:text-[#202923]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateRecoveryKey}
                className="px-5 py-2 bg-[#168568] hover:bg-[#126e56] text-white rounded-xl text-xs font-semibold transition-colors shadow-subtle"
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
