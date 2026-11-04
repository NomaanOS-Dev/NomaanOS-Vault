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
  const { rotateRecoveryKey, isVaultUnlocked } = useVault();

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'recovery'>('profile');

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Recovery Key Rotation State
  const [rotatingRecovery, setRotatingRecovery] = useState(false);
  const [newRotatedKey, setNewRotatedKey] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [showRotateConfirmModal, setShowRotateConfirmModal] = useState(false);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileError('Display name cannot be blank.');
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError(null);
      setProfileSuccess(false);
      await updateProfile({ username: displayName.trim() });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Recovery Key Rotation
  const handleRotateRecovery = async () => {
    try {
      setRotatingRecovery(true);
      setRecoveryError(null);
      const res = await rotateRecoveryKey();
      setNewRotatedKey(res.recoveryKey);
      setShowRotateConfirmModal(false);
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to rotate recovery key');
    } finally {
      setRotatingRecovery(false);
    }
  };

  const handleCopyRecovery = () => {
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
    <div className="flex-1 flex flex-col h-full bg-[#F7F8F5] overflow-y-auto">
      {/* Top Bar Header */}
      <div className="bg-white border-b border-[#E5E9E5] px-4 sm:px-8 py-5">
        <h1 className="text-xl sm:text-2xl font-bold text-[#202923] tracking-tight">Settings</h1>
        <p className="text-xs text-[#78827B] mt-0.5">
          Manage your account profile, emergency recovery key, and security workspace.
        </p>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar">
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
            onClick={() => setActiveTab('recovery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'recovery'
                ? 'bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] shadow-subtle'
                : 'bg-white text-[#78827B] border border-[#E5E9E5] hover:text-[#202923]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Security & Recovery Key</span>
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
                      Registered Email Address
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-[#F7F8F5] border border-[#E5E9E5] text-[#78827B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm cursor-not-allowed select-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving || displayName.trim() === user?.username}
                    className="px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] disabled:text-[#78827B] text-white rounded-xl text-xs font-semibold shadow-subtle flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Logout & Session Card */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#202923]">End Secure Session</h3>
                <p className="text-xs text-[#78827B] mt-0.5">
                  Sign out from this device. Your unencrypted vault key in memory will be wiped immediately.
                </p>
              </div>
              <button
                onClick={logout}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out of NomaanOS Vault</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: SECURITY & RECOVERY KEY ================= */}
        {activeTab === 'recovery' && (
          <div className="space-y-6">
            {/* Master Password Architecture Notice */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#202923]">Master Password Architecture</h2>
                  <p className="text-xs text-[#78827B]">
                    Fixed zero-knowledge master key derivation policy.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl text-xs text-[#202923] leading-relaxed space-y-2">
                <p>
                  <strong>Fixed Master Password Security Policy:</strong> In NomaanOS Vault, your Master Password is set during initial account setup and cannot be changed or reset by anyone—including system administrators.
                </p>
                <p className="text-[#78827B]">
                  This guarantees that no attacker or unauthorized API request can swap your key derivation envelope. To safeguard your vault, keep your Emergency Recovery Key stored in an offline physical safe.
                </p>
              </div>
            </div>

            {/* Emergency Recovery Key Management */}
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

              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed space-y-2">
                <p>
                  <strong>What is the Recovery Key?</strong> When you initialized your vault, a cryptographic recovery key was generated. It holds an auxiliary wrapped copy of your symmetric Vault Key.
                </p>
                <p>
                  If you suspect your existing Recovery Key was exposed or lost, you can rotate it below. Rotating wraps your existing vault key under a fresh 32-character recovery key and invalidates previous keys.
                </p>
              </div>

              {recoveryError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              {/* Newly Rotated Key Display Box */}
              {newRotatedKey ? (
                <div className="p-5 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#168568]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>New Recovery Key Generated Successfully!</span>
                  </div>

                  <p className="text-xs text-[#202923]">
                    Please copy and store your new emergency recovery key in a secure location right now. Your old recovery key is no longer valid.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-white border border-[#B7E3D6] rounded-xl font-mono text-sm tracking-wider font-semibold text-[#202923] select-all">
                    <span className="break-all">{newRotatedKey}</span>
                    <button
                      type="button"
                      onClick={handleCopyRecovery}
                      className="w-full sm:w-auto px-4 py-2 bg-[#E7F4EF] hover:bg-[#d8efe7] text-[#168568] rounded-lg text-xs font-sans font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      {recoveryCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{recoveryCopied ? 'Copied' : 'Copy Key'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setNewRotatedKey(null)}
                    className="text-xs text-[#168568] hover:underline font-semibold"
                  >
                    Done, I have securely saved this key
                  </button>
                </div>
              ) : (
                <div>
                  {!isVaultUnlocked ? (
                    <div className="p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl text-xs text-[#78827B] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        Your vault must be unlocked before you can rotate your emergency recovery key.
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowRotateConfirmModal(true)}
                      className="px-5 py-2.5 bg-white hover:bg-[#F3F5F2] border border-[#E5E9E5] hover:border-[#168568] text-[#202923] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#168568]" />
                      <span>Rotate Emergency Recovery Key</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cryptographic Parameters Info Card */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card">
              <h3 className="text-sm font-bold text-[#202923] mb-3 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#168568]" />
                <span>Zero-Knowledge Key Derivation Specifications</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5E9E5]">
                  <p className="text-[10px] text-[#78827B] uppercase font-bold">KDF Function</p>
                  <p className="font-semibold text-[#202923] mt-0.5">Argon2id</p>
                </div>
                <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5E9E5]">
                  <p className="text-[10px] text-[#78827B] uppercase font-bold">Memory Cost</p>
                  <p className="font-semibold text-[#202923] mt-0.5">64 MiB</p>
                </div>
                <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5E9E5]">
                  <p className="text-[10px] text-[#78827B] uppercase font-bold">Cipher Engine</p>
                  <p className="font-semibold text-[#202923] mt-0.5">AES-256-GCM</p>
                </div>
                <div className="p-3 bg-[#F7F8F5] rounded-xl border border-[#E5E9E5]">
                  <p className="text-[10px] text-[#78827B] uppercase font-bold">Salt Size</p>
                  <p className="font-semibold text-[#202923] mt-0.5">128-bit CSPRNG</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Key Rotation */}
      {showRotateConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#202923]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-modal space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-[#202923]">Rotate Recovery Key?</h3>
            <p className="text-xs text-[#78827B] leading-relaxed">
              This action will generate a brand new emergency recovery key and immediately invalidate any previously saved recovery keys.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRotateConfirmModal(false)}
                className="px-4 py-2 border border-[#E5E9E5] text-[#202923] rounded-xl text-xs font-semibold hover:bg-[#F3F5F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rotatingRecovery}
                onClick={handleRotateRecovery}
                className="px-5 py-2 bg-[#168568] hover:bg-[#126e56] text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                {rotatingRecovery ? 'Rotating...' : 'Confirm & Rotate Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
