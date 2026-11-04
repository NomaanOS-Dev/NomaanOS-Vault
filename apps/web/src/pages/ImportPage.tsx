import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { FolderSummary, VaultItemSummary, ImportPreviewItem, LoginPayload } from '@pwm/shared';
import { Upload, AlertTriangle, ArrowRight, Check } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const { user } = useAuth();
  const { isVaultUnlocked, encryptItem } = useVault();

  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [existingItems, setExistingItems] = useState<VaultItemSummary[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<string>('');
  const [rawContent, setRawContent] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  // Workflow states: 'input' -> 'preview' -> 'complete'
  const [step, setStep] = useState<'input' | 'preview' | 'complete'>('input');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [duplicateOption, setDuplicateOption] = useState<'skip' | 'import_all'>('skip');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    skipped: number;
    failed: number;
  }>({ total: 0, success: 0, skipped: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isVaultUnlocked) {
      api.getFolders().then(setFolders).catch(console.error);
      api.getItems().then(setExistingItems).catch(console.error);
    }
  }, [user, isVaultUnlocked]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    // Auto-detect format if not already set
    if (!fileFormat) {
      if (file.name.endsWith('.json')) setFileFormat('json');
      else if (file.name.endsWith('.csv')) setFileFormat('csv');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawContent(content || '');
    };
    reader.readAsText(file);
  };

  // Parse CSV helper
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Regex handling quotes with commas
      const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      const values = matches
        ? matches.map((m) => m.replace(/^"|"$/g, '').trim())
        : lines[i].split(',').map((v) => v.trim());

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      records.push(row);
    }
    return records;
  };

  // Parse and preview
  const handlePreview = () => {
    setError(null);
    if (!fileFormat) {
      setError('Please select a file format.');
      return;
    }
    if (!rawContent.trim()) {
      setError('Please choose a file or paste file content.');
      return;
    }

    try {
      const parsedList: ImportPreviewItem[] = [];

      if (fileFormat.includes('json')) {
        let json: any;
        try {
          json = JSON.parse(rawContent);
        } catch {
          throw new Error('Invalid JSON format. Please verify the JSON syntax.');
        }

        const items = Array.isArray(json) ? json : json.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error('No items found in JSON file.');
        }

        items.forEach((item: any) => {
          const name = item.name || item.itemName || item.title || 'Untitled';
          const username = item.login?.username || item.username || '';
          const password = item.login?.password || item.password || '';
          const uri =
            item.login?.uris?.[0]?.uri ||
            (Array.isArray(item.uris) ? item.uris[0] : item.uri) ||
            item.website ||
            '';
          const notes = item.notes || '';
          const totp = item.login?.totp || item.totpSecret || '';

          const isDuplicate = existingItems.some(
            (ex) =>
              ex.itemName.toLowerCase() === name.toLowerCase() &&
              (username ? ex.decryptedPayload?.username === username : true)
          );

          parsedList.push({
            itemName: name,
            username,
            password,
            uri,
            notes,
            totp,
            isValid: Boolean(name),
            isDuplicate,
          });
        });
      } else {
        // CSV Parsing
        const rows = parseCSV(rawContent);
        if (rows.length === 0) {
          throw new Error('No records could be parsed from CSV.');
        }

        rows.forEach((row: any) => {
          const name = row.name || row.title || row.item_name || 'Untitled';
          const username = row.username || row.login_username || row.email || '';
          const password = row.password || row.login_password || '';
          const uri = row.url || row.uri || row.website || row.login_uri || '';
          const notes = row.notes || '';
          const totp = row.totp || row.totp_secret || '';

          const isDuplicate = existingItems.some(
            (ex) => ex.itemName.toLowerCase() === name.toLowerCase()
          );

          parsedList.push({
            itemName: name,
            username,
            password,
            uri,
            notes,
            totp,
            isValid: Boolean(name),
            isDuplicate,
          });
        });
      }

      setPreviewItems(parsedList);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse import content.');
    }
  };

  // Execute encrypted import
  const handleExecuteImport = async () => {
    if (!isVaultUnlocked) {
      setError('Vault must be unlocked to encrypt and import items.');
      return;
    }

    setImporting(true);
    setError(null);

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const itemsToProcess = previewItems.filter((item) => {
      if (!item.isValid) {
        failedCount++;
        return false;
      }
      if (duplicateOption === 'skip' && item.isDuplicate) {
        skippedCount++;
        return false;
      }
      return true;
    });

    for (const item of itemsToProcess) {
      try {
        const payload: LoginPayload = {
          username: item.username || '',
          password: item.password || '',
          totpSecret: item.totp || '',
          uris: item.uri ? [item.uri] : [],
          notes: item.notes || '',
        };

        const encryptedPayload = await encryptItem(payload);

        await api.createItem({
          itemName: item.itemName,
          itemType: 'LOGIN',
          encryptedPayload,
          folderId: selectedFolderId || null,
        });

        successCount++;
      } catch (err) {
        console.error('Failed to import record:', item.itemName, err);
        failedCount++;
      }
    }

    setImportSummary({
      total: previewItems.length,
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
    });

    setImporting(false);
    setStep('complete');
  };

  return (
    <div className="flex-1 bg-[#0a0f1d] p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Import Vault Data</h1>
          <p className="text-xs text-slate-400">
            Import passwords and credentials from other password managers or CSV/JSON backups.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Input & Configuration matching Screenshot 14 */}
        {step === 'input' && (
          <div className="space-y-6">
            {/* Section 1: Destination */}
            <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Destination
              </span>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Vault</label>
                <select
                  disabled
                  className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-200 cursor-not-allowed opacity-90"
                >
                  <option>My vault</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Folder</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select --</option>
                  <option value="">No folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select this option if you want the imported file contents moved to a folder
                </p>
              </div>
            </div>

            {/* Section 2: Data */}
            <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Data
              </span>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  File format <span className="text-red-400">*</span>
                </label>
                <select
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                  className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select --</option>
                  <option value="bitwarden_json">Bitwarden (json)</option>
                  <option value="bitwarden_csv">Bitwarden (csv)</option>
                  <option value="csv">Generic (csv)</option>
                  <option value="json">Generic (json)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select the import file
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-[#162036] hover:bg-[#1f2d48] border border-[#1f2e4d] rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedFileName || 'No file selected'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  or copy/paste the import file contents
                </label>
                <textarea
                  rows={5}
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Paste JSON or CSV data here..."
                  className="w-full bg-[#0e1628] border border-[#1f2e4d] rounded-lg p-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handlePreview}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <span>Preview Import</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Preview & Duplicate Handling */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Import Preview</h3>
                  <p className="text-xs text-slate-400">
                    Found {previewItems.length} records in import file
                  </p>
                </div>

                {/* Duplicate Handling Option */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 font-medium">Duplicate handling:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dup"
                      checked={duplicateOption === 'skip'}
                      onChange={() => setDuplicateOption('skip')}
                      className="text-blue-600"
                    />
                    <span className="text-slate-300">Skip Duplicates</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dup"
                      checked={duplicateOption === 'import_all'}
                      onChange={() => setDuplicateOption('import_all')}
                      className="text-blue-600"
                    />
                    <span className="text-slate-300">Import All</span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="max-h-72 overflow-y-auto border border-[#1f2e4d] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1628] text-slate-400 sticky top-0 border-b border-[#1f2e4d]">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Username</th>
                      <th className="p-2.5">Password</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#162036]">
                        <td className="p-2.5 font-medium text-slate-200">{item.itemName}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{item.username || '—'}</td>
                        <td className="p-2.5 text-slate-500 font-mono">••••••••</td>
                        <td className="p-2.5">
                          {item.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Duplicate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2 bg-[#162036] hover:bg-[#1f2d48] text-slate-300 rounded-lg text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleExecuteImport}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-lg shadow-blue-600/20"
                >
                  {importing ? 'Encrypting & Importing...' : 'Confirm and Import Items'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Complete Results */}
        {step === 'complete' && (
          <div className="bg-[#131d31] border border-[#1f2e4d] rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Import Complete!</h3>
            <p className="text-xs text-slate-400">
              Your passwords were encrypted client-side and saved securely to your vault.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto my-4 text-xs">
              <div className="p-3 bg-[#0e1628] border border-[#1f2e4d] rounded-lg">
                <span className="block font-bold text-emerald-400 text-base">
                  {importSummary.success}
                </span>
                <span className="text-slate-400">Imported</span>
              </div>
              <div className="p-3 bg-[#0e1628] border border-[#1f2e4d] rounded-lg">
                <span className="block font-bold text-amber-400 text-base">
                  {importSummary.skipped}
                </span>
                <span className="text-slate-400">Skipped</span>
              </div>
              <div className="p-3 bg-[#0e1628] border border-[#1f2e4d] rounded-lg">
                <span className="block font-bold text-red-400 text-base">
                  {importSummary.failed}
                </span>
                <span className="text-slate-400">Failed</span>
              </div>
            </div>

            <button
              onClick={() => {
                setStep('input');
                setRawContent('');
                setSelectedFileName('');
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
            >
              Import More Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
