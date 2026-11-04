import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, KeyRound, AlertTriangle, Info, ArrowRight } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginPage: React.FC = () => {
  const { user, loginWithGoogle, devLogin, error, googleConfigured, googleClientId } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('wexepak186@digeros.com');
  const [devName, setDevName] = useState('Alex Developer');

  useEffect(() => {
    if (user) {
      if (!user.hasMasterPassword) {
        navigate('/setup-master-password');
      } else {
        navigate('/vaults');
      }
    }
  }, [user, navigate]);

  // Initialize Google Identity Services button
  useEffect(() => {
    if (googleConfigured && googleClientId && window.google?.accounts?.id && googleButtonRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true);
              setLocalError(null);
              try {
                await loginWithGoogle(response.credential);
              } catch (err: any) {
                setLocalError(err.message || 'Google authentication failed');
              } finally {
                setLoading(false);
              }
            }
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 320,
        });
      } catch (err) {
        console.error('Google button render error:', err);
      }
    }
  }, [googleConfigured, googleClientId, loginWithGoogle]);

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail) return;
    setLoading(true);
    setLocalError(null);
    try {
      await devLogin(devEmail, devName);
    } catch (err: any) {
      setLocalError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-7 text-center">
          <div className="w-14 h-14 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center justify-center text-[#168568] mb-3.5 shadow-subtle">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#202923] tracking-tight">SecureVault</h1>
          <p className="text-xs text-[#78827B] mt-1">Zero-Knowledge Security Workspace</p>
        </div>

        {/* Global Error */}
        {(error || localError) && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs text-left">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error || localError}</span>
          </div>
        )}

        {/* Real Google OAuth Section */}
        <div className="mb-6 flex flex-col items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-[#78827B] mb-3 text-center">
            Sign in with verified Google account
          </label>

          {googleConfigured ? (
            <div className="w-full flex justify-center">
              <div ref={googleButtonRef} className="min-h-[44px]"></div>
            </div>
          ) : (
            <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs leading-relaxed text-left">
              <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-900">
                <Info className="w-4 h-4 shrink-0" />
                <span>Google OAuth Ready for Production</span>
              </div>
              <p>
                Add your Google Cloud client credentials to <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-amber-950">.env</code> to activate one-click Google Sign-In.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E9E5]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[#78827B] font-semibold text-[10px] tracking-wider">
              Quick Workspace Login
            </span>
          </div>
        </div>

        {/* Developer / Testing Account Flow */}
        <form onSubmit={handleDevSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1.5">
              Verified Email
            </label>
            <input
              type="email"
              required
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#168568] hover:bg-[#126e56] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs sm:text-sm shadow-subtle"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Open Secure Vault</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </form>

        <div className="mt-7 pt-4 border-t border-[#E5E9E5] text-center">
          <p className="text-[11px] text-[#78827B] leading-relaxed">
            Client-side zero-knowledge encryption ensures your vault credentials never touch our servers unencrypted.
          </p>
        </div>
      </div>
    </div>
  );
};
