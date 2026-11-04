import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { PublicSendResponse } from '@pwm/shared';
import {
  importSendKeyFromBase64Url,
  decryptSendText,
  decryptSendFile,
} from '../lib/sendCrypto';
import {
  Send,
  Lock,
  Copy,
  Check,
  Eye,
  Download,
  AlertTriangle,
  Mail,
} from 'lucide-react';

export const PublicSendRecipientPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [sendData, setSendData] = useState<PublicSendResponse | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Challenge states
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // Extract decryption key from URL hash fragment #key=...
  const getKeyFromFragment = () => {
    const hash = window.location.hash;
    const match = hash.match(/key=([^&]+)/);
    return match ? match[1] : null;
  };

  const loadPublicSend = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicSend(token);
      setSendData(data);

      // If text send and no challenges required, decrypt immediately
      if (data.sendType === 'TEXT' && data.encryptedPayload) {
        await decryptAndSetText(data.encryptedPayload);
      }

      setIsRevealed(!data.hideTextByDefault);
    } catch (err: any) {
      setError(err.message || 'This Send is unavailable, expired, or has reached its access limit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublicSend();
  }, [token]);

  const decryptAndSetText = async (encryptedPayload: string) => {
    const keyBase64Url = getKeyFromFragment();
    if (!keyBase64Url) {
      throw new Error('Decryption key is missing from the link URL fragment (#key=...).');
    }
    const cryptoKey = await importSendKeyFromBase64Url(keyBase64Url);
    const plaintext = await decryptSendText(cryptoKey, encryptedPayload);
    setDecryptedText(plaintext);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;
    setSubmittingChallenge(true);
    setChallengeError(null);

    try {
      const res = await api.verifySendPassword(token, password);
      if (res.encryptedPayload) {
        await decryptAndSetText(res.encryptedPayload);
      }
      setSendData((prev) => (prev ? { ...prev, requiresPassword: false, encryptedPayload: res.encryptedPayload } : null));
    } catch (err: any) {
      setChallengeError(err.message || 'Incorrect password');
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) return;
    setSubmittingChallenge(true);
    setChallengeError(null);

    try {
      const res = await api.verifySendEmail(token, email);
      if (res.encryptedPayload) {
        await decryptAndSetText(res.encryptedPayload);
      }
      setSendData((prev) =>
        prev ? { ...prev, requiresEmailVerification: false, encryptedPayload: res.encryptedPayload } : null
      );
    } catch (err: any) {
      setChallengeError(err.message || 'Email verification failed. You may not be an authorized recipient.');
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!token) return;
    try {
      setSubmittingChallenge(true);
      const downloadUrl = api.getPublicSendDownloadUrl(token);
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error('Failed to download encrypted file');
      }

      const encryptedBlob = await res.blob();
      const keyBase64Url = getKeyFromFragment();
      if (!keyBase64Url) {
        throw new Error('Decryption key is missing from URL fragment');
      }

      const cryptoKey = await importSendKeyFromBase64Url(keyBase64Url);
      const decryptedBlob = await decryptSendFile(
        cryptoKey,
        encryptedBlob,
        sendData?.fileInfo?.mimeType || 'application/octet-stream'
      );

      const objectUrl = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = sendData?.fileInfo?.originalFileName || 'downloaded-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      alert(err.message || 'Error downloading and decrypting file');
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleCopyText = () => {
    if (!decryptedText) return;
    navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center p-4">
      {/* Central Card matching Screenshot 8 */}
      <div className="w-full max-w-lg bg-[#131d31] border border-[#1f2e4d] rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Top Paper Airplane Icon Badge */}
        <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/40 rounded-2xl flex items-center justify-center text-blue-400 mb-4 shadow-inner">
          <Send className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-white mb-1">View Send</h1>

        {loading ? (
          <div className="py-12 text-xs text-slate-400">
            <span className="inline-block animate-spin mr-2">⚙️</span>
            Fetching end-to-end encrypted Send...
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-3 text-left">
              <AlertTriangle className="w-6 h-6 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <p className="text-xs text-slate-500">
              Sends automatically expire or disappear once revoked or access limits are reached.
            </p>
          </div>
        ) : sendData ? (
          <div className="w-full space-y-5 mt-2">
            {/* Sender attribution */}
            <p className="text-xs text-slate-400">
              {sendData.senderEmail ? (
                <>
                  SecureVault member <span className="text-blue-400 font-medium">{sendData.senderEmail}</span> shared the following with you
                </>
              ) : (
                'A SecureVault member shared the following with you'
              )}
            </p>

            {/* Send Name */}
            <h2 className="text-base font-bold text-white">{sendData.name}</h2>

            {/* Password Challenge Prompt */}
            {sendData.requiresPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>This Send is password-protected. Enter the password to unlock.</span>
                </div>

                {challengeError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                    {challengeError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingChallenge}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs shadow-lg shadow-blue-600/20"
                >
                  {submittingChallenge ? 'Verifying...' : 'Unlock Content'}
                </button>
              </form>
            ) : sendData.requiresEmailVerification ? (
              /* Email Verification Challenge Prompt */
              <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>This Send is restricted to specific authorized email addresses.</span>
                </div>

                {challengeError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                    {challengeError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingChallenge}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs shadow-lg shadow-blue-600/20"
                >
                  {submittingChallenge ? 'Verifying...' : 'Access Content'}
                </button>
              </form>
            ) : sendData.sendType === 'TEXT' ? (
              /* Revealed / Hidden Text Display matching Screenshot 8 */
              <div className="space-y-4">
                <div className="p-4 bg-[#0a0f1d] border border-[#1f2e4d] rounded-xl text-left font-mono text-sm text-slate-100 min-h-[100px] flex items-center justify-center relative">
                  {!isRevealed ? (
                    <button
                      onClick={() => setIsRevealed(true)}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Click to reveal shared text</span>
                    </button>
                  ) : (
                    <div className="w-full break-all whitespace-pre-wrap select-all">
                      {decryptedText}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCopyText}
                  disabled={!isRevealed}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied value' : 'Copy value'}</span>
                </button>
              </div>
            ) : (
              /* File Download Display */
              <div className="space-y-4">
                <div className="p-4 bg-[#0a0f1d] border border-[#1f2e4d] rounded-xl text-left space-y-1">
                  <span className="block text-xs font-semibold text-white">
                    {sendData.fileInfo?.originalFileName}
                  </span>
                  <span className="block text-[11px] text-slate-400 font-mono">
                    Size: {((sendData.fileInfo?.encryptedSize || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>

                <button
                  onClick={handleDownloadFile}
                  disabled={submittingChallenge}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>{submittingChallenge ? 'Decrypting...' : 'Download and Decrypt File'}</span>
                </button>
              </div>
            )}

            {/* Bottom Expiration Notice */}
            <p className="text-[11px] text-slate-500 pt-2">
              This Send expires at {new Date(sendData.expiresAt).toLocaleString()}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
