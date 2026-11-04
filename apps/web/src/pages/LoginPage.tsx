import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, AlertTriangle, Info, ArrowRight } from 'lucide-react';

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
          theme: 'filled_blue',
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
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131d31] border border-[#1f2e4d] rounded-xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-blue-500 mb-4 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">SecureVault</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Zero-Knowledge Password Vault</p>
        </div>

        {/* Global Error */}
        {(error || localError) && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error || localError}</span>
          </div>
        )}

        {/* Real Google OAuth Section */}
        <div className="mb-6 flex flex-col items-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
            Sign in with verified Google account
          </label>

          {googleConfigured ? (
            <div className="w-full flex justify-center">
              <div ref={googleButtonRef} className="min-h-[44px]"></div>
            </div>
          ) : (
            <div className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-semibold mb-1 text-amber-200">
                <Info className="w-4 h-4 shrink-0" />
                <span>Google OAuth Pending Configuration</span>
              </div>
              <p>
                To enable live Google Sign-In, add your Google OAuth credentials to{' '}
                <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-amber-100">.env</code>:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-[11px] text-amber-200/90">
                <li>GOOGLE_CLIENT_ID</li>
                <li>GOOGLE_CLIENT_SECRET</li>
              </ul>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1f2e4d]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#131d31] px-2 text-slate-400 font-medium">Quick Access / Testing</span>
          </div>
        </div>

        {/* Developer / Testing Account Flow */}
        <form onSubmit={handleDevSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Verified Email
            </label>
            <input
              type="email"
              required
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/20"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⏳</span>
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Sign in to Vault</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-[#1f2e4d] text-center">
          <p className="text-xs text-slate-500">
            Client-side zero-knowledge encryption ensures your vault data is never visible to the server.
          </p>
        </div>
      </div>
    </div>
  );
};
