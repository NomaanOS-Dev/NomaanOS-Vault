import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Mail, RefreshCw } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(Boolean(token));
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const doVerify = async () => {
      try {
        setLoading(true);
        setError(null);
        await api.verifyEmail(token);
        await refreshUser();
        setVerified(true);
      } catch (err: any) {
        setError(err.message || 'The verification link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    try {
      setResending(true);
      setResendMessage(null);
      await api.resendVerification(resendEmail.trim());
      setResendMessage('If an unverified account exists with that email, a new link has been dispatched.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification link.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card text-center">
        {/* Brand Emblem */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] text-[#168568] mb-4 shadow-subtle">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-[#202923] tracking-tight mb-2">
          {verified ? 'Email Verified Successfully' : 'Account Verification'}
        </h1>

        {loading && (
          <div className="py-8 space-y-3">
            <div className="inline-block animate-spin text-[#168568]">
              <RefreshCw className="w-8 h-8" />
            </div>
            <p className="text-xs text-[#78827B]">
              Verifying your cryptographic security token...
            </p>
          </div>
        )}

        {!loading && verified && (
          <div className="py-4 space-y-5">
            <div className="p-4 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl text-xs text-[#168568] flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Your email address is verified. You can now initialize your encrypted vault.</span>
            </div>

            <button
              onClick={() => navigate('/setup-master-password')}
              className="w-full py-3 px-4 bg-[#168568] hover:bg-[#126e56] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-subtle flex items-center justify-center gap-2 transition-colors"
            >
              <span>Continue to Master Password Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!loading && !verified && (
          <div className="py-4 space-y-5 text-left">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!token && (
              <div className="p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl text-xs text-[#78827B] text-center">
                Please check your inbox and click the verification link sent during registration.
              </div>
            )}

            {/* Resend Verification Form */}
            <form onSubmit={handleResend} className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-[#202923]">
                Need a new verification link?
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
                />
              </div>

              {resendMessage && (
                <div className="p-3 bg-[#E7F4EF] border border-[#B7E3D6] rounded-xl text-[11px] text-[#168568]">
                  {resendMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resending || !resendEmail}
                className="w-full py-2.5 bg-white hover:bg-[#F3F5F2] border border-[#E5E9E5] hover:border-[#168568] text-[#202923] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <Mail className="w-3.5 h-3.5 text-[#168568]" />
                <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link to="/login" className="text-xs text-[#168568] hover:underline font-semibold">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

