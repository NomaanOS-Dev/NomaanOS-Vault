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
  Settings,
  AlertTriangle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#131d31] border border-[#1f2e4d] rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2e4d] bg-[#131d31] shrink-0">
          <h2 className="text-lg font-bold text-slate-100">
            {itemToEdit ? 'Edit login' : 'Add login'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="text-slate-400 hover:text-amber-400 transition-colors p-1"
            >
              <Star
                className={`w-5 h-5 ${
                  isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {decrypting ? (
            <div className="p-10 text-center text-xs text-slate-400">
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Decrypting login details in browser memory...
            </div>
          ) : (
            <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Section A: Item details */}
              <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Item details
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Item name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Google, GitHub, Netflix"
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Owner</label>
                  <select
                    disabled
                    value={user?.email}
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-300 cursor-not-allowed opacity-90 focus:outline-none"
                  >
                    <option value={user?.email}>{user?.email}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Folder</label>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">-- Select --</option>
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section B: Login credentials */}
              <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Login credentials
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username or email address"
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(username, 'username')}
                      title="Copy username"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {copiedField === 'username' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-20 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickGenerate}
                        title="Generate strong password"
                        className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(password, 'password')}
                        title="Copy password"
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        {copiedField === 'password' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-slate-400">
                      Use the generator{' '}
                      <button
                        type="button"
                        onClick={() => setIsGeneratorOpen(true)}
                        className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        <RefreshCw className="w-3 h-3 inline" /> options
                      </button>{' '}
                      to create a strong unique password
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <label className="text-xs font-medium text-slate-300">Authenticator key</label>
                    <span title="TOTP secret key for 2FA verification">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showTotp ? 'text' : 'password'}
                      value={totpSecret}
                      onChange={(e) => setTotpSecret(e.target.value)}
                      placeholder="Base32 TOTP secret"
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTotp(!showTotp)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showTotp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section C: Autofill options */}
              <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Autofill options
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
                          className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 pr-9 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                          <Settings className="w-4 h-4" />
                        </div>
                      </div>
                      {uris.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUri(index)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddUri}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add website</span>
                  </button>
                </div>
              </div>

              {/* Section D: Additional options */}
              <div className="bg-[#162036] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Additional options
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Encrypted notes or recovery codes..."
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rePrompt}
                    onChange={(e) => setRePrompt(e.target.checked)}
                    className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">Master password re-prompt</span>
                </label>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-[#1f2e4d]">
                    <span className="text-xs text-slate-400 font-medium">Custom Fields</span>
                    {customFields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleUpdateCustomField(idx, { name: e.target.value })}
                          placeholder="Field name"
                          className="w-1/3 bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type={field.type === 'hidden' ? 'password' : 'text'}
                          value={field.value}
                          onChange={(e) => handleUpdateCustomField(idx, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateCustomField(idx, {
                              type: e.target.value as 'text' | 'hidden' | 'boolean',
                            })
                          }
                          className="bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-2 py-2 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="text">Text</option>
                          <option value="hidden">Hidden</option>
                          <option value="boolean">Boolean</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add field</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-start gap-3 px-6 py-4 border-t border-[#1f2e4d] bg-[#131d31] shrink-0">
          <button
            type="submit"
            form="login-form"
            disabled={loading || decrypting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? 'Encrypting & Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#162036] hover:bg-[#1e2d4d] text-slate-300 font-medium rounded-lg text-sm transition-colors border border-[#1f2e4d]"
          >
            Cancel
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
