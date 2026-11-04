import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { LoginPayload } from '@pwm/shared';
import { Eye, EyeOff, ShieldAlert, Check } from 'lucide-react';

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
              username: d.login.username || '',
              password: d.login.password || '',
              totp: d.login.totpSecret || '',
              uris: d.login.uris?.map((u) => ({ uri: u })) || [],
            },
          })),
        };
        fileData = JSON.stringify(exportObj, null, 2);
      } else {
        mimeType = 'text/csv';
        filename += '.csv';
        const headers = [
          'folder',
          'favorite',
          'type',
          'name',
          'notes',
          'fields',
          'reprompt',
          'login_uri',
          'login_username',
          'login_password',
          'login_totp',
        ];
        const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

        const rows = decryptedItems.map((d) => [
          escapeCSV(d.folder),
          escapeCSV(d.isFavorite ? '1' : '0'),
          escapeCSV('login'),
          escapeCSV(d.name),
          escapeCSV(d.notes),
          escapeCSV(''),
          escapeCSV('0'),
          escapeCSV(d.login.uris?.[0] || ''),
          escapeCSV(d.login.username || ''),
          escapeCSV(d.login.password || ''),
          escapeCSV(d.login.totpSecret || ''),
        ]);

        fileData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      // 5. Trigger local download directly in browser
      const blob = new Blob([fileData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Clean memory
      setMasterPassword('');
      setIsWarningModalOpen(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0a0f1d] p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Export Vault</h1>
          <p className="text-xs text-slate-400">
            Export unencrypted passwords and credentials for offline backup or migration.
          </p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
            <Check className="w-5 h-5 shrink-0" />
            <span>Vault successfully decrypted and downloaded to your computer!</span>
          </div>
        )}

        {/* Screenshot 13 Layout */}
        <form
          onSubmit={handleStartExport}
          className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-6 space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Export from <span className="text-red-400">*</span>
            </label>
            <select
              disabled
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-200 cursor-not-allowed opacity-90"
            >
              <option>My vault</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Only items in your individual vault will export.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              File format <span className="text-red-400">*</span>
            </label>
            <select
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value as 'json' | 'csv')}
              className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="json">.json</option>
              <option value="csv">.csv</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            Export vault
          </button>
        </form>

        {/* Warning & Master Password Re-Auth Modal */}
        {isWarningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#131d31] border border-amber-500/40 rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <ShieldAlert className="w-8 h-8 shrink-0" />
                <h3 className="text-base font-bold text-white">Security Warning</h3>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 leading-relaxed">
                Your exported file may contain unencrypted passwords. Anyone with access to this file
                may be able to read your credentials. Store it securely and delete it when you no
                longer need it.
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter master password to authenticate"
                    className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 pr-10 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWarningModalOpen(false)}
                  className="px-4 py-2 bg-[#162036] hover:bg-[#1f2d48] text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={exporting || !masterPassword}
                  onClick={handleConfirmExport}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs"
                >
                  {exporting ? 'Decrypting & Exporting...' : 'I Understand, Export Vault'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
