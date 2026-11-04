import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldCheck, AlertTriangle, ArrowRight, Mail, KeyRound } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginPage: React.FC = () => {
  const { user, loginWithGoogle, devLogin, error, googleConfigured, googleClientId } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);

  // Dev Login State
  const [devEmail, setDevEmail] = useState('wexepak186@digeros.com');
  const [devName, setDevName] = useState('Alex Developer');

  useEffect(() => {
    if (user) {
      if (!user.emailVerified) {
        navigate('/verify-email');
      } else if (!user.hasMasterPassword) {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;

    setLoading(true);
    setLocalError(null);

    try {
      const res = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
      });
      setRegisteredEmail(regEmail.trim());
      if (res.devVerificationToken) {
        setDevVerificationToken(res.devVerificationToken);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center justify-center text-[#168568] mb-3.5 shadow-subtle">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#202923] tracking-tight">NomaanOS Vault</h1>
          <p className="text-xs text-[#78827B] mt-1">Zero-Knowledge Security Workspace</p>
        </div>

        {/* Global Error Display */}
        {(error || localError) && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs text-left">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error || localError}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        {!registeredEmail && (
          <div className="flex bg-[#F7F8F5] p-1 rounded-2xl border border-[#E5E9E5] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#202923] shadow-2xs'
                  : 'text-[#78827B] hover:text-[#202923]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#202923] shadow-2xs'
                  : 'text-[#78827B] hover:text-[#202923]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* ================= REGISTER VIEW ================= */}
        {mode === 'register' && !registeredEmail && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#78827B] leading-relaxed">
              We will send a cryptographic verification link to this email address. You will set your Master Password after verification.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#168568] hover:bg-[#126e56] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-subtle flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= REGISTER SUCCESS STATE ================= */}
        {mode === 'register' && registeredEmail && (
          <div className="py-2 space-y-5 text-center">
            <div className="w-12 h-12 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center justify-center text-[#168568] mx-auto">
              <Mail className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-[#202923]">Check Your Email</h2>
              <p className="text-xs text-[#78827B]">
                We sent a secure verification link to <strong className="text-[#202923]">{registeredEmail}</strong>.
              </p>
            </div>

            <div className="p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl text-xs text-[#78827B] text-left space-y-1.5">
              <p className="font-semibold text-[#202923]">Next Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the verification link in your email.</li>
                <li>Set your permanent Master Password.</li>
                <li>Save your Emergency Recovery Key to unlock your vault.</li>
              </ol>
            </div>

            {/* Direct dev verification link for local dev ease */}
            {devVerificationToken && (
              <div className="p-3 bg-[#E7F4EF] border border-[#B7E3D6] rounded-xl text-xs text-[#168568] text-left">
                <p className="font-semibold mb-1">Development Mode Link:</p>
                <button
                  type="button"
                  onClick={() => navigate(`/verify-email?token=${devVerificationToken}`)}
                  className="text-xs text-[#168568] underline font-bold hover:text-[#126e56]"
                >
                  Verify account immediately &rarr;
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setRegisteredEmail(null);
                setMode('login');
              }}
              className="text-xs text-[#168568] font-semibold hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* ================= SIGN IN VIEW ================= */}
        {mode === 'login' && (
          <div className="space-y-5">
            {/* Real Google OAuth Section */}
            <div className="flex flex-col items-center">
              {googleConfigured ? (
                <div ref={googleButtonRef} className="w-full flex justify-center min-h-[44px]" />
              ) : (
                <div className="w-full p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 text-left">
                  <p className="font-semibold">Google OAuth Not Configured</p>
                  <p className="text-[11px] mt-0.5 text-amber-700">
                    Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, or use registration / dev login below.
                  </p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#E5E9E5] w-full" />
              <span className="bg-white px-3 text-[11px] text-[#78827B] uppercase tracking-wider font-semibold absolute">
                or local testing
              </span>
            </div>

            {/* Dev / Test Login Section */}
            <form onSubmit={handleDevSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="Test User"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-white hover:bg-[#F3F5F2] border border-[#E5E9E5] hover:border-[#168568] text-[#202923] font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#168568]" />
                <span>Sign In Directly</span>
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-[#78827B]">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#168568] font-bold hover:underline"
                >
                  Create one now
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
