import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { FolderSummary } from '@pwm/shared';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  folderToEdit?: FolderSummary | null;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folderToEdit,
}) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
    } else {
      setName('');
    }
    setError(null);
  }, [folderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202923]/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white border border-[#E5E9E5] rounded-2xl shadow-modal p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#78827B] hover:text-[#202923] p-1 rounded-lg hover:bg-[#F3F5F2]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568]">
            <Folder className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-[#202923]">
            {folderToEdit ? 'Rename Folder' : 'New Folder'}
          </h3>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#202923] mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance, Work, Personal"
              className="w-full bg-white border border-[#E5E9E5] focus:border-[#168568] focus:ring-2 focus:ring-[#168568]/15 rounded-xl px-3.5 py-2.5 text-xs text-[#202923] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#78827B] hover:bg-[#F3F5F2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-[#168568] hover:bg-[#126e56] disabled:bg-[#D4DAD4] text-white rounded-xl text-xs font-semibold shadow-subtle transition-colors"
            >
              {loading ? 'Saving...' : 'Save Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
