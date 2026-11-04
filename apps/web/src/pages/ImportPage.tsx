import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { FolderSummary, VaultItemSummary, ImportPreviewItem, LoginPayload } from '@pwm/shared';
import {
  Upload,
  AlertTriangle,
  ArrowRight,
  FileUp,
  Folder,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ImportPage: React.FC = () => {
  const { user } = useAuth();
  const { isVaultUnlocked, encryptItem } = useVault();

  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [existingItems, setExistingItems] = useState<VaultItemSummary[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<string>('json');
  const [rawContent, setRawContent] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Workflow states: 'input' -> 'preview' -> 'complete'
  const [step, setStep] = useState<'input' | 'preview' | 'complete'>('input');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [duplicateOption, setDuplicateOption] = useState<'skip' | 'import_all'>('skip');
  const [importing, setImporting] = useState(false);
  const [showMaskedPassword, setShowMaskedPassword] = useState(false);
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

  // Handle file drop & selection
  const processFile = (file: globalThis.File) => {
    setSelectedFileName(file.name);
    if (file.name.endsWith('.json')) setFileFormat('json');
    else if (file.name.endsWith('.csv')) setFileFormat('csv');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawContent(content || '');
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Parse CSV helper
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
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
    if (!rawContent.trim()) {
      setError('Please select a file or drop a file to import.');
      return;
    }

    try {
      const parsedList: ImportPreviewItem[] = [];

      if (fileFormat.includes('json')) {
        let json: any;
        try {
          json = JSON.parse(rawContent);
        } catch {
          throw new Error('Invalid JSON format. Please verify the file syntax.');
        }

        const items = Array.isArray(json) ? json : json.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error('No credential items found in JSON file.');
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
    <div className="flex-1 bg-[#F7F8F5] p-4 sm:p-8 overflow-y-auto min-w-0">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#202923] tracking-tight">
            Import Credentials
          </h1>
          <p className="text-xs sm:text-sm text-[#78827B] mt-1">
            Easily migrate your existing passwords from Bitwarden, Chrome, or CSV/JSON files with
            automatic client-side encryption.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Input & Configuration */}
        {step === 'input' && (
          <div className="space-y-5">
            {/* Step Card: Destination & Format */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-5 sm:p-7 shadow-card space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568] flex items-center gap-2">
                <Folder className="w-4 h-4" />
                <span>1. Destination & Format</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    Target Folder <span className="text-[#78827B] font-normal">(optional)</span>
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
                  >
                    <option value="">No folder (Root Vault)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                    File Format
                  </label>
                  <select
                    value={fileFormat}
                    onChange={(e) => setFileFormat(e.target.value)}
                    className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
                  >
                    <option value="json">Bitwarden / SecureVault JSON</option>
                    <option value="csv">Bitwarden / Chrome / Generic CSV</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step Card: Drag-and-Drop Upload Area */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-5 sm:p-7 shadow-card space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#168568] flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>2. Select or Drop File</span>
              </h3>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                  isDragging
                    ? 'border-[#168568] bg-[#E7F4EF]/50 scale-[1.01]'
                    : 'border-[#E5E9E5] hover:border-[#168568] bg-[#F7F8F5]/60'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] mx-auto mb-3 shadow-subtle">
                  <FileUp className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-[#202923] mb-1">
                  Drag and drop your file here
                </h4>
                <p className="text-xs text-[#78827B] mb-4">Supports .json and .csv password export files</p>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-subtle transition-colors">
                  <span>Browse From Computer</span>
                  <input
                    type="file"
                    accept=".json,.csv,text/csv,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {selectedFileName && (
                  <div className="mt-4 p-2.5 bg-white border border-[#B7E3D6] rounded-xl text-xs font-semibold text-[#168568] inline-flex items-center gap-2 shadow-subtle">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Loaded: {selectedFileName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!rawContent.trim()}
                className="px-6 py-3 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-subtle flex items-center gap-2 transition-colors"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Duplicate Handling */}
        {step === 'preview' && (
          <div className="space-y-5">
            {/* Duplicate Settings Card */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-5 sm:p-7 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#202923]">
                    Previewing {previewItems.length} Credentials
                  </h3>
                  <p className="text-xs text-[#78827B]">
                    Review parsed items before client-side encryption. Passwords remain masked.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMaskedPassword(!showMaskedPassword)}
                    className="px-3 py-1.5 bg-[#F7F8F5] border border-[#E5E9E5] rounded-xl text-xs font-semibold text-[#202923] flex items-center gap-1.5"
                  >
                    {showMaskedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showMaskedPassword ? 'Mask Passwords' : 'Show Passwords'}</span>
                  </button>
                </div>
              </div>

              {/* Duplicate Handling Radio */}
              <div className="p-3.5 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[#202923]">Duplicate Handling:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-[#202923]">
                    <input
                      type="radio"
                      name="dup"
                      checked={duplicateOption === 'skip'}
                      onChange={() => setDuplicateOption('skip')}
                      className="text-[#168568] focus:ring-[#168568]"
                    />
                    <span>Skip duplicates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[#202923]">
                    <input
                      type="radio"
                      name="dup"
                      checked={duplicateOption === 'import_all'}
                      onChange={() => setDuplicateOption('import_all')}
                      className="text-[#168568] focus:ring-[#168568]"
                    />
                    <span>Import all</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Preview Table/Cards */}
            <div className="bg-white border border-[#E5E9E5] rounded-3xl overflow-hidden shadow-card">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F5] text-[#78827B] border-b border-[#E5E9E5] font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Password</th>
                      <th className="px-4 py-3">Website</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9E5]">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F7F8F5]/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#202923]">{item.itemName}</td>
                        <td className="px-4 py-3 font-mono text-[#78827B]">{item.username || '—'}</td>
                        <td className="px-4 py-3 font-mono text-[#78827B]">
                          {showMaskedPassword ? item.password || '—' : '••••••••••••'}
                        </td>
                        <td className="px-4 py-3 text-[#168568] truncate max-w-[160px]">
                          {item.uri || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {item.isDuplicate ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Duplicate
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6]">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#78827B] hover:text-[#202923]"
              >
                Back to File Selection
              </button>

              <button
                type="button"
                disabled={importing}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white text-xs font-semibold rounded-xl shadow-subtle flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Encrypting & Importing...</span>
                  </>
                ) : (
                  <span>Confirm & Import {previewItems.length} Items</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Results Summary */}
        {step === 'complete' && (
          <div className="bg-white border border-[#E5E9E5] rounded-3xl p-8 sm:p-12 text-center shadow-card max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] mx-auto shadow-subtle">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#202923]">Import Completed</h2>
              <p className="text-xs text-[#78827B] mt-1">
                Your credentials were encrypted with your vault key and securely saved.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-4 bg-[#F7F8F5] border border-[#E5E9E5] rounded-2xl text-xs">
              <div>
                <span className="text-[10px] text-[#78827B] uppercase font-bold block mb-0.5">
                  Imported
                </span>
                <span className="text-base font-bold text-[#168568]">
                  {importSummary.success}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#78827B] uppercase font-bold block mb-0.5">
                  Skipped
                </span>
                <span className="text-base font-bold text-amber-600">{importSummary.skipped}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#78827B] uppercase font-bold block mb-0.5">
                  Failed
                </span>
                <span className="text-base font-bold text-red-600">{importSummary.failed}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setRawContent('');
                  setSelectedFileName('');
                }}
                className="px-6 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl shadow-subtle"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
