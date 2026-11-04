import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SecureSendSummary, SendType, RecipientPolicy } from '@pwm/shared';
import {
  generateSendKey,
  encryptSendText,
  encryptSendFile,
} from '../lib/sendCrypto';
import {
  Send,
  Plus,
  Search,
  FileText,
  File as FileIcon,
  Copy,
  Check,
  Trash2,
  Ban,
  X,
  Upload,
  AlertTriangle,
  Clock,
  Eye,
} from 'lucide-react';

export const SendDashboardPage: React.FC = () => {
  // Send list state
  const [sends, setSends] = useState<SecureSendSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TEXT' | 'FILE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Right-side Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'view'>('create');
  const [selectedSend, setSelectedSend] = useState<SecureSendSummary | null>(null);

  // Form states for creating Send
  const [sendType, setSendType] = useState<SendType>('TEXT');
  const [name, setName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [hideTextByDefault, setHideTextByDefault] = useState(false);
  const [expiration, setExpiration] = useState<'1h' | '1d' | '7d' | '14d' | '31d'>('7d');
  const [recipientPolicy, setRecipientPolicy] = useState<RecipientPolicy>('ANYONE');
  const [password, setPassword] = useState('');
  const [specificEmails, setSpecificEmails] = useState('');
  const [maxAccessCount, setMaxAccessCount] = useState<number | ''>('');
  const [hideSenderEmail, setHideSenderEmail] = useState(false);

  // Link Modal state after creation
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSends = async () => {
    try {
      setLoading(true);
      const data = await api.getSends({
        type: activeFilter === 'ALL' ? undefined : activeFilter,
        search: searchQuery || undefined,
      });
      setSends(data);
    } catch (err: any) {
      console.error('Error loading sends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSends();
  }, [activeFilter, searchQuery]);

  const handleOpenCreate = (type: SendType = 'TEXT') => {
    setPanelMode('create');
    setSendType(type);
    setName('');
    setTextContent('');
    setSelectedFile(null);
    setHideTextByDefault(false);
    setExpiration('7d');
    setRecipientPolicy('ANYONE');
    setPassword('');
    setSpecificEmails('');
    setMaxAccessCount('');
    setHideSenderEmail(false);
    setError(null);
    setIsPanelOpen(true);
  };

  const handleOpenView = (send: SecureSendSummary) => {
    setSelectedSend(send);
    setPanelMode('view');
    setIsPanelOpen(true);
  };

  // Submit and Encrypt Send
  const handleSaveSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Send title is required');
      return;
    }

    if (sendType === 'TEXT' && !textContent.trim()) {
      setError('Text content to share is required');
      return;
    }

    if (sendType === 'FILE' && !selectedFile) {
      setError('Please select a file to share');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Generate client-side Send encryption key
      const { key, keyBase64Url } = await generateSendKey();

      let publicToken = '';

      if (sendType === 'TEXT') {
        // Encrypt text locally in browser with AES-256-GCM
        const encryptedPayload = await encryptSendText(key, textContent.trim());

        const res = await api.createTextSend({
          name: name.trim(),
          sendType: 'TEXT',
          encryptedPayload,
          hideTextByDefault,
          expiration,
          maxAccessCount: maxAccessCount ? Number(maxAccessCount) : null,
          recipientPolicy,
          password: recipientPolicy === 'PASSWORD' ? password : undefined,
          specificEmails:
            recipientPolicy === 'SPECIFIC'
              ? specificEmails
                  .split(',')
                  .map((e) => e.trim())
                  .filter((e) => e)
              : undefined,
          hideSenderEmail,
        });

        publicToken = res.publicToken;
      } else if (selectedFile) {
        // Encrypt file locally in browser with AES-256-GCM
        const { encryptedBlob, originalFileName, mimeType } = await encryptSendFile(
          key,
          selectedFile
        );

        const formData = new FormData();
        formData.append('file', encryptedBlob, 'encrypted.bin');
        formData.append('name', name.trim());
        formData.append('expiration', expiration);
        formData.append('originalFileName', originalFileName);
        formData.append('mimeType', mimeType);
        if (maxAccessCount) formData.append('maxAccessCount', String(maxAccessCount));
        formData.append('recipientPolicy', recipientPolicy);
        if (recipientPolicy === 'PASSWORD') formData.append('password', password);
        if (recipientPolicy === 'SPECIFIC') {
          const emails = specificEmails
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e);
          formData.append('specificEmails', JSON.stringify(emails));
        }
        formData.append('hideSenderEmail', String(hideSenderEmail));

        const res = await api.createFileSend(formData);
        publicToken = res.publicToken;
      }

      // Construct zero-knowledge public link with decryption key in fragment!
      const fullShareUrl = `${window.location.origin}/send/${publicToken}#key=${keyBase64Url}`;
      setCreatedShareUrl(fullShareUrl);
      setIsPanelOpen(false);
      loadSends();
    } catch (err: any) {
      setError(err.message || 'Failed to create Send');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to revoke this Send? It will become inaccessible immediately.'
      )
    ) {
      return;
    }
    try {
      await api.revokeSend(id);
      loadSends();
      if (selectedSend?.id === id) setIsPanelOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke send');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this Send record permanently?')) {
      return;
    }
    try {
      await api.deleteSend(id);
      loadSends();
      if (selectedSend?.id === id) setIsPanelOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete send');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F8F5] min-w-0">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E9E5] px-4 sm:px-8 py-5 shrink-0 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-[#202923] tracking-tight">
                Secure Send
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6]">
                Zero-Knowledge Sharing
              </span>
            </div>
            <p className="text-xs text-[#78827B] mt-0.5">
              Securely share encrypted sensitive text or files with clients and team members.
            </p>
          </div>

          <button
            onClick={() => handleOpenCreate('TEXT')}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-subtle flex items-center justify-center gap-2 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Create Send</span>
          </button>
        </div>

        {/* Filter Chips & Search */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(['ALL', 'TEXT', 'FILE'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === filter
                    ? 'bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] shadow-subtle'
                    : 'bg-white text-[#78827B] border border-[#E5E9E5] hover:text-[#202923]'
                }`}
              >
                {filter === 'ALL' ? 'All Sends' : filter === 'TEXT' ? 'Text Sends' : 'File Sends'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78827B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sends..."
              className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#202923] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto w-full">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-xs text-[#78827B]">
              <span className="w-7 h-7 border-2 border-[#168568]/30 border-t-[#168568] rounded-full inline-block animate-spin mb-3" />
              <span>Loading secure sends...</span>
            </div>
          ) : sends.length === 0 ? (
            /* Empty State */
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-8 sm:p-14 text-center max-w-md mx-auto shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] mx-auto mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#202923] mb-1.5">No Secure Sends yet</h3>
              <p className="text-xs text-[#78827B] leading-relaxed mb-6">
                Share sensitive information, credentials, or confidential documents with zero-knowledge
                privacy using single-use or expiration links.
              </p>
              <button
                onClick={() => handleOpenCreate('TEXT')}
                className="px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl shadow-subtle inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Send</span>
              </button>
            </div>
          ) : (
            /* Sends Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sends.map((send) => {
                const isRevoked = Boolean(send.revokedAt);
                const isExpired = new Date(send.expiresAt).getTime() < Date.now();

                return (
                  <div
                    key={send.id}
                    onClick={() => handleOpenView(send)}
                    className="bg-white border border-[#E5E9E5] hover:border-[#B7E3D6] hover:shadow-cardHover rounded-2xl p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] shrink-0">
                            {send.sendType === 'TEXT' ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <FileIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#202923] truncate">{send.name}</h4>
                            <span className="text-[10px] text-[#78827B] font-medium uppercase tracking-wider block">
                              {send.sendType} SEND
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isRevoked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 shrink-0">
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            Expired
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Info Chips */}
                      <div className="space-y-1.5 text-xs text-[#78827B] pt-2 border-t border-[#E5E9E5]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Expires
                          </span>
                          <span className="font-medium text-[#202923]">
                            {new Date(send.expiresAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            Access Views
                          </span>
                          <span className="font-medium text-[#202923]">
                            {send.currentAccessCount}
                            {send.maxAccessCount ? ` / ${send.maxAccessCount}` : ' (unlimited)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div
                      className="mt-4 pt-3 border-t border-[#E5E9E5] flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenView(send)}
                        className="text-xs font-semibold text-[#168568] hover:text-[#126e56]"
                      >
                        Inspect Details
                      </button>

                      <div className="flex items-center gap-1">
                        {!isRevoked && !isExpired && (
                          <button
                            onClick={() => handleRevoke(send.id)}
                            className="p-1.5 text-[#78827B] hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Revoke access immediately"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(send.id)}
                          className="p-1.5 text-[#78827B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Send"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= CREATE / VIEW SIDE-PANEL / MODAL ================= */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-[#202923]/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[92vh] bg-white sm:border border-[#E5E9E5] sm:rounded-2xl shadow-modal flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E5E9E5] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202923]">
                    {panelMode === 'create' ? 'Create Secure Send' : 'Send Inspection'}
                  </h3>
                  <span className="text-[10px] text-[#168568] font-semibold uppercase tracking-wider block">
                    End-to-End Client Encrypted
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-1.5 rounded-lg text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {panelMode === 'create' ? (
                <form id="send-form" onSubmit={handleSaveSend} className="space-y-5">
                  {/* Type Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSendType('TEXT')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        sendType === 'TEXT'
                          ? 'bg-white text-[#168568] shadow-subtle'
                          : 'text-[#78827B] hover:text-[#202923]'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Text Send</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendType('FILE')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        sendType === 'FILE'
                          ? 'bg-white text-[#168568] shadow-subtle'
                          : 'text-[#78827B] hover:text-[#202923]'
                      }`}
                    >
                      <FileIcon className="w-4 h-4" />
                      <span>File Send</span>
                    </button>
                  </div>

                  {/* Send Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                      Send Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. WiFi Passwords, API Keys, Contract PDF"
                      className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none"
                    />
                  </div>

                  {/* Content based on type */}
                  {sendType === 'TEXT' ? (
                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        Text Content to Encrypt & Share <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Paste secret note, credentials, or keys..."
                        className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#202923] outline-none resize-none font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                        File to Encrypt & Share <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-[#E5E9E5] hover:border-[#168568] rounded-2xl p-6 text-center transition-colors">
                        <Upload className="w-8 h-8 text-[#168568] mx-auto mb-2" />
                        <label className="cursor-pointer text-xs font-semibold text-[#168568] hover:underline block">
                          <span>Browse file</span>
                          <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                        {selectedFile ? (
                          <div className="mt-3 p-2 bg-[#E7F4EF] rounded-xl text-xs text-[#168568] font-medium flex items-center justify-between">
                            <span className="truncate">{selectedFile.name}</span>
                            <span className="text-[10px]">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#78827B] mt-1">
                            PDF, images, archives, documents up to 50MB
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Access Limits & Expiration */}
                  <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 space-y-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#168568]">
                      Expiration & Access Limits
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1">
                          Expires After
                        </label>
                        <select
                          value={expiration}
                          onChange={(e) => setExpiration(e.target.value as any)}
                          className="w-full bg-white border border-[#E5E9E5] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                        >
                          <option value="1h">1 Hour</option>
                          <option value="1d">1 Day</option>
                          <option value="7d">7 Days (Default)</option>
                          <option value="14d">14 Days</option>
                          <option value="31d">31 Days</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#202923] mb-1">
                          Max Views (Limit)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={maxAccessCount}
                          onChange={(e) =>
                            setMaxAccessCount(e.target.value ? Number(e.target.value) : '')
                          }
                          placeholder="Unlimited"
                          className="w-full bg-white border border-[#E5E9E5] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recipient Security */}
                  <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 space-y-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#168568]">
                      Recipient Access Security
                    </h4>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                        <input
                          type="radio"
                          name="policy"
                          checked={recipientPolicy === 'ANYONE'}
                          onChange={() => setRecipientPolicy('ANYONE')}
                          className="text-[#168568] focus:ring-[#168568]"
                        />
                        <span>Anyone with the secret link</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                        <input
                          type="radio"
                          name="policy"
                          checked={recipientPolicy === 'PASSWORD'}
                          onChange={() => setRecipientPolicy('PASSWORD')}
                          className="text-[#168568] focus:ring-[#168568]"
                        />
                        <span>Password Protected</span>
                      </label>

                      {recipientPolicy === 'PASSWORD' && (
                        <div className="pl-6 pt-1">
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Set recipient password"
                            className="w-full bg-white border border-[#E5E9E5] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                          />
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[#202923]">
                        <input
                          type="radio"
                          name="policy"
                          checked={recipientPolicy === 'SPECIFIC'}
                          onChange={() => setRecipientPolicy('SPECIFIC')}
                          className="text-[#168568] focus:ring-[#168568]"
                        />
                        <span>Restrict to Specific Email Addresses</span>
                      </label>

                      {recipientPolicy === 'SPECIFIC' && (
                        <div className="pl-6 pt-1">
                          <input
                            type="text"
                            required
                            value={specificEmails}
                            onChange={(e) => setSpecificEmails(e.target.value)}
                            placeholder="alice@company.com, bob@partner.org"
                            className="w-full bg-white border border-[#E5E9E5] rounded-xl px-3 py-2 text-xs text-[#202923] outline-none"
                          />
                          <p className="text-[10px] text-[#78827B] mt-1">
                            Comma-separated list of permitted recipient emails
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              ) : (
                /* Inspection details */
                selectedSend && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[#78827B]">Title</span>
                      <p className="text-sm font-bold text-[#202923]">{selectedSend.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3">
                        <span className="text-[10px] uppercase font-bold text-[#78827B] block mb-1">
                          Expiration
                        </span>
                        <p className="font-semibold text-[#202923]">
                          {new Date(selectedSend.expiresAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl p-3">
                        <span className="text-[10px] uppercase font-bold text-[#78827B] block mb-1">
                          Views Count
                        </span>
                        <p className="font-semibold text-[#202923]">
                          {selectedSend.currentAccessCount}{' '}
                          {selectedSend.maxAccessCount
                            ? `/ ${selectedSend.maxAccessCount}`
                            : '(Unlimited)'}
                        </p>
                      </div>
                    </div>

                    {selectedSend.fileInfo && (
                      <div className="bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl p-4">
                        <span className="text-[10px] uppercase font-bold text-[#78827B] block mb-1">
                          Encrypted File
                        </span>
                        <p className="font-bold text-[#202923]">
                          {selectedSend.fileInfo.originalFileName}
                        </p>
                        <p className="text-[11px] text-[#78827B]">
                          {(selectedSend.fileInfo.encryptedSize / 1024).toFixed(1)} KB •{' '}
                          {selectedSend.fileInfo.mimeType}
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E5E9E5] bg-[#F7F8F5] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#78827B] hover:text-[#202923]"
              >
                Close
              </button>
              {panelMode === 'create' && (
                <button
                  type="submit"
                  form="send-form"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white rounded-xl text-xs font-semibold shadow-subtle disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Encrypting & Uploading...' : 'Create Secure Send'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SHARE LINK MODAL ================= */}
      {createdShareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E9E5] rounded-2xl p-6 sm:p-8 shadow-modal space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#E7F4EF] border border-[#B7E3D6] text-[#168568] rounded-2xl flex items-center justify-center shrink-0">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202923]">
                  Secure Send Link Ready
                </h3>
                <p className="text-xs text-[#78827B]">
                  The decryption key is securely embedded only in the URL fragment.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-[#168568] truncate break-all select-all">
                {createdShareUrl}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdShareUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="px-3.5 py-1.5 bg-[#168568] hover:bg-[#126e56] text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-3 bg-[#E7F4EF]/60 border border-[#B7E3D6] rounded-xl text-xs text-[#168568] leading-relaxed">
              <strong>Zero-Knowledge Principle:</strong> The key after <code>#key=...</code> is
              never transmitted to the server. Only people holding this exact link can decrypt this Send.
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedShareUrl(null)}
                className="px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white font-semibold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
