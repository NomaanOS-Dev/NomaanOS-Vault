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
  Globe,
  Calendar,
  ExternalLink,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#131d31] border border-[#1f2e4d] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2e4d] bg-[#131d31]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">{item.itemName}</h2>
              <span className="text-[11px] text-slate-400">Login Credential</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              title={item.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
              className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-amber-400"
            >
              <Star
                className={`w-4 h-4 ${
                  item.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                }`}
              />
            </button>
            <button
              onClick={onEdit}
              title="Edit Item"
              className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-white"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Decrypting login details in browser memory...
            </div>
          ) : (
            <>
              {/* Credentials Card */}
              <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-4 space-y-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                    Username
                  </label>
                  <div className="flex items-center justify-between bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2">
                    <span className="text-sm font-mono text-slate-200">
                      {payload?.username || '—'}
                    </span>
                    {payload?.username && (
                      <button
                        onClick={() => copyToClipboard(payload.username, 'user')}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        {copiedField === 'user' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                    Password
                  </label>
                  <div className="flex items-center justify-between bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2">
                    <span className="text-sm font-mono text-slate-200">
                      {showPassword
                        ? payload?.password || '—'
                        : payload?.password
                        ? '••••••••••••••••'
                        : '—'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {payload?.password && (
                        <>
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(payload.password, 'pwd')}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {copiedField === 'pwd' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {payload?.totpSecret && (
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                      Authenticator Key (TOTP)
                    </label>
                    <div className="flex items-center justify-between bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2">
                      <span className="text-sm font-mono text-slate-200">{payload.totpSecret}</span>
                      <button
                        onClick={() => copyToClipboard(payload.totpSecret, 'totp')}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        {copiedField === 'totp' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Websites */}
              {payload?.uris && payload.uris.length > 0 && payload.uris.some((u) => u.trim()) && (
                <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-4">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                    Websites
                  </label>
                  <div className="space-y-2">
                    {payload.uris
                      .filter((u) => u.trim())
                      .map((uri, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs"
                        >
                          <a
                            href={uri.startsWith('http') ? uri : `https://${uri}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline flex items-center gap-1.5 truncate max-w-[340px]"
                          >
                            <span>{uri}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                          <button
                            onClick={() => copyToClipboard(uri, `uri-${idx}`)}
                            className="p-1 text-slate-400 hover:text-white shrink-0"
                          >
                            {copiedField === `uri-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {payload?.notes && (
                <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-4">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                    Notes
                  </label>
                  <div className="bg-[#0e1628] border border-[#1f2e4d] rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap font-mono">
                    {payload.notes}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {payload?.customFields && payload.customFields.length > 0 && (
                <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-4 space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                    Custom Fields
                  </label>
                  {payload.customFields.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="text-slate-400">{f.name}:</span>
                      <span className="font-mono text-slate-200">
                        {f.type === 'hidden' ? '••••••••' : f.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="text-[11px] text-slate-500 space-y-1 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Updated: {new Date(item.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f2e4d] bg-[#131d31]">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-xs transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Item</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#162036] hover:bg-[#1e2d4d] text-slate-300 rounded-lg text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
