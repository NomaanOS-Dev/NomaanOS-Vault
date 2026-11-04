import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { LoginPayload } from '@pwm/shared';
import {
  FileDown,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldAlert,
  X,
} from 'lucide-react';

export const ExportPage: React.FC = () => {
  const { unlockVault, decryptItem } = useVault();

  const [fileFormat, setFileFormat] = useState<'json' | 'csv'>('json');
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleStartExport = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsWarningModalOpen(true);
  };

  const handleConfirmExport = async () => {
    setError(null);
    setExporting(true);

    try {
      // 1. Re-authenticate master password
      const verified = await unlockVault(masterPassword);
      if (!verified) {
        throw new Error('Incorrect Master Password. Export aborted.');
      }

      // 2. Fetch all vault items
      const items = await api.getItems();

      // 3. Decrypt all items client-side
      const decryptedItems: Array<{
        name: string;
        folder: string;
        login: LoginPayload;
        isFavorite: boolean;
        notes: string;
      }> = [];

      for (const item of items) {
        try {
          const payload = await decryptItem<LoginPayload>(item.encryptedPayload);
          decryptedItems.push({
            name: item.itemName,
            folder: item.folderName || '',
            login: payload,
            isFavorite: item.isFavorite,
            notes: payload.notes || '',
          });
        } catch {
          // If decryption fails, skip corrupted
        }
      }

      // 4. Serialize to requested format
      let fileData = '';
      let mimeType = '';
      let filename = `vault-export-${new Date().toISOString().slice(0, 10)}`;

      if (fileFormat === 'json') {
        mimeType = 'application/json';
        filename += '.json';
        const exportObj = {
          encrypted: false,
          exportedAt: new Date().toISOString(),
          items: decryptedItems.map((d) => ({
            name: d.name,
            folder: d.folder,
            favorite: d.isFavorite,
            type: 1, // Login
            notes: d.notes,
            login: {
              username: d.login.username,
              password: d.login.password,
              totp: d.login.totpSecret,
              uris: d.login.uris?.map((u) => ({ uri: u })),
            },
          })),
        };
        fileData = JSON.stringify(exportObj, null, 2);
      } else {
        mimeType = 'text/csv';
        filename += '.csv';
        const headers = ['folder', 'favorite', 'type', 'name', 'notes', 'login_uri', 'login_username', 'login_password', 'login_totp'];
        const rows = decryptedItems.map((d) => [
          `"${(d.folder || '').replace(/"/g, '""')}"`,
          d.isFavorite ? '1' : '0',
          'login',
          `"${(d.name || '').replace(/"/g, '""')}"`,
          `"${(d.notes || '').replace(/"/g, '""')}"`,
          `"${(d.login.uris?.[0] || '').replace(/"/g, '""')}"`,
          `"${(d.login.username || '').replace(/"/g, '""')}"`,
          `"${(d.login.password || '').replace(/"/g, '""')}"`,
          `"${(d.login.totpSecret || '').replace(/"/g, '""')}"`,
        ]);
        fileData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      }

      // 5. Trigger download
      const blob = new Blob([fileData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsWarningModalOpen(false);
      setMasterPassword('');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F7F8F5] p-4 sm:p-8 overflow-y-auto min-w-0">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202923] tracking-tight">
            Export Vault Data
          </h1>
          <p className="text-xs sm:text-sm text-[#78827B] mt-1">
            Export a backup of your decrypted passwords in JSON or CSV format.
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-3.5 shadow-subtle">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900 mb-0.5">
              Important Plaintext Security Advisory
            </h4>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Exported files contain your passwords in plaintext. Anyone with access to this file can
              read your credentials. Store it only on an encrypted volume or delete it immediately after use.
            </p>
          </div>
        </div>

        {success && (
          <div className="p-4 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center gap-2.5 text-xs text-[#168568] font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Vault export downloaded successfully!</span>
          </div>
        )}

        {/* Export Configuration Card */}
        <div className="bg-white border border-[#E5E9E5] rounded-3xl p-6 sm:p-8 shadow-card space-y-5">
          <form onSubmit={handleStartExport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                Vault to Export
              </label>
              <select
                disabled
                className="w-full bg-[#EAECE8] border border-[#E5E9E5] rounded-xl px-3.5 py-2.5 text-xs text-[#78827B] cursor-not-allowed outline-none"
              >
                <option>Personal Vault (All Items)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                File Format
              </label>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as any)}
                className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
              >
                <option value="json">JSON format (.json) — Recommended</option>
                <option value="csv">CSV spreadsheet (.csv)</option>
              </select>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl shadow-subtle flex items-center justify-center gap-2 transition-colors"
              >
                <FileDown className="w-4 h-4" />
                <span>Export Vault</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation & Master Password Re-authentication Modal */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E9E5] rounded-2xl p-6 sm:p-8 shadow-modal space-y-4 relative">
            <button
              onClick={() => setIsWarningModalOpen(false)}
              className="absolute top-4 right-4 text-[#78827B] hover:text-[#202923] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202923]">Confirm Vault Export</h3>
                <p className="text-xs text-[#78827B]">Confirm Master Password to decrypt and export</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter master password to authenticate"
                  className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] pr-10 outline-none"
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

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E9E5]">
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#78827B] hover:text-[#202923]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={exporting || !masterPassword}
                onClick={handleConfirmExport}
                className="px-5 py-2 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white text-xs font-semibold rounded-xl shadow-subtle flex items-center gap-2"
              >
                {exporting ? 'Decrypting Vault...' : 'Confirm & Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
