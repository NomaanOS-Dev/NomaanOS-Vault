import React, { useState, useEffect } from 'react';
import { VaultItemSummary, AnyVaultPayload } from '@pwm/shared';
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
  Globe,
  CreditCard,
  UserSquare2,
  FileText,
  Terminal,
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
  const [payload, setPayload] = useState<AnyVaultPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      decryptItem<AnyVaultPayload>(item.encryptedPayload)
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
      setShowCvv(false);
      setShowPrivateKey(false);
      setShowPassphrase(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const copyToClipboard = (text?: string, fieldName?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName || 'text');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const itemType = item.itemType || 'LOGIN';

  const CategoryIcon = () => {
    if (itemType === 'CARD') return <CreditCard className="w-5 h-5" />;
    if (itemType === 'IDENTITY') return <UserSquare2 className="w-5 h-5" />;
    if (itemType === 'SECURE_NOTE') return <FileText className="w-5 h-5" />;
    if (itemType === 'SSH_KEY') return <Terminal className="w-5 h-5" />;
    return <Globe className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-[#E5E9E5] rounded-3xl shadow-modal flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E9E5] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E7F4EF] border border-[#B7E3D6] text-[#168568] rounded-2xl flex items-center justify-center shadow-subtle">
              <CategoryIcon />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202923] tracking-tight">{item.itemName}</h2>
              <span className="text-[11px] text-[#168568] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Zero-Knowledge Decrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleFavorite}
              title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="p-2 rounded-xl text-[#78827B] hover:text-amber-500 hover:bg-[#F3F5F2] transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#78827B]'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onEdit}
              title="Edit item"
              className="p-2 rounded-xl text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete item"
              className="p-2 rounded-xl text-[#78827B] hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#78827B] space-y-2">
              <div className="inline-block animate-spin text-[#168568]">⚙️</div>
              <p>Decrypting sensitive payload in memory...</p>
            </div>
          ) : (
            <>
              {/* ================= 1. LOGIN TYPE ================= */}
              {itemType === 'LOGIN' && (
                <>
                  {payload?.username && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Username / Email
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold text-[#202923] break-all select-all">
                          {payload.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payload.username, 'username')}
                          className="ml-2 p-1.5 text-[#78827B] hover:text-[#168568] hover:bg-white rounded-lg transition-colors"
                          title="Copy username"
                        >
                          {copiedField === 'username' ? (
                            <Check className="w-4 h-4 text-[#168568]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {payload?.password && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Password
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-mono font-semibold text-[#202923] break-all select-all">
                          {showPassword ? payload.password : '••••••••••••••••'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1.5 text-[#78827B] hover:text-[#202923] hover:bg-white rounded-lg transition-colors"
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payload.password, 'password')}
                            className="p-1.5 text-[#78827B] hover:text-[#168568] hover:bg-white rounded-lg transition-colors"
                            title="Copy password"
                          >
                            {copiedField === 'password' ? (
                              <Check className="w-4 h-4 text-[#168568]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {payload?.uris && payload.uris.length > 0 && payload.uris[0] && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Website URI
                      </div>
                      <div className="flex items-center justify-between">
                        <a
                          href={payload.uris[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm text-[#168568] hover:underline flex items-center gap-1.5 break-all"
                        >
                          <span>{payload.uris[0]}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payload.uris![0], 'uri')}
                          className="ml-2 p-1.5 text-[#78827B] hover:text-[#168568] hover:bg-white rounded-lg transition-colors"
                        >
                          {copiedField === 'uri' ? (
                            <Check className="w-4 h-4 text-[#168568]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= 2. CARD TYPE ================= */}
              {itemType === 'CARD' && (
                <>
                  <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider">
                        Card Number ({payload?.brand || 'Card'})
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(payload?.cardNumber, 'card')}
                        className="p-1 text-[#78827B] hover:text-[#168568] hover:bg-white rounded-md"
                        title="Copy card number"
                      >
                        {copiedField === 'card' ? <Check className="w-3.5 h-3.5 text-[#168568]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="font-mono text-sm sm:text-base font-bold text-[#202923] tracking-wider select-all">
                      {payload?.cardNumber || '•••• •••• •••• ••••'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Cardholder
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-[#202923] select-all">
                        {payload?.cardholderName || '—'}
                      </div>
                    </div>

                    <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Expires
                      </div>
                      <div className="font-mono text-xs sm:text-sm font-bold text-[#202923]">
                        {payload?.expMonth && payload?.expYear
                          ? `${payload.expMonth} / ${payload.expYear}`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {payload?.cvv && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Security Code (CVV)
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-[#202923]">
                          {showCvv ? payload.cvv : '•••'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowCvv(!showCvv)}
                            className="p-1.5 text-[#78827B] hover:text-[#202923] hover:bg-white rounded-lg"
                          >
                            {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payload.cvv, 'cvv')}
                            className="p-1.5 text-[#78827B] hover:text-[#168568] hover:bg-white rounded-lg"
                          >
                            {copiedField === 'cvv' ? <Check className="w-4 h-4 text-[#168568]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {payload?.billingAddress && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Billing Address
                      </div>
                      <div className="text-xs text-[#202923] select-all">
                        {payload.billingAddress}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ================= 3. IDENTITY TYPE ================= */}
              {itemType === 'IDENTITY' && (
                <>
                  {payload?.fullName && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Full Legal Name
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-[#202923] select-all">
                          {payload.fullName}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payload.fullName, 'fullname')}
                          className="p-1.5 text-[#78827B] hover:text-[#168568]"
                        >
                          {copiedField === 'fullname' ? <Check className="w-4 h-4 text-[#168568]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {payload?.email && (
                      <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                        <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                          Email
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#202923] truncate select-all">{payload.email}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payload.email, 'email')}
                            className="p-1 text-[#78827B] hover:text-[#168568]"
                          >
                            {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-[#168568]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {payload?.phone && (
                      <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                        <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                          Phone
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#202923] truncate select-all">{payload.phone}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payload.phone, 'phone')}
                            className="p-1 text-[#78827B] hover:text-[#168568]"
                          >
                            {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-[#168568]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {payload?.address && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Address
                      </div>
                      <div className="text-xs text-[#202923] select-all">
                        {payload.address}
                        {payload.postalCode ? `, ${payload.postalCode}` : ''}
                        {payload.country ? `, ${payload.country}` : ''}
                      </div>
                    </div>
                  )}

                  {payload?.company && (
                    <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Company / Org
                      </div>
                      <div className="text-xs font-semibold text-[#202923] select-all">{payload.company}</div>
                    </div>
                  )}
                </>
              )}

              {/* ================= 4. SECURE NOTE TYPE ================= */}
              {itemType === 'SECURE_NOTE' && (
                <div className="bg-[#F7F8F5] p-4 rounded-2xl border border-[#E5E9E5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider">
                      Note Content
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(payload?.content, 'note')}
                      className="px-2.5 py-1 bg-white hover:bg-[#E7F4EF] hover:text-[#168568] border border-[#E5E9E5] text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      {copiedField === 'note' ? <Check className="w-3.5 h-3.5 text-[#168568]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'note' ? 'Copied' : 'Copy Note'}</span>
                    </button>
                  </div>
                  <div className="text-xs font-mono text-[#202923] whitespace-pre-wrap leading-relaxed select-all max-h-72 overflow-y-auto">
                    {payload?.content || '(Empty Note)'}
                  </div>
                </div>
              )}

              {/* ================= 5. SSH KEY TYPE ================= */}
              {itemType === 'SSH_KEY' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {payload?.host && (
                      <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                        <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                          Host / Server
                        </div>
                        <div className="font-mono text-xs font-semibold text-[#202923] select-all truncate">{payload.host}</div>
                      </div>
                    )}
                    {payload?.username && (
                      <div className="bg-[#F7F8F5] p-3 rounded-2xl border border-[#E5E9E5]">
                        <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                          SSH User
                        </div>
                        <div className="font-mono text-xs font-semibold text-[#202923] select-all truncate">{payload.username}</div>
                      </div>
                    )}
                  </div>

                  {payload?.privateKey && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider">
                          Private Key
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="px-2 py-0.5 bg-white text-[11px] font-semibold rounded-md border border-[#E5E9E5] hover:bg-[#F3F5F2]"
                          >
                            {showPrivateKey ? 'Hide' : 'Reveal'}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payload.privateKey, 'privkey')}
                            className="px-2 py-0.5 bg-white text-[11px] font-semibold rounded-md border border-[#E5E9E5] hover:bg-[#F3F5F2] flex items-center gap-1"
                          >
                            {copiedField === 'privkey' ? <Check className="w-3 h-3 text-[#168568]" /> : <Copy className="w-3 h-3" />}
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                      <div className={`font-mono text-[11px] text-[#202923] whitespace-pre-wrap select-all max-h-36 overflow-y-auto ${
                        !showPrivateKey ? 'filter blur-xs select-none' : ''
                      }`}>
                        {payload.privateKey}
                      </div>
                    </div>
                  )}

                  {payload?.publicKey && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider">
                          Public Key
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(payload.publicKey, 'pubkey')}
                          className="px-2 py-0.5 bg-white text-[11px] font-semibold rounded-md border border-[#E5E9E5] hover:bg-[#F3F5F2] flex items-center gap-1"
                        >
                          {copiedField === 'pubkey' ? <Check className="w-3 h-3 text-[#168568]" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-[#202923] break-all select-all max-h-20 overflow-y-auto">
                        {payload.publicKey}
                      </div>
                    </div>
                  )}

                  {payload?.passphrase && (
                    <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                      <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                        Key Passphrase
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-[#202923] select-all">
                          {showPassphrase ? payload.passphrase : '••••••••••••'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowPassphrase(!showPassphrase)}
                            className="p-1 text-[#78827B] hover:text-[#202923]"
                          >
                            {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payload.passphrase, 'passphrase')}
                            className="p-1 text-[#78827B] hover:text-[#168568]"
                          >
                            {copiedField === 'passphrase' ? <Check className="w-3.5 h-3.5 text-[#168568]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              {payload?.notes && (
                <div className="bg-[#F7F8F5] p-3.5 rounded-2xl border border-[#E5E9E5]">
                  <div className="text-[11px] font-semibold text-[#78827B] uppercase tracking-wider mb-1">
                    Encrypted Notes
                  </div>
                  <div className="text-xs text-[#202923] whitespace-pre-wrap leading-relaxed select-all">
                    {payload.notes}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {payload?.customFields && payload.customFields.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E5E9E5]">
                  <div className="text-[11px] font-bold text-[#78827B] uppercase tracking-wider">
                    Custom Fields
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {payload.customFields.map((field) => (
                      <div key={field.id} className="bg-[#F7F8F5] p-2.5 rounded-xl border border-[#E5E9E5]">
                        <div className="text-[10px] font-semibold text-[#78827B] uppercase">{field.name}</div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs font-semibold text-[#202923] truncate select-all">{field.value}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(field.value, field.id)}
                            className="p-1 text-[#78827B] hover:text-[#168568]"
                          >
                            {copiedField === field.id ? <Check className="w-3 h-3 text-[#168568]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="pt-3 border-t border-[#E5E9E5] text-[11px] text-[#78827B] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Modified {new Date(item.updatedAt).toLocaleDateString()}</span>
                </span>
                {item.folderName && (
                  <span className="px-2 py-0.5 rounded-md bg-[#F7F8F5] border border-[#E5E9E5] text-[#202923] font-medium">
                    Folder: {item.folderName}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
