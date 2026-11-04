import React, { useState, useEffect } from 'react';
import { VaultItemSummary, LoginPayload } from '@pwm/shared';
import { useVault } from '../../context/VaultContext';
import {
  X,
  Star,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

interface ViewLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VaultItemSummary | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export const ViewLoginModal: React.FC<ViewLoginModalProps> = ({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const { decryptItem } = useVault();
  const [payload, setPayload] = useState<LoginPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      decryptItem<LoginPayload>(item.encryptedPayload)
        .then((decrypted) => {
          setPayload(decrypted);
        })
        .catch((err) => {
          console.error('Decryption failed:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setPayload(null);
      setShowPassword(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const copyToClipboard = (text?: string, fieldName?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName || 'text');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white border border-[#E5E9E5] rounded-2xl shadow-modal flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E5] bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E7F4EF] border border-[#B7E3D6] text-[#168568] rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202923] tracking-tight">{item.itemName}</h2>
              <span className="text-[11px] text-[#168568] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Zero-Knowledge Decrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="p-2 rounded-xl text-[#78827B] hover:text-amber-500 hover:bg-[#F3F5F2] transition-colors"
            >
              <Star
                className={`w-5 h-5 ${
                  item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#78827B]'
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#78827B]">
              <span className="w-5 h-5 border-2 border-[#168568]/30 border-t-[#168568] rounded-full inline-block animate-spin mr-2 align-middle" />
              Decrypting credential in browser memory...
            </div>
          ) : (
            <>
              {/* Username */}
              <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#78827B] block mb-1">
                  Username
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#202923] font-mono break-all select-all">
                    {payload?.username || '—'}
                  </span>
                  {payload?.username && (
                    <button
                      onClick={() => copyToClipboard(payload.username, 'username')}
                      className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white transition-colors"
                      title="Copy username"
                    >
                      {copiedField === 'username' ? (
                        <Check className="w-4 h-4 text-[#168568]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#78827B] block mb-1">
                  Password
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#202923] font-mono select-all">
                    {payload?.password
                      ? showPassword
                        ? payload.password
                        : '••••••••••••••••'
                      : '—'}
                  </span>
                  {payload?.password && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-[#78827B] hover:text-[#202923] rounded-lg hover:bg-white transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(payload.password, 'password')}
                        className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white transition-colors"
                        title="Copy password"
                      >
                        {copiedField === 'password' ? (
                          <Check className="w-4 h-4 text-[#168568]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Authenticator Key */}
              {payload?.totpSecret && (
                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#78827B] block mb-1">
                    Authenticator Key (TOTP)
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#202923] font-mono break-all select-all">
                      {payload.totpSecret}
                    </span>
                    <button
                      onClick={() => copyToClipboard(payload.totpSecret, 'totp')}
                      className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white transition-colors"
                    >
                      {copiedField === 'totp' ? (
                        <Check className="w-4 h-4 text-[#168568]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* URIs */}
              {payload?.uris && payload.uris.length > 0 && payload.uris.some((u) => u.trim()) && (
                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#78827B] block">
                    Website Addresses
                  </span>
                  {payload.uris
                    .filter((u) => u.trim())
                    .map((uri, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-[#168568] font-medium truncate mr-2 select-all">
                          {uri}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(uri, `uri-${idx}`)}
                            className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white"
                            title="Copy link"
                          >
                            {copiedField === `uri-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-[#168568]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={uri.startsWith('http') ? uri : `https://${uri}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#78827B] hover:text-[#168568] rounded-lg hover:bg-white"
                            title="Open website"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Notes */}
              {payload?.notes && (
                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#78827B] block">
                    Secure Notes
                  </span>
                  <p className="text-xs text-[#202923] whitespace-pre-wrap leading-relaxed select-all">
                    {payload.notes}
                  </p>
                </div>
              )}

              {/* Custom fields */}
              {payload?.customFields && payload.customFields.length > 0 && (
                <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#78827B] block">
                    Custom Fields
                  </span>
                  {payload.customFields.map((cf) => (
                    <div key={cf.id} className="flex items-center justify-between text-xs">
                      <span className="text-[#78827B] font-semibold">{cf.name}:</span>
                      <span className="text-[#202923] font-mono select-all">
                        {cf.type === 'hidden' ? '••••••••' : cf.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="pt-2 text-[11px] text-[#78827B] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Created on{' '}
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E5E9E5] bg-[#F7F8F5] flex items-center justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78827B] hover:text-[#202923] hover:bg-white border border-transparent hover:border-[#E5E9E5] transition-all"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl shadow-subtle transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Credential</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
