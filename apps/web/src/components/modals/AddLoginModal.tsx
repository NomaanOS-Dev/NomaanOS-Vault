import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { FolderSummary, VaultItemSummary, LoginPayload, CustomField } from '@pwm/shared';
import { generatePassword, DEFAULT_GENERATOR_OPTIONS } from '../../lib/generator';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import {
  X,
  Star,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
  AlertTriangle,
  KeyRound,
  Globe,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface AddLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  folders: FolderSummary[];
  itemToEdit?: VaultItemSummary | null;
}

export const AddLoginModal: React.FC<AddLoginModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  folders,
  itemToEdit,
}) => {
  const { user } = useAuth();
  const { encryptItem, decryptItem } = useVault();

  // Form states
  const [itemName, setItemName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState('');

  // Autofill
  const [uris, setUris] = useState<string[]>(['']);

  // Additional options
  const [notes, setNotes] = useState('');
  const [rePrompt, setRePrompt] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showTotp, setShowTotp] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      setItemName(itemToEdit.itemName);
      setFolderId(itemToEdit.folderId || '');
      setIsFavorite(itemToEdit.isFavorite);

      // Decrypt payload in browser
      setDecrypting(true);
      decryptItem<LoginPayload>(itemToEdit.encryptedPayload)
        .then((payload) => {
          setUsername(payload.username || '');
          setPassword(payload.password || '');
          setTotpSecret(payload.totpSecret || '');
          setUris(payload.uris && payload.uris.length > 0 ? payload.uris : ['']);
          setNotes(payload.notes || '');
          setRePrompt(Boolean(payload.rePrompt));
          setCustomFields(payload.customFields || []);
        })
        .catch((err) => {
          console.error('Decryption error:', err);
          setError('Failed to decrypt vault item. Your vault key may be mismatched.');
        })
        .finally(() => {
          setDecrypting(false);
        });
    } else {
      // New item defaults
      setItemName('');
      setFolderId('');
      setIsFavorite(false);
      setUsername('');
      setPassword('');
      setTotpSecret('');
      setUris(['']);
      setNotes('');
      setRePrompt(false);
      setCustomFields([]);
      setError(null);
    }
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleQuickGenerate = () => {
    const newPwd = generatePassword(DEFAULT_GENERATOR_OPTIONS);
    setPassword(newPwd);
  };

  const handleAddUri = () => {
    setUris([...uris, '']);
  };

  const handleUriChange = (index: number, val: string) => {
    const updated = [...uris];
    updated[index] = val;
    setUris(updated);
  };

  const handleRemoveUri = (index: number) => {
    if (uris.length === 1) {
      setUris(['']);
    } else {
      setUris(uris.filter((_, i) => i !== index));
    }
  };

  const handleAddCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        value: '',
        type: 'text',
      },
    ]);
  };

  const handleUpdateCustomField = (index: number, updates: Partial<CustomField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Pack sensitive payload
      const payload: LoginPayload = {
        username: username.trim(),
        password,
        totpSecret: totpSecret.trim(),
        uris: uris.filter((u) => u.trim() !== ''),
        notes,
        rePrompt,
        customFields,
      };

      // 2. Encrypt locally in browser with AES-256-GCM
      const encryptedPayload = await encryptItem(payload);

      // 3. Send to backend
      const { api } = await import('../../services/api');
      if (itemToEdit) {
        await api.updateItem(itemToEdit.id, {
          itemName: itemName.trim(),
          itemType: 'LOGIN',
          encryptedPayload,
          folderId: folderId || null,
          isFavorite,
        });
      } else {
        await api.createItem({
          itemName: itemName.trim(),
          itemType: 'LOGIN',
          encryptedPayload,
          folderId: folderId || null,
          isFavorite,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-2xl bg-white sm:border border-[#E5E9E5] sm:rounded-2xl shadow-modal flex flex-col h-full sm:h-auto sm:max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E5E9E5] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202923] tracking-tight">
                {itemToEdit ? 'Edit Credentials' : 'Add Login Credentials'}
              </h2>
              <span className="text-[10px] text-[#168568] font-semibold uppercase tracking-wider block">
                Zero-Knowledge Encrypted
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="p-2 rounded-xl hover:bg-[#F3F5F2] text-[#78827B] hover:text-amber-500 transition-colors"
            >
              <Star
                className={`w-5 h-5 ${
                  isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#78827B]'
                }`}
              />
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

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {decrypting ? (
            <div className="p-12 text-center text-xs text-[#78827B]">
              <span className="w-5 h-5 border-2 border-[#168568]/30 border-t-[#168568] rounded-full inline-block animate-spin mr-2 align-middle" />
              Decrypting login details in browser memory...
            </div>
          ) : (
            <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Section A: Item Details */}
              <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Item Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Google, GitHub, Netflix, Work Portal"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Vault Owner
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-[#EAECE8] border border-[#E5E9E5] rounded-xl px-3.5 py-2.5 text-xs text-[#78827B] cursor-not-allowed outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Folder
                    </label>
                    <select
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none transition-all"
                    >
                      <option value="">No folder</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section B: Login Credentials */}
              <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Login Credentials</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Username / Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username or email address"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 pr-10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(username, 'username')}
                      title="Copy username"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#168568] p-1"
                    >
                      {copiedField === 'username' ? (
                        <Check className="w-4 h-4 text-[#168568]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter or generate password"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] font-mono placeholder-[#78827B]/60 pr-24 outline-none transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#78827B]">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        className="p-1 hover:text-[#202923]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickGenerate}
                        title="Quick generate random password"
                        className="p-1 hover:text-[#168568] transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(password, 'password')}
                        title="Copy password"
                        className="p-1 hover:text-[#168568]"
                      >
                        {copiedField === 'password' ? (
                          <Check className="w-4 h-4 text-[#168568]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-[#78827B]">
                      Need custom parameters?{' '}
                      <button
                        type="button"
                        onClick={() => setIsGeneratorOpen(true)}
                        className="text-[#168568] font-semibold hover:underline inline-flex items-center gap-0.5"
                      >
                        Open Password Generator
                      </button>
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <label className="text-xs font-semibold text-[#202923]">
                      Authenticator Key (TOTP)
                    </label>
                    <span title="Base32 TOTP secret key for two-step verification codes">
                      <HelpCircle className="w-3.5 h-3.5 text-[#78827B] cursor-help" />
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showTotp ? 'text' : 'password'}
                      value={totpSecret}
                      onChange={(e) => setTotpSecret(e.target.value)}
                      placeholder="e.g. JBSWY3DPEHPK3PXP"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs text-[#202923] font-mono placeholder-[#78827B]/60 pr-10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTotp(!showTotp)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                    >
                      {showTotp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section C: Website Addresses (Autofill URIs) */}
              <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website Addresses (URIs)</span>
                </h3>

                <div className="space-y-2.5">
                  {uris.map((uri, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={uri}
                          onChange={(e) => handleUriChange(index, e.target.value)}
                          placeholder="https://example.com"
                          className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 outline-none transition-all"
                        />
                      </div>
                      {uris.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUri(index)}
                          className="p-2 text-[#78827B] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove URI"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddUri}
                    className="text-xs text-[#168568] hover:text-[#126e56] font-semibold flex items-center gap-1.5 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Website URI</span>
                  </button>
                </div>
              </div>

              {/* Section D: Notes & Custom Fields */}
              <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 sm:p-5 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notes & Additional Fields</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Encrypted Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Secure recovery codes, PINs, or confidential notes..."
                    className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 outline-none transition-all resize-none"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={rePrompt}
                    onChange={(e) => setRePrompt(e.target.checked)}
                    className="w-4 h-4 rounded text-[#168568] border-[#E5E9E5] focus:ring-[#168568]"
                  />
                  <span className="text-xs font-medium text-[#202923]">
                    Require master password re-prompt to view password
                  </span>
                </label>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-[#E5E9E5]">
                    <span className="text-xs text-[#202923] font-semibold block">Custom Fields</span>
                    {customFields.map((field, idx) => (
                      <div key={field.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleUpdateCustomField(idx, { name: e.target.value })}
                          placeholder="Field name"
                          className="w-full sm:w-1/3 bg-white border border-[#E5E9E5] focus:border-[#168568] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                        />
                        <input
                          type={field.type === 'hidden' ? 'password' : 'text'}
                          value={field.value}
                          onChange={(e) => handleUpdateCustomField(idx, { value: e.target.value })}
                          placeholder="Field value"
                          className="flex-1 bg-white border border-[#E5E9E5] focus:border-[#168568] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <select
                            value={field.type}
                            onChange={(e) =>
                              handleUpdateCustomField(idx, {
                                type: e.target.value as 'text' | 'hidden' | 'boolean',
                              })
                            }
                            className="bg-white border border-[#E5E9E5] rounded-xl px-2.5 py-2 text-xs text-[#202923] outline-none"
                          >
                            <option value="text">Text</option>
                            <option value="hidden">Hidden</option>
                            <option value="boolean">Boolean</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomField(idx)}
                            className="p-2 text-[#78827B] hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="text-xs text-[#168568] hover:text-[#126e56] font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Field</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-[#E5E9E5] bg-[#F7F8F5] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#78827B] hover:text-[#202923] hover:bg-white border border-transparent hover:border-[#E5E9E5] transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="login-form"
            disabled={loading || decrypting}
            className="px-6 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white font-semibold rounded-xl text-xs sm:text-sm shadow-subtle transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Encrypting & Saving...</span>
              </>
            ) : (
              <span>Save Credential</span>
            )}
          </button>
        </div>
      </div>

      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSelectPassword={(newPwd) => setPassword(newPwd)}
      />
    </div>
  );
};
