import React, { useState, useEffect, useRef } from 'react';
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
  Copy,
  Check,
  Download,
  AlertTriangle,
  ShieldCheck,
  File as FileIcon,
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
  const fetchedRef = useRef<string | null>(null);

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
    if (!token || fetchedRef.current === token) return;
    fetchedRef.current = token;
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
      setSendData((prev) =>
        prev ? { ...prev, requiresPassword: false, encryptedPayload: res.encryptedPayload } : null
      );
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
        prev
          ? { ...prev, requiresEmailVerification: false, encryptedPayload: res.encryptedPayload }
          : null
      );
    } catch (err: any) {
      setChallengeError(
        err.message || 'Email verification failed. You may not be an authorized recipient.'
      );
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
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center p-4">
      {/* Brand Watermark */}
      <div className="mb-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#168568] flex items-center justify-center text-white shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <span className="font-bold text-sm tracking-tight text-[#202923]">
          SecureVault <span className="text-[#168568] font-normal">• Encrypted Share</span>
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card flex flex-col items-center text-center">
        {/* Airplane Icon Badge */}
        <div className="w-14 h-14 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center justify-center text-[#168568] mb-4 shadow-subtle">
          <Send className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold text-[#202923] mb-1">Secure Send</h1>

        {loading ? (
          <div className="py-14 text-xs text-[#78827B]">
            <span className="w-5 h-5 border-2 border-[#168568]/30 border-t-[#168568] rounded-full inline-block animate-spin mr-2 align-middle" />
            Fetching end-to-end encrypted Send...
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-red-800 mb-1">Send Unavailable</p>
              <p>{error}</p>
            </div>
          </div>
        ) : sendData?.requiresPassword ? (
          /* Password Protection Screen */
          <div className="w-full mt-4 space-y-4 text-left">
            <div className="text-center">
              <h2 className="text-sm font-bold text-[#202923]">{sendData.name}</h2>
              <p className="text-xs text-[#78827B] mt-0.5">This Send requires a password to decrypt.</p>
            </div>

            {challengeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {challengeError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter recipient password"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingChallenge || !password}
                className="w-full py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white text-xs font-semibold rounded-xl shadow-subtle transition-colors"
              >
                {submittingChallenge ? 'Verifying...' : 'Unlock & Decrypt'}
              </button>
            </form>
          </div>
        ) : sendData?.requiresEmailVerification ? (
          /* Email Restriction Challenge Screen */
          <div className="w-full mt-4 space-y-4 text-left">
            <div className="text-center">
              <h2 className="text-sm font-bold text-[#202923]">{sendData.name}</h2>
              <p className="text-xs text-[#78827B] mt-0.5">
                The sender restricted access to specific recipient emails.
              </p>
            </div>

            {challengeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {challengeError}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  Your Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingChallenge || !email}
                className="w-full py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white text-xs font-semibold rounded-xl shadow-subtle transition-colors"
              >
                {submittingChallenge ? 'Verifying...' : 'Verify Email Access'}
              </button>
            </form>
          </div>
        ) : (
          /* Decrypted Send Content Display */
          <div className="w-full mt-4 space-y-4 text-left">
            <div className="p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-[#168568]">
                  {sendData?.sendType === 'TEXT' ? 'Text Message' : 'Encrypted File'}
                </span>
                {!sendData?.hideSenderEmail && sendData?.senderEmail && (
                  <span className="text-[11px] text-[#78827B]">From: {sendData.senderEmail}</span>
                )}
              </div>
              <h2 className="text-base font-bold text-[#202923]">{sendData?.name}</h2>
            </div>

            {/* TEXT SEND CONTENT */}
            {sendData?.sendType === 'TEXT' && (
              <div className="space-y-3">
                <div className="relative bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 font-mono text-xs text-[#202923] min-h-[100px] break-all select-all">
                  {isRevealed ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{decryptedText}</p>
                  ) : (
                    <div className="h-20 flex flex-col items-center justify-center text-[#78827B] text-center">
                      <p className="mb-2">Hidden by sender for privacy</p>
                      <button
                        onClick={() => setIsRevealed(true)}
                        className="px-3 py-1 bg-white border border-[#E5E9E5] hover:border-[#168568] text-xs font-semibold text-[#168568] rounded-lg shadow-subtle"
                      >
                        Reveal Text
                      </button>
                    </div>
                  )}
                </div>

                {isRevealed && (
                  <button
                    onClick={handleCopyText}
                    className="w-full py-2.5 px-4 bg-[#168568] hover:bg-[#126e56] text-white font-semibold text-xs rounded-xl shadow-subtle transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                  </button>
                )}
              </div>
            )}

            {/* FILE SEND CONTENT */}
            {sendData?.sendType === 'FILE' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] text-[#168568] flex items-center justify-center shrink-0">
                    <FileIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-[#202923] truncate">
                      {sendData.fileInfo?.originalFileName}
                    </p>
                    <p className="text-[11px] text-[#78827B]">
                      {((sendData.fileInfo?.encryptedSize || 0) / 1024).toFixed(1)} KB •{' '}
                      {sendData.fileInfo?.mimeType}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadFile}
                  disabled={submittingChallenge}
                  className="w-full py-2.5 px-4 bg-[#168568] hover:bg-[#126e56] text-white font-semibold text-xs rounded-xl shadow-subtle transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{submittingChallenge ? 'Decrypting...' : 'Decrypt & Download File'}</span>
                </button>
              </div>
            )}

            {/* Expiration Note */}
            <div className="pt-2 text-center text-[11px] text-[#78827B]">
              Expires on {new Date(sendData?.expiresAt || '').toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
