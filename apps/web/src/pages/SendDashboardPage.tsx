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
  File,
  Copy,
  Check,
  Trash2,
  Ban,
  X,
  Upload,
  ExternalLink,
  AlertTriangle,
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
      setError('Send name is required');
      return;
    }

    if (sendType === 'TEXT' && !textContent.trim()) {
      setError('Text to share is required');
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
    if (!window.confirm('Are you sure you want to revoke this Send? It will become inaccessible immediately.')) {
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
    if (!window.confirm('Are you sure you want to permanently delete this Send?')) {
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

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0a0f1d]">
      {/* Left List Area (Screenshots 5, 6, 7) */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-[#1e293b]">
        {/* Header Bar */}
        <div className="p-6 border-b border-[#1e293b] flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Send</h1>
          <button
            onClick={() => handleOpenCreate('TEXT')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[#1e293b] flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-[#131d31] border border-[#1f2e4d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex bg-[#131d31] p-0.5 rounded-lg border border-[#1f2e4d] text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Sends
            </button>
            <button
              onClick={() => setActiveFilter('TEXT')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeFilter === 'TEXT'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveFilter('FILE')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeFilter === 'FILE'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              File
            </button>
          </div>
        </div>

        {/* Sends List / Empty State */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Loading secure sends...
            </div>
          ) : sends.length === 0 ? (
            /* Screenshot 5 Exact Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 mb-6 shadow-inner">
                <Send className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Send sensitive information safely</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Share files and data securely with anyone, on any platform. Your information will remain
                end-to-end encrypted while limiting exposure.
              </p>
              <button
                onClick={() => handleOpenCreate('TEXT')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-lg shadow-blue-600/20"
              >
                Create Send
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#1e293b]">
              {sends.map((send) => {
                const isExpired = new Date() > new Date(send.expiresAt);
                const isRevoked = Boolean(send.revokedAt);
                const isLimitReached =
                  send.maxAccessCount !== null && send.currentAccessCount >= send.maxAccessCount;

                return (
                  <div
                    key={send.id}
                    onClick={() => handleOpenView(send)}
                    className="flex items-center justify-between p-4 hover:bg-[#131d31] transition-colors cursor-pointer group text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        {send.sendType === 'TEXT' ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <File className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 group-hover:text-blue-400">
                            {send.name}
                          </span>
                          {isRevoked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/30">
                              Revoked
                            </span>
                          )}
                          {isExpired && !isRevoked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Expired
                            </span>
                          )}
                          {isLimitReached && !isExpired && !isRevoked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              Limit Reached
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Expires: {new Date(send.expiresAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>Views: {send.currentAccessCount}{send.maxAccessCount ? `/${send.maxAccessCount}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isRevoked && !isExpired && !isLimitReached && (
                        <button
                          onClick={() => handleRevoke(send.id)}
                          title="Revoke Send"
                          className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-amber-400"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(send.id)}
                        title="Delete Send"
                        className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right-Side Panel (Screenshots 6 & 7) */}
      {isPanelOpen && (
        <aside className="w-full md:w-[480px] bg-[#131d31] border-l border-[#1e293b] flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              {panelMode === 'create'
                ? sendType === 'TEXT'
                  ? 'New text'
                  : 'New file'
                : selectedSend?.name}
            </h2>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {panelMode === 'create' ? (
              <form id="send-form" onSubmit={handleSaveSend} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Send Type Switcher */}
                <div className="flex bg-[#0e1628] p-1 rounded-lg border border-[#1f2e4d] text-xs">
                  <button
                    type="button"
                    onClick={() => setSendType('TEXT')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                      sendType === 'TEXT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendType('FILE')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                      sendType === 'FILE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    File
                  </button>
                </div>

                {/* Send Details Box */}
                <div className="space-y-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Send details
                  </span>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Send name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. WiFi Password, Server Credentials"
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {sendType === 'TEXT' ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Text to share <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Enter the sensitive text to share..."
                        className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        File to share <span className="text-red-400">*</span>
                      </label>
                      <label className="border-2 border-dashed border-[#1f2e4d] hover:border-blue-500/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#0e1628]">
                        <Upload className="w-8 h-8 text-blue-400 mb-2" />
                        <span className="text-xs text-slate-200 font-medium">
                          {selectedFile ? selectedFile.name : 'Click to select or drag and drop file'}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1">
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : 'Encrypted client-side before upload (Max 50MB)'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideTextByDefault}
                      onChange={(e) => setHideTextByDefault(e.target.checked)}
                      className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                    />
                    <span className="text-xs text-slate-300">Hide text by default</span>
                  </label>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Deletion date <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={expiration}
                      onChange={(e) => setExpiration(e.target.value as any)}
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="1h">1 hour</option>
                      <option value="1d">1 day</option>
                      <option value="7d">7 days</option>
                      <option value="14d">14 days</option>
                      <option value="31d">31 days</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      The Send will be permanently deleted on this date.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Who can view
                    </label>
                    <select
                      value={recipientPolicy}
                      onChange={(e) => setRecipientPolicy(e.target.value as any)}
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="ANYONE">Anyone with the link</option>
                      <option value="SPECIFIC">Specific people</option>
                      <option value="PASSWORD">Anyone with a password set by you</option>
                    </select>
                  </div>

                  {recipientPolicy === 'PASSWORD' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Send Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Recipients must enter this password"
                        className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {recipientPolicy === 'SPECIFIC' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Authorized Email Addresses <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={specificEmails}
                        onChange={(e) => setSpecificEmails(e.target.value)}
                        placeholder="alice@example.com, bob@example.com"
                        className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Recipients must verify their email before viewing content.
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Options Box */}
                <div className="space-y-4 pt-2 border-t border-[#1f2e4d]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Additional options
                  </span>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Maximum access count
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={maxAccessCount}
                      onChange={(e) =>
                        setMaxAccessCount(e.target.value ? parseInt(e.target.value, 10) : '')
                      }
                      placeholder="e.g. 5"
                      className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      No one can view this Send after the limit is reached.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideSenderEmail}
                      onChange={(e) => setHideSenderEmail(e.target.checked)}
                      className="rounded bg-[#0e1628] border-[#1f2e4d] text-blue-600"
                    />
                    <span className="text-xs text-slate-300">
                      Hide my email address from recipients.
                    </span>
                  </label>
                </div>
              </form>
            ) : (
              /* View Send Details */
              selectedSend && (
                <div className="space-y-5 text-xs text-slate-300">
                  <div className="p-4 bg-[#0e1628] border border-[#1f2e4d] rounded-xl space-y-3">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Send Name</span>
                      <span className="font-semibold text-white text-sm">{selectedSend.name}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Status</span>
                      <span className="font-medium text-slate-200">
                        {selectedSend.revokedAt
                          ? 'Revoked'
                          : new Date() > new Date(selectedSend.expiresAt)
                          ? 'Expired'
                          : 'Active'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Expiration Date</span>
                      <span className="font-mono text-slate-300">
                        {new Date(selectedSend.expiresAt).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Access Count</span>
                      <span className="font-mono text-slate-300">
                        {selectedSend.currentAccessCount}
                        {selectedSend.maxAccessCount ? ` / ${selectedSend.maxAccessCount}` : ' (Unlimited)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Access Policy</span>
                      <span className="font-medium text-slate-300">
                        {selectedSend.recipientPolicy === 'ANYONE'
                          ? 'Anyone with the link'
                          : selectedSend.recipientPolicy === 'PASSWORD'
                          ? 'Password protected'
                          : 'Specific verified emails'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!selectedSend.revokedAt && (
                      <button
                        onClick={() => handleRevoke(selectedSend.id)}
                        className="flex-1 py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/30 rounded-lg font-medium"
                      >
                        Revoke Access
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedSend.id)}
                      className="flex-1 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-lg font-medium"
                    >
                      Delete Send
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Fixed Footer */}
          {panelMode === 'create' && (
            <div className="p-4 border-t border-[#1e293b] flex items-center justify-start gap-3 bg-[#131d31]">
              <button
                type="submit"
                form="send-form"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20"
              >
                {saving ? 'Encrypting & Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="px-6 py-2.5 bg-[#162036] hover:bg-[#1f2d48] text-slate-300 rounded-lg text-xs font-semibold border border-[#1f2e4d]"
              >
                Cancel
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Share Link Modal after creation */}
      {createdShareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#131d31] border border-blue-500/40 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <Send className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Send Created Successfully</h3>
            </div>

            <p className="text-xs text-slate-300">
              Your content was encrypted locally with AES-256-GCM. The decryption key is embedded in the
              URL fragment and was <strong>never sent to the server</strong>.
            </p>

            <div className="p-3 bg-[#0e1628] border border-[#1f2e4d] rounded-lg flex items-center justify-between gap-3 font-mono text-xs text-slate-200 break-all select-all">
              <span>{createdShareUrl}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={createdShareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Test Recipient Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreatedShareUrl(null)}
                  className="px-4 py-2 bg-[#162036] hover:bg-[#1f2d48] text-slate-300 rounded-lg text-xs"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => copyUrl(createdShareUrl)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
