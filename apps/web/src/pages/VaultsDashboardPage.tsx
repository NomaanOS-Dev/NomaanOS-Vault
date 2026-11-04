import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { api } from '../services/api';
import { FolderSummary, VaultItemSummary, AnyVaultPayload } from '@pwm/shared';
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
  Terminal,
  Folder as FolderIcon,
  Archive,
  Trash2,
  Copy,
  Check,
  Edit2,
  MoreVertical,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  X,
  ChevronDown,
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

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItemSummary | null>(null);
  const [viewingItem, setViewingItem] = useState<VaultItemSummary | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderSummary | null>(null);

  // Decrypted search metadata cache
  const [decryptedMetadata, setDecryptedMetadata] = useState<
    Record<
      string,
      {
        username?: string;
        uris?: string[];
        cardNumber?: string;
        brand?: string;
        fullName?: string;
        email?: string;
        content?: string;
        host?: string;
      }
    >
  >({});

  // Quick action copied indicator
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  // Options dropdown open state for individual items
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);
  // Folder selector menu toggle
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);

  // Fetch folders and items
  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const [folderList, itemList] = await Promise.all([
        api.getFolders(),
        api.getItems({
          filter: activeFilter,
          folderId: selectedFolderId || undefined,
          search: searchQuery || undefined,
        }),
      ]);

      setFolders(folderList);
      setItems(itemList);

      // Decrypt items in background to support client-side deep search and safe previews
      if (isVaultUnlocked) {
        itemList.forEach((it) => {
          if (!decryptedMetadata[it.id]) {
            decryptItem<AnyVaultPayload>(it.encryptedPayload)
              .then((payload) => {
                setDecryptedMetadata((prev) => ({
                  ...prev,
                  [it.id]: {
                    username: payload.username,
                    uris: payload.uris,
                    cardNumber: payload.cardNumber,
                    brand: payload.brand,
                    fullName: payload.fullName,
                    email: payload.email,
                    content: payload.content ? payload.content.slice(0, 60) : undefined,
                    host: payload.host,
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
      if (dec?.fullName && dec.fullName.toLowerCase().includes(q)) return true;
      if (dec?.email && dec.email.toLowerCase().includes(q)) return true;
      if (dec?.host && dec.host.toLowerCase().includes(q)) return true;
      if (dec?.brand && dec.brand.toLowerCase().includes(q)) return true;
      if (dec?.content && dec.content.toLowerCase().includes(q)) return true;
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
      setActiveItemMenuId(null);
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
      setActiveItemMenuId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to restore item');
    }
  };

  // Permanently Delete
  const handlePermanentDelete = async (id: string) => {
    if (
      !window.confirm(
        'Are you sure you want to permanently delete this item? This action cannot be undone.'
      )
    ) {
      return;
    }
    try {
      await api.permanentlyDeleteItem(id);
      setActiveItemMenuId(null);
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
      setActiveItemMenuId(null);
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

  // Copy Username Quick Action
  const handleCopyUsername = async (item: VaultItemSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let un = decryptedMetadata[item.id]?.username;
      if (un === undefined) {
        const payload = await decryptItem<AnyVaultPayload>(item.encryptedPayload);
        un = payload.username || payload.fullName || payload.cardNumber;
      }
      if (un) {
        await navigator.clipboard.writeText(un);
        setCopiedItemId(`${item.id}-un`);
        setTimeout(() => setCopiedItemId(null), 2000);
      }
    } catch (err: any) {
      alert('Failed to copy: ' + err.message);
    }
  };

  // Copy Password Quick Action (Zero-Knowledge Decrypt and Copy)
  const handleCopyPassword = async (item: VaultItemSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const payload = await decryptItem<AnyVaultPayload>(item.encryptedPayload);
      const secret = payload.password || payload.cvv || payload.privateKey || payload.content;
      if (secret) {
        await navigator.clipboard.writeText(secret);
        setCopiedItemId(`${item.id}-pwd`);
        setTimeout(() => setCopiedItemId(null), 2000);
      }
    } catch (err: any) {
      alert('Failed to copy: ' + err.message);
    }
  };

  // Filter Categories Definition
  const filterCategories = [
    { id: 'all', label: 'All Items', icon: KeyRound },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'login', label: 'Logins', icon: Globe },
    { id: 'card', label: 'Cards', icon: CreditCard },
    { id: 'identity', label: 'Identities', icon: UserSquare2 },
    { id: 'note', label: 'Secure Notes', icon: FileText },
    { id: 'ssh', label: 'SSH Keys', icon: Terminal },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F8F5] min-w-0">
      {/* If vault is locked, display unlock screen */}
      {!isVaultUnlocked && <UnlockVaultModal />}

      {/* ================= VAULTS DASHBOARD TOP BAR ================= */}
      <div className="bg-white border-b border-[#E5E9E5] px-4 sm:px-8 py-5 shrink-0 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-[#202923] tracking-tight">
                Personal Vault
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6]">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-[#78827B] mt-0.5">
              Zero-knowledge client-side encrypted credentials and digital identities.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-subtle flex items-center justify-center gap-2 transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>New Item</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Folders Picker Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78827B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, username, or website address..."
              className="w-full bg-[#F7F8F5] border border-[#E5E9E5] focus:border-[#168568] focus:bg-white focus:ring-2 focus:ring-[#168568]/15 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-[#202923] placeholder-[#78827B]/60 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78827B] hover:text-[#202923]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Folder Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFolderMenuOpen(!folderMenuOpen)}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#F7F8F5] hover:bg-[#EAECE8] border border-[#E5E9E5] rounded-xl text-xs font-semibold text-[#202923] flex items-center justify-between sm:justify-start gap-2 transition-colors"
            >
              <FolderIcon className="w-3.5 h-3.5 text-[#168568]" />
              <span className="truncate max-w-[140px]">
                {selectedFolderId
                  ? folders.find((f) => f.id === selectedFolderId)?.name || 'Folder'
                  : 'All Folders'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#78827B]" />
            </button>

            {folderMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setFolderMenuOpen(false)}
                />
                <div className="absolute left-0 sm:right-0 sm:left-auto mt-1 w-56 bg-white border border-[#E5E9E5] rounded-2xl shadow-dropdown py-1.5 z-40 text-xs">
                  <div className="px-3 py-2 border-b border-[#E5E9E5] flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[#78827B]">
                      Folders
                    </span>
                    <button
                      onClick={() => {
                        setEditingFolder(null);
                        setIsFolderModalOpen(true);
                        setFolderMenuOpen(false);
                      }}
                      className="text-[#168568] hover:text-[#126e56] font-semibold text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>

                  <div className="p-1 space-y-0.5 max-h-56 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedFolderId(null);
                        setFolderMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedFolderId === null
                          ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                          : 'text-[#202923] hover:bg-[#F3F5F2]'
                      }`}
                    >
                      <span>All Folders</span>
                      <span className="text-[10px] text-[#78827B]">{items.length}</span>
                    </button>

                    {folders.map((f) => (
                      <div
                        key={f.id}
                        className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          selectedFolderId === f.id
                            ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                            : 'text-[#202923] hover:bg-[#F3F5F2]'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setSelectedFolderId(f.id);
                            setFolderMenuOpen(false);
                          }}
                          className="flex-1 text-left truncate mr-2"
                        >
                          {f.name}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolder(f);
                              setIsFolderModalOpen(true);
                              setFolderMenuOpen(false);
                            }}
                            className="p-1 text-[#78827B] hover:text-[#168568]"
                            title="Rename folder"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(f);
                            }}
                            className="p-1 text-[#78827B] hover:text-red-600"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ================= CATEGORY FILTER CHIPS ================= */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {filterCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeFilter === cat.id && !selectedFolderId;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveFilter(cat.id);
                  setSelectedFolderId(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6] font-bold shadow-subtle'
                    : 'bg-white text-[#78827B] border border-[#E5E9E5] hover:text-[#202923] hover:border-[#D4DAD4]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? 'text-[#168568]'
                      : cat.id === 'favorites'
                      ? 'text-amber-500'
                      : 'text-[#78827B]'
                  }`}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= MAIN CONTENT LIST / CARDS ================= */}
      <div className="flex-1 overflow-y-auto">
        {/* Onboarding Checklist Card */}
        {!onboardingDismissed && (
          <OnboardingCard
            hasItems={items.length > 0}
            onNavigateToImport={onNavigateToImport || (() => {})}
            onDismiss={handleDismissOnboarding}
          />
        )}

        <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-xs text-[#78827B]">
              <span className="w-7 h-7 border-2 border-[#168568]/30 border-t-[#168568] rounded-full inline-block animate-spin mb-3" />
              <span>Loading secure vault items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            /* Premium Empty State */
            <div className="bg-white border border-[#E5E9E5] rounded-3xl p-8 sm:p-14 text-center max-w-lg mx-auto shadow-card">
              <div className="w-16 h-16 rounded-2xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] mx-auto mb-4 shadow-subtle">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#202923] mb-1.5">
                {searchQuery
                  ? 'No matching entries found'
                  : activeFilter === 'favorites'
                  ? 'No favorite items yet'
                  : activeFilter === 'trash'
                  ? 'Trash is empty'
                  : 'Your vault is ready'}
              </h3>
              <p className="text-xs text-[#78827B] leading-relaxed mb-6 max-w-sm mx-auto">
                {searchQuery
                  ? `No credentials found matching "${searchQuery}". Check your spelling or clear your filter.`
                  : 'Store logins, credentials, and encrypted notes with zero-knowledge AES-256-GCM protection.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#168568] hover:bg-[#126e56] text-white text-xs font-semibold rounded-xl shadow-subtle flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Login</span>
                </button>
                {onNavigateToImport && (
                  <button
                    onClick={onNavigateToImport}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#F3F5F2] text-[#202923] border border-[#E5E9E5] text-xs font-semibold rounded-xl shadow-subtle transition-colors"
                  >
                    Import Passwords
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Modern Responsive Credential Cards Grid */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-[#78827B] font-medium">
                <span>
                  Showing {filteredItems.length}{' '}
                  {filteredItems.length === 1 ? 'credential' : 'credentials'}
                </span>
                <span className="text-[11px] hidden sm:block">Click any card to inspect or edit</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredItems.map((item) => {
                  const meta = decryptedMetadata[item.id];
                  const primaryUri = meta?.uris?.[0];
                  const cleanDomain = primaryUri
                    ? primaryUri.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
                    : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setViewingItem(item)}
                      className="group bg-white border border-[#E5E9E5] hover:border-[#B7E3D6] hover:shadow-cardHover rounded-2xl p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between relative"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#E7F4EF] border border-[#B7E3D6] flex items-center justify-center text-[#168568] shrink-0">
                              {item.itemType === 'CARD' && <CreditCard className="w-5 h-5" />}
                              {item.itemType === 'IDENTITY' && <UserSquare2 className="w-5 h-5" />}
                              {item.itemType === 'SECURE_NOTE' && <FileText className="w-5 h-5" />}
                              {item.itemType === 'SSH_KEY' && <Terminal className="w-5 h-5" />}
                              {(!item.itemType || item.itemType === 'LOGIN') && <Globe className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-[#202923] truncate leading-tight group-hover:text-[#168568] transition-colors">
                                {item.itemName}
                              </h4>
                              <p className="text-[11px] text-[#78827B] truncate mt-0.5">
                                {item.itemType === 'CARD'
                                  ? `${meta?.brand || 'Card'} •••• ${meta?.cardNumber ? meta.cardNumber.slice(-4) : '••••'}`
                                  : item.itemType === 'IDENTITY'
                                  ? meta?.fullName || meta?.email || 'Identity Record'
                                  : item.itemType === 'SECURE_NOTE'
                                  ? meta?.content || 'Encrypted Note'
                                  : item.itemType === 'SSH_KEY'
                                  ? `${meta?.username || 'user'}@${meta?.host || 'server'}`
                                  : cleanDomain || (meta?.username ? meta.username : 'Login Credential')}
                              </p>
                            </div>
                          </div>

                          {/* Favorite Star Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(item);
                            }}
                            className="p-1.5 rounded-lg text-[#78827B] hover:text-amber-500 hover:bg-[#F3F5F2] transition-colors shrink-0"
                            title={item.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#78827B]'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Card Meta details */}
                        <div className="mt-3 pt-3 border-t border-[#E5E9E5] flex items-center justify-between text-xs">
                          <div className="truncate text-[11px] text-[#78827B] font-mono select-all">
                            {meta?.username ? (
                              <span className="truncate block max-w-[170px]">{meta.username}</span>
                            ) : (
                              <span className="italic">Encrypted login</span>
                            )}
                          </div>

                          {item.folderName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F7F8F5] text-[#78827B] border border-[#E5E9E5] truncate max-w-[100px]">
                              {item.folderName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Quick Actions Bar */}
                      <div
                        className="mt-3 pt-2.5 border-t border-[#E5E9E5] flex items-center justify-between text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {/* Copy Username */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyUsername(item, e)}
                            className="p-1.5 rounded-lg text-[#78827B] hover:text-[#168568] hover:bg-[#E7F4EF] transition-colors"
                            title="Copy username"
                          >
                            {copiedItemId === `${item.id}-un` ? (
                              <Check className="w-3.5 h-3.5 text-[#168568]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Copy Password */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyPassword(item, e)}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#168568] hover:bg-[#E7F4EF] border border-transparent hover:border-[#B7E3D6] transition-colors flex items-center gap-1"
                            title="Decrypt & copy password"
                          >
                            {copiedItemId === `${item.id}-pwd` ? (
                              <>
                                <Check className="w-3 h-3 text-[#168568]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <span>Copy Pass</span>
                            )}
                          </button>
                        </div>

                        {/* Options Menu & Edit */}
                        <div className="flex items-center gap-1 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-[#78827B] hover:text-[#168568] hover:bg-[#F3F5F2] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveItemMenuId(activeItemMenuId === item.id ? null : item.id);
                            }}
                            className="p-1.5 text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Popover Options Menu */}
                          {activeItemMenuId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setActiveItemMenuId(null)}
                              />
                              <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-[#E5E9E5] rounded-xl shadow-dropdown py-1 z-40 text-xs font-medium">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleToggleFavorite(item);
                                    setActiveItemMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-[#F3F5F2] flex items-center gap-2 text-[#202923]"
                                >
                                  <Star className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{item.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(item)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-[#F3F5F2] flex items-center gap-2 text-[#202923]"
                                >
                                  <Archive className="w-3.5 h-3.5 text-[#78827B]" />
                                  <span>{item.isArchived ? 'Unarchive' : 'Archive'}</span>
                                </button>

                                {item.deletedAt ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreFromTrash(item.id)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-[#F3F5F2] flex items-center gap-2 text-[#168568]"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Restore Item</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePermanentDelete(item.id)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Permanently Delete</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveToTrash(item.id)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Move to Trash</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddLoginModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSaved={loadData}
        folders={folders}
        itemToEdit={editingItem}
      />

      <ViewLoginModal
        isOpen={Boolean(viewingItem)}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
        onEdit={() => {
          setEditingItem(viewingItem);
          setViewingItem(null);
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

      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleSaveFolder}
        folderToEdit={editingFolder}
      />
    </div>
  );
};
