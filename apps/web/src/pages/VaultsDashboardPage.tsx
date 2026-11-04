import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { FolderSummary, VaultItemSummary, LoginPayload } from '@pwm/shared';
import { AddLoginModal } from '../components/modals/AddLoginModal';
import { ViewLoginModal } from '../components/modals/ViewLoginModal';
import { FolderModal } from '../components/modals/FolderModal';
import { UnlockVaultModal } from '../components/modals/UnlockVaultModal';
import { OnboardingCard } from '../components/onboarding/OnboardingCard';
import {
  Search,
  Plus,
  Star,
  Globe,
  CreditCard,
  UserSquare2,
  FileText,
  Key,
  Folder,
  FolderOpen,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  HelpCircle,
  Building,
  RotateCcw,
  Edit2,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react';

interface VaultsDashboardPageProps {
  onNavigateToImport?: () => void;
}

export const VaultsDashboardPage: React.FC<VaultsDashboardPageProps> = ({
  onNavigateToImport,
}) => {
  const { user, updateProfile } = useAuth();
  const { isVaultUnlocked, decryptItem } = useVault();

  // Onboarding state
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(
    Boolean(user?.onboardingDismissed)
  );

  useEffect(() => {
    if (user?.onboardingDismissed !== undefined) {
      setOnboardingDismissed(user.onboardingDismissed);
    }
  }, [user?.onboardingDismissed]);

  const handleDismissOnboarding = async () => {
    setOnboardingDismissed(true);
    try {
      await updateProfile({ onboardingDismissed: true });
    } catch (err) {
      console.error('Failed to dismiss onboarding:', err);
    }
  };

  // Data state
  const [items, setItems] = useState<VaultItemSummary[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  // Filters state
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Collapsible section state in sidebar
  const [vaultsOpen, setVaultsOpen] = useState(true);
  const [itemsOpen, setItemsOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemSummary | null>(null);
  const [viewingItem, setViewingItem] = useState<VaultItemSummary | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderSummary | null>(null);

  // Decrypted search cache for client-side search across username & URI
  const [decryptedMetadata, setDecryptedMetadata] = useState<
    Record<string, { username?: string; uris?: string[] }>
  >({});

  // Selection
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Fetch folders and items
  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch folders
      const folderList = await api.getFolders();
      setFolders(folderList);

      // Fetch items
      const itemList = await api.getItems({
        filter: activeFilter,
        folderId: selectedFolderId || undefined,
        search: searchQuery || undefined,
      });
      setItems(itemList);

      // Decrypt items in background to support client-side deep search
      if (isVaultUnlocked) {
        itemList.forEach((it) => {
          if (!decryptedMetadata[it.id]) {
            decryptItem<LoginPayload>(it.encryptedPayload)
              .then((payload) => {
                setDecryptedMetadata((prev) => ({
                  ...prev,
                  [it.id]: {
                    username: payload.username,
                    uris: payload.uris,
                  },
                }));
              })
              .catch(() => {});
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vault items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVaultUnlocked) {
      loadData();
    }
  }, [activeFilter, selectedFolderId, isVaultUnlocked]);

  // Client-side search filtering combining Item Name, Username, and URLs
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();

    return items.filter((item) => {
      if (item.itemName.toLowerCase().includes(q)) return true;
      const dec = decryptedMetadata[item.id];
      if (dec?.username && dec.username.toLowerCase().includes(q)) return true;
      if (dec?.uris && dec.uris.some((u) => u.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [items, searchQuery, decryptedMetadata]);

  // Handle Favorites toggle
  const handleToggleFavorite = async (item: VaultItemSummary) => {
    try {
      const res = await api.toggleFavorite(item.id);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isFavorite: res.isFavorite } : it))
      );
      if (viewingItem && viewingItem.id === item.id) {
        setViewingItem((prev) => (prev ? { ...prev, isFavorite: res.isFavorite } : null));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle favorite');
    }
  };

  // Move to Trash
  const handleMoveToTrash = async (id: string) => {
    try {
      await api.moveItemToTrash(id);
      loadData();
      if (viewingItem?.id === id) setViewingItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to move to trash');
    }
  };

  // Restore from Trash
  const handleRestoreFromTrash = async (id: string) => {
    try {
      await api.restoreItemFromTrash(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to restore item');
    }
  };

  // Permanently Delete
  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return;
    }
    try {
      await api.permanentlyDeleteItem(id);
      loadData();
      if (viewingItem?.id === id) setViewingItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  // Archive / Unarchive
  const handleToggleArchive = async (item: VaultItemSummary) => {
    try {
      if (item.isArchived) {
        await api.restoreArchiveItem(item.id);
      } else {
        await api.archiveItem(item.id);
      }
      loadData();
      if (viewingItem?.id === item.id) setViewingItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update archive status');
    }
  };

  // Folder Actions
  const handleSaveFolder = async (name: string) => {
    if (editingFolder) {
      await api.renameFolder(editingFolder.id, name);
    } else {
      await api.createFolder(name);
    }
    loadData();
  };

  const handleDeleteFolder = async (folder: FolderSummary) => {
    if (
      !window.confirm(
        `Delete folder "${folder.name}"? Password entries in this folder will safely remain in your vault under "No folder".`
      )
    ) {
      return;
    }
    try {
      await api.deleteFolder(folder.id);
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
        setActiveFilter('all');
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete folder');
    }
  };

  // Select all toggle
  const handleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((i) => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* If vault is locked, display unlock screen */}
      {!isVaultUnlocked && <UnlockVaultModal />}

      {/* Middle Sub-Sidebar: FILTERS (Exact match to Screenshot 4) */}
      <div className="w-64 bg-[#0c1322] border-r border-[#1e293b] flex flex-col shrink-0 select-none overflow-y-auto">
        {/* Filters Header */}
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Filters
          </span>
          <button
            title="Vault filter information"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Search Vault Input */}
        <div className="p-3 border-b border-[#1e293b]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vault"
              className="w-full bg-[#131d31] border border-[#1f2e4d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Filters Tree Navigation */}
        <div className="p-2 space-y-4 text-xs flex-1">
          {/* Section 1: All Vaults */}
          <div>
            <button
              onClick={() => setVaultsOpen(!vaultsOpen)}
              className="w-full flex items-center gap-1.5 py-1 px-1.5 text-slate-400 hover:text-white font-medium"
            >
              {vaultsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>All vaults</span>
            </button>

            {vaultsOpen && (
              <div className="pl-4 space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'all' && !selectedFolderId
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-300 hover:bg-[#162036]'
                  }`}
                >
                  <UserSquare2 className="w-3.5 h-3.5" />
                  <span>My vault</span>
                </button>

                <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-slate-400 hover:bg-[#162036]">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5" />
                    <span>test</span>
                  </div>
                  <MoreVertical className="w-3.5 h-3.5" />
                </div>

                <button
                  onClick={() =>
                    alert('Organization Vaults is marked for future multi-tenant release.')
                  }
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-[#162036]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New organization</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: All Items */}
          <div>
            <button
              onClick={() => setItemsOpen(!itemsOpen)}
              className="w-full flex items-center gap-1.5 py-1 px-1.5 text-slate-400 hover:text-white font-medium"
            >
              {itemsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>All items</span>
            </button>

            {itemsOpen && (
              <div className="pl-4 space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveFilter('favorites');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'favorites'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-300 hover:bg-[#162036]'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Favorites</span>
                </button>

                <button
                  onClick={() => {
                    setActiveFilter('login');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'login'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-300 hover:bg-[#162036]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Login</span>
                </button>

                <button
                  onClick={() => {
                    setActiveFilter('card');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'card'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-400 hover:bg-[#162036]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>

                <button
                  onClick={() => {
                    setActiveFilter('identity');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'identity'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-400 hover:bg-[#162036]'
                  }`}
                >
                  <UserSquare2 className="w-3.5 h-3.5" />
                  <span>Identity</span>
                </button>

                <button
                  onClick={() => {
                    setActiveFilter('note');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'note'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-400 hover:bg-[#162036]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Secure note</span>
                </button>

                <button
                  onClick={() => {
                    setActiveFilter('ssh');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'ssh'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-400 hover:bg-[#162036]'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>SSH key</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Folders */}
          <div>
            <div className="flex items-center justify-between py-1 px-1.5">
              <button
                onClick={() => setFoldersOpen(!foldersOpen)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white font-medium"
              >
                {foldersOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Folders</span>
              </button>
              <button
                onClick={() => {
                  setEditingFolder(null);
                  setIsFolderModalOpen(true);
                }}
                title="Create Folder"
                className="p-1 hover:bg-[#162036] rounded text-slate-400 hover:text-blue-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {foldersOpen && (
              <div className="pl-4 space-y-0.5 mt-1">
                <button
                  onClick={() => {
                    setActiveFilter('no_folder');
                    setSelectedFolderId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    activeFilter === 'no_folder'
                      ? 'bg-blue-600/15 text-blue-400 font-medium'
                      : 'text-slate-300 hover:bg-[#162036]'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>No folder</span>
                </button>

                {folders.map((f) => (
                  <div
                    key={f.id}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md transition-colors ${
                      selectedFolderId === f.id
                        ? 'bg-blue-600/15 text-blue-400 font-medium'
                        : 'text-slate-300 hover:bg-[#162036]'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveFilter('folder');
                        setSelectedFolderId(f.id);
                      }}
                      className="flex items-center gap-2 flex-1 text-left truncate"
                    >
                      {selectedFolderId === f.id ? (
                        <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Folder className="w-3.5 h-3.5" />
                      )}
                      <span className="truncate">{f.name}</span>
                      {f.itemCount !== undefined && f.itemCount > 0 && (
                        <span className="text-[10px] text-slate-500 ml-auto mr-1">
                          {f.itemCount}
                        </span>
                      )}
                    </button>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(f);
                          setIsFolderModalOpen(true);
                        }}
                        title="Rename folder"
                        className="p-1 hover:text-white"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(f);
                        }}
                        title="Delete folder"
                        className="p-1 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Collections */}
          <div>
            <button
              onClick={() => setCollectionsOpen(!collectionsOpen)}
              className="w-full flex items-center gap-1.5 py-1 px-1.5 text-slate-400 hover:text-white font-medium"
            >
              {collectionsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Collections</span>
            </button>

            {collectionsOpen && (
              <div className="pl-4 space-y-0.5 mt-1">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-400">
                  <Building className="w-3.5 h-3.5" />
                  <span>Default collection</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Archive */}
          <button
            onClick={() => {
              setActiveFilter('archive');
              setSelectedFolderId(null);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
              activeFilter === 'archive'
                ? 'bg-blue-600/15 text-blue-400 font-medium'
                : 'text-slate-300 hover:bg-[#162036]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>

          {/* Section 6: Trash */}
          <button
            onClick={() => {
              setActiveFilter('trash');
              setSelectedFolderId(null);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
              activeFilter === 'trash'
                ? 'bg-blue-600/15 text-blue-400 font-medium'
                : 'text-slate-300 hover:bg-[#162036]'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
          </button>
        </div>
      </div>

      {/* Main Vault Items Area */}
      <main className="flex-1 flex flex-col bg-[#0a0f1d] overflow-hidden">
        {/* Table Header Bar matching Screenshot 4 */}
        <div className="h-12 border-b border-[#1e293b] px-6 flex items-center justify-between bg-[#0a0f1d] text-xs text-slate-400 font-medium shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={handleSelectAll}
              className="p-1 hover:text-white transition-colors"
            >
              {selectedItemIds.length > 0 && selectedItemIds.length === filteredItems.length ? (
                <CheckSquare className="w-4 h-4 text-blue-500" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <span className="w-2/5">Name</span>
            <span className="w-2/5">Owner</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Options</span>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add item</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {!onboardingDismissed && (
            <OnboardingCard
              hasItems={items.length > 0}
              onNavigateToImport={onNavigateToImport || (() => {})}
              onDismiss={handleDismissOnboarding}
            />
          )}

          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              <span className="inline-block animate-spin mr-2">⚙️</span>
              Loading secure vault items...
            </div>
          ) : filteredItems.length === 0 ? (
            /* Screenshot 4 Exact Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              {/* 4 Colored Icons 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2 mb-6 p-3 bg-[#131d31]/50 border border-[#1f2e4d] rounded-2xl shadow-inner">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-sm">
                  <Key className="w-6 h-6" />
                </div>
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="w-12 h-12 bg-blue-600/10 border border-blue-600/30 rounded-xl flex items-center justify-center text-blue-400 shadow-sm">
                  <UserSquare2 className="w-6 h-6" />
                </div>
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-100 mb-2">
                No items in the vault
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                The vault protects more than just your passwords. Store secure logins, IDs, cards and
                notes securely here.
              </p>

              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </div>
          ) : (
            /* Items Table */
            <div className="divide-y divide-[#1e293b]">
              {filteredItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-6 py-3.5 hover:bg-[#131d31]/60 transition-colors text-xs ${
                      isSelected ? 'bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => handleSelectItem(item.id)}
                        className="p-1 hover:text-white transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        {item.itemType === 'LOGIN' && <Globe className="w-4 h-4" />}
                        {item.itemType === 'CARD' && <CreditCard className="w-4 h-4" />}
                        {item.itemType === 'IDENTITY' && <UserSquare2 className="w-4 h-4" />}
                        {item.itemType === 'SECURE_NOTE' && <FileText className="w-4 h-4" />}
                        {item.itemType === 'SSH_KEY' && <Key className="w-4 h-4" />}
                      </div>

                      {/* Name + Folder Badge */}
                      <div className="w-2/5 pr-4 truncate">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="font-medium text-slate-100 hover:text-blue-400 transition-colors text-left truncate block"
                        >
                          {item.itemName}
                        </button>
                        {item.folderName && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Folder className="w-2.5 h-2.5" />
                            {item.folderName}
                          </span>
                        )}
                      </div>

                      {/* Owner */}
                      <span className="w-2/5 text-slate-400 truncate">{user?.email}</span>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(item)}
                        title={item.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                        className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            item.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => setViewingItem(item)}
                        title="View Details"
                        className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsAddModalOpen(true);
                        }}
                        title="Edit Item"
                        className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {activeFilter === 'trash' ? (
                        <>
                          <button
                            onClick={() => handleRestoreFromTrash(item.id)}
                            title="Restore from Trash"
                            className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item.id)}
                            title="Permanently Delete"
                            className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleArchive(item)}
                            title={item.isArchived ? 'Restore from Archive' : 'Archive Item'}
                            className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-white transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveToTrash(item.id)}
                            title="Move to Trash"
                            className="p-1.5 hover:bg-[#162036] rounded text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Login Modal */}
      <AddLoginModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={loadData}
        folders={folders}
        itemToEdit={editingItem}
      />

      {/* View Login Modal */}
      <ViewLoginModal
        isOpen={Boolean(viewingItem)}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
        onEdit={() => {
          const it = viewingItem;
          setViewingItem(null);
          setEditingItem(it);
          setIsAddModalOpen(true);
        }}
        onDelete={() => {
          if (viewingItem) {
            handleMoveToTrash(viewingItem.id);
          }
        }}
        onToggleFavorite={() => {
          if (viewingItem) {
            handleToggleFavorite(viewingItem);
          }
        }}
      />

      {/* Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleSaveFolder}
        folderToEdit={editingFolder}
      />
    </div>
  );
};
