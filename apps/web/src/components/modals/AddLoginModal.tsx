import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { api } from '../../services/api';
import {
  FolderSummary,
  VaultItemSummary,
  ItemType,
  AnyVaultPayload,
  CustomField,
} from '@pwm/shared';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import {
  X,
  Star,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  KeyRound,
  Globe,
  CreditCard,
  UserSquare2,
  FileText,
  Terminal,
} from 'lucide-react';

interface AddLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  folders: FolderSummary[];
  itemToEdit?: VaultItemSummary | null;
  initialType?: ItemType;
}

export const AddLoginModal: React.FC<AddLoginModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  folders,
  itemToEdit,
  initialType = 'LOGIN',
}) => {
  const { encryptItem, decryptItem } = useVault();

  // Category Selection
  const [itemType, setItemType] = useState<ItemType>(initialType);

  // Common Header State
  const [itemName, setItemName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // 1. LOGIN Category Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [uris, setUris] = useState<string[]>(['']);

  // 2. CARD Category Fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [brand, setBrand] = useState('Visa');
  const [billingAddress, setBillingAddress] = useState('');

  // 3. IDENTITY Category Fields
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [idEmail, setIdEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [company, setCompany] = useState('');

  // 4. SECURE NOTE Category Fields
  const [content, setContent] = useState('');

  // 5. SSH KEY Category Fields
  const [sshHost, setSshHost] = useState('');
  const [sshUser, setSshUser] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [sshPassphrase, setSshPassphrase] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      setItemName(itemToEdit.itemName);
      setItemType(itemToEdit.itemType || 'LOGIN');
      setFolderId(itemToEdit.folderId || '');
      setIsFavorite(itemToEdit.isFavorite);

      setDecrypting(true);
      decryptItem<AnyVaultPayload>(itemToEdit.encryptedPayload)
        .then((payload) => {
          setNotes(payload.notes || '');
          setCustomFields(payload.customFields || []);

          // Populate Category Specifics
          setUsername(payload.username || '');
          setPassword(payload.password || '');
          setTotpSecret(payload.totpSecret || '');
          setUris(payload.uris && payload.uris.length > 0 ? payload.uris : ['']);

          setCardholderName(payload.cardholderName || '');
          setCardNumber(payload.cardNumber || '');
          setExpMonth(payload.expMonth || '');
          setExpYear(payload.expYear || '');
          setCvv(payload.cvv || '');
          setBrand(payload.brand || 'Visa');
          setBillingAddress(payload.billingAddress || '');

          setFullName(payload.fullName || '');
          setDob(payload.dob || '');
          setIdEmail(payload.email || '');
          setPhone(payload.phone || '');
          setAddress(payload.address || '');
          setCountry(payload.country || '');
          setPostalCode(payload.postalCode || '');
          setCompany(payload.company || '');

          setContent(payload.content || '');

          setSshHost(payload.host || '');
          setSshUser(payload.username || '');
          setPrivateKey(payload.privateKey || '');
          setPublicKey(payload.publicKey || '');
          setSshPassphrase(payload.passphrase || '');
        })
        .catch((err) => {
          console.error('Decryption error:', err);
          setError('Failed to decrypt vault item.');
        })
        .finally(() => {
          setDecrypting(false);
        });
    } else {
      // New item defaults
      setItemType(initialType || 'LOGIN');
      setItemName('');
      setFolderId('');
      setIsFavorite(false);
      setNotes('');
      setCustomFields([]);

      setUsername('');
      setPassword('');
      setTotpSecret('');
      setUris(['']);

      setCardholderName('');
      setCardNumber('');
      setExpMonth('');
      setExpYear('');
      setCvv('');
      setBrand('Visa');
      setBillingAddress('');

      setFullName('');
      setDob('');
      setIdEmail('');
      setPhone('');
      setAddress('');
      setCountry('');
      setPostalCode('');
      setCompany('');

      setContent('');

      setSshHost('');
      setSshUser('');
      setPrivateKey('');
      setPublicKey('');
      setSshPassphrase('');
      setError(null);
    }
  }, [isOpen, itemToEdit, initialType]);

  if (!isOpen) return null;

  // Custom fields handlers
  const addCustomField = (type: 'text' | 'hidden' | 'boolean') => {
    setCustomFields([
      ...customFields,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        value: type === 'boolean' ? 'false' : '',
        type,
      },
    ]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let payload: AnyVaultPayload = {};

      if (itemType === 'LOGIN') {
        payload = {
          username: username.trim(),
          password,
          totpSecret: totpSecret.trim(),
          uris: uris.filter((u) => u.trim().length > 0),
          notes,
          customFields,
        };
      } else if (itemType === 'CARD') {
        payload = {
          cardholderName: cardholderName.trim(),
          cardNumber: cardNumber.trim(),
          expMonth: expMonth.trim(),
          expYear: expYear.trim(),
          cvv: cvv.trim(),
          brand,
          billingAddress: billingAddress.trim(),
          notes,
          customFields,
        };
      } else if (itemType === 'IDENTITY') {
        payload = {
          fullName: fullName.trim(),
          dob: dob.trim(),
          email: idEmail.trim(),
          phone: phone.trim(),
          address: address.trim(),
          country: country.trim(),
          postalCode: postalCode.trim(),
          company: company.trim(),
          notes,
          customFields,
        };
      } else if (itemType === 'SECURE_NOTE') {
        payload = {
          content,
          notes,
          customFields,
        };
      } else if (itemType === 'SSH_KEY') {
        payload = {
          host: sshHost.trim(),
          username: sshUser.trim(),
          privateKey,
          publicKey,
          passphrase: sshPassphrase,
          notes,
          customFields,
        };
      }

      // Zero-Knowledge Client-Side AES-256-GCM Encryption
      const encryptedPayload = await encryptItem(payload);

      const itemData = {
        itemName: itemName.trim(),
        itemType,
        folderId: folderId ? folderId : null,
        isFavorite,
        encryptedPayload,
      };

      if (itemToEdit) {
        await api.updateItem(itemToEdit.id, itemData);
      } else {
        await api.createItem(itemData);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Save item error:', err);
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/40 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white border border-[#E5E9E5] rounded-3xl shadow-modal overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#E5E9E5] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
                {itemType === 'LOGIN' && <Globe className="w-4 h-4" />}
                {itemType === 'CARD' && <CreditCard className="w-4 h-4" />}
                {itemType === 'IDENTITY' && <UserSquare2 className="w-4 h-4" />}
                {itemType === 'SECURE_NOTE' && <FileText className="w-4 h-4" />}
                {itemType === 'SSH_KEY' && <Terminal className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-[#202923]">
                  {itemToEdit ? `Edit ${itemType.replace('_', ' ')}` : 'Create New Vault Item'}
                </h2>
                <p className="text-[11px] text-[#78827B]">
                  Encrypted with client-side AES-256-GCM before saving
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-xl transition-colors ${
                  isFavorite
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2]'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Tabs (if creating new item) */}
          {!itemToEdit && (
            <div className="px-6 py-3 bg-[#F7F8F5] border-b border-[#E5E9E5] flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { type: 'LOGIN' as ItemType, label: 'Login', icon: Globe },
                { type: 'CARD' as ItemType, label: 'Card', icon: CreditCard },
                { type: 'IDENTITY' as ItemType, label: 'Identity', icon: UserSquare2 },
                { type: 'SECURE_NOTE' as ItemType, label: 'Secure Note', icon: FileText },
                { type: 'SSH_KEY' as ItemType, label: 'SSH Key', icon: Terminal },
              ].map((cat) => {
                const Icon = cat.icon;
                const active = itemType === cat.type;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setItemType(cat.type)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-white text-[#168568] border border-[#B7E3D6] shadow-2xs'
                        : 'text-[#78827B] hover:text-[#202923] hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {decrypting ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-[#78827B] gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#168568]" />
                <span>Decrypting item with in-memory vault key...</span>
              </div>
            ) : (
              <>
                {/* 1. Common Info: Name & Folder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Item Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={
                        itemType === 'LOGIN'
                          ? 'e.g. GitHub, Google, Amazon'
                          : itemType === 'CARD'
                          ? 'e.g. Chase Sapphire, Corporate Visa'
                          : itemType === 'IDENTITY'
                          ? 'e.g. Personal Profile, Passport'
                          : itemType === 'SECURE_NOTE'
                          ? 'e.g. Server recovery steps'
                          : 'e.g. Production Bastion Key'
                      }
                      className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Folder
                    </label>
                    <select
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                    >
                      <option value="">(No Folder)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ================= CATEGORY 1: LOGIN ================= */}
                {itemType === 'LOGIN' && (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={uris[0] || ''}
                        onChange={(e) => setUris([e.target.value])}
                        placeholder="https://example.com"
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Username / Email
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="username@domain.com"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#202923]">Password</label>
                          <button
                            type="button"
                            onClick={() => setIsGeneratorOpen(true)}
                            className="text-[11px] text-[#168568] font-bold hover:underline flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Generate</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#202923] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Authenticator Secret (TOTP)
                      </label>
                      <input
                        type="text"
                        value={totpSecret}
                        onChange={(e) => setTotpSecret(e.target.value)}
                        placeholder="JBSWY3DPEHPK3PXP"
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 font-mono text-xs sm:text-sm text-[#202923] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* ================= CATEGORY 2: CARD ================= */}
                {itemType === 'CARD' && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Card Brand
                        </label>
                        <select
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        >
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="American Express">American Express</option>
                          <option value="Discover">Discover</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 font-mono text-xs sm:text-sm text-[#202923] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Exp Month
                        </label>
                        <input
                          type="text"
                          maxLength={2}
                          value={expMonth}
                          onChange={(e) => setExpMonth(e.target.value)}
                          placeholder="MM (01-12)"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Exp Year
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={expYear}
                          onChange={(e) => setExpYear(e.target.value)}
                          placeholder="YYYY"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          CVV / CVC
                        </label>
                        <div className="relative">
                          <input
                            type={showCvv ? 'text' : 'password'}
                            maxLength={4}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="•••"
                            className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-[#202923] outline-none text-center font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCvv(!showCvv)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                          >
                            {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Billing Address
                      </label>
                      <input
                        type="text"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Street, City, State, Country"
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* ================= CATEGORY 3: IDENTITY ================= */}
                {itemType === 'IDENTITY' && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Michael Doe"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Date of Birth
                        </label>
                        <input
                          type="text"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={idEmail}
                          onChange={(e) => setIdEmail(e.target.value)}
                          placeholder="identity@domain.com"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Financial Way, Suite 400"
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Country
                        </label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="United States"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Postal / ZIP Code
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="94107"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Company / Org
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Acme Corp"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= CATEGORY 4: SECURE NOTE ================= */}
                {itemType === 'SECURE_NOTE' && (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Encrypted Note Content
                      </label>
                      <textarea
                        rows={7}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your private recovery seed, software license, or confidential notes here..."
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl p-3.5 text-xs sm:text-sm text-[#202923] outline-none font-mono leading-relaxed resize-y"
                      />
                    </div>
                  </div>
                )}

                {/* ================= CATEGORY 5: SSH KEY ================= */}
                {itemType === 'SSH_KEY' && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          Host / Server
                        </label>
                        <input
                          type="text"
                          value={sshHost}
                          onChange={(e) => setSshHost(e.target.value)}
                          placeholder="192.168.1.1 or server.internal"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                          SSH Username
                        </label>
                        <input
                          type="text"
                          value={sshUser}
                          onChange={(e) => setSshUser(e.target.value)}
                          placeholder="ubuntu, root, or admin"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#202923]">Private Key</label>
                        <button
                          type="button"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="text-[11px] text-[#168568] font-bold hover:underline flex items-center gap-1"
                        >
                          {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showPrivateKey ? 'Hide' : 'Reveal'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                        className={`w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl p-3.5 text-xs font-mono outline-none resize-y ${
                          !showPrivateKey ? 'filter blur-xs select-none' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Public Key (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={publicKey}
                        onChange={(e) => setPublicKey(e.target.value)}
                        placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
                        className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl p-3.5 text-xs font-mono outline-none resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Key Passphrase (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type={showPassphrase ? 'text' : 'password'}
                          value={sshPassphrase}
                          onChange={(e) => setSshPassphrase(e.target.value)}
                          placeholder="Passphrase protecting private key"
                          className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-[#202923] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
                        >
                          {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Additional Notes */}
                <div className="pt-2 border-t border-[#E5E9E5]">
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Encrypted Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Private notes (encrypted with your vault key)"
                    className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl p-3 text-xs sm:text-sm text-[#202923] outline-none resize-y"
                  />
                </div>

                {/* Custom Fields Section */}
                <div className="pt-2 border-t border-[#E5E9E5]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#202923] uppercase tracking-wider">
                      Custom Fields
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => addCustomField('text')}
                        className="px-2.5 py-1 bg-[#F7F8F5] hover:bg-[#E7F4EF] hover:text-[#168568] border border-[#E5E9E5] text-[11px] font-semibold text-[#202923] rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Text</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addCustomField('hidden')}
                        className="px-2.5 py-1 bg-[#F7F8F5] hover:bg-[#E7F4EF] hover:text-[#168568] border border-[#E5E9E5] text-[11px] font-semibold text-[#202923] rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Hidden</span>
                      </button>
                    </div>
                  </div>

                  {customFields.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {customFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                            placeholder="Field Name"
                            className="w-1/3 bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                          />
                          <input
                            type={field.type === 'hidden' ? 'password' : 'text'}
                            value={field.value}
                            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                            placeholder="Field Value"
                            className="flex-1 bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="p-2 text-[#78827B] hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[#E5E9E5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white hover:bg-[#F3F5F2] border border-[#E5E9E5] text-[#202923] rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || decrypting}
                className="px-6 py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-subtle flex items-center gap-2 transition-colors"
              >
                {loading ? 'Encrypting & Saving...' : itemToEdit ? 'Save Changes' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSelectPassword={(generated) => {
          setPassword(generated);
          setShowPassword(true);
        }}
      />
    </>
  );
};
