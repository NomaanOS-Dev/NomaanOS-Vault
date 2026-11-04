import React, { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import {
  ShieldCheck,
  Send,
  Wrench,
  BarChart3,
  Settings,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
  KeyRound,
  FileDown,
  FileUp,
  Sparkles,
  User,
} from 'lucide-react';
import { PasswordGeneratorModal } from '../modals/PasswordGeneratorModal';

interface AppLayoutProps {
  children: ReactNode;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeNav,
  setActiveNav,
}) => {
  const { user, logout } = useAuth();
  const { isVaultUnlocked, lockVault } = useVault();
  const [collapsed, setCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(activeNav.startsWith('tools'));
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (nav: string) => {
    setActiveNav(nav);
    setMobileMenuOpen(false);
  };

  const getPageTitle = () => {
    switch (activeNav) {
      case 'vaults':
        return 'Vaults';
      case 'send':
        return 'Secure Send';
      case 'tools_generator':
        return 'Password Generator';
      case 'tools_import':
        return 'Import Credentials';
      case 'tools_export':
        return 'Export Vault';
      case 'reports':
        return 'Security Reports';
      case 'settings':
        return 'Account & Settings';
      default:
        return 'SecureVault';
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F8F5] text-[#202923] overflow-hidden font-sans">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-[#E5E9E5] hidden md:flex flex-col justify-between shrink-0 transition-all duration-200 select-none z-20`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-4 border-b border-[#E5E9E5] gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#168568] flex items-center justify-center text-white shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="font-bold text-sm tracking-tight text-[#202923] block leading-tight">
                  SecureVault
                </span>
                <span className="text-[10px] font-semibold text-[#168568] uppercase tracking-wider block">
                  Security Workspace
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {/* 1. Vaults */}
            <button
              onClick={() => handleNavClick('vaults')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeNav === 'vaults'
                  ? 'bg-[#E7F4EF] text-[#168568] font-semibold border border-[#B7E3D6] shadow-subtle'
                  : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Vaults</span>}
            </button>

            {/* 2. Send */}
            <button
              onClick={() => handleNavClick('send')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeNav === 'send'
                  ? 'bg-[#E7F4EF] text-[#168568] font-semibold border border-[#B7E3D6] shadow-subtle'
                  : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Send</span>}
            </button>

            {/* 3. Tools (Expandable) */}
            <div>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  activeNav.startsWith('tools')
                    ? 'text-[#168568] font-semibold'
                    : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>Tools</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      toolsOpen ? 'rotate-180 text-[#168568]' : 'text-[#78827B]'
                    }`}
                  />
                )}
              </button>

              {toolsOpen && !collapsed && (
                <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                  <button
                    onClick={() => handleNavClick('tools_generator')}
                    className={`w-full text-left py-2 px-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                      activeNav === 'tools_generator'
                        ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                        : 'text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generator</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('tools_import')}
                    className={`w-full text-left py-2 px-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                      activeNav === 'tools_import'
                        ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                        : 'text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2]'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('tools_export')}
                    className={`w-full text-left py-2 px-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                      activeNav === 'tools_export'
                        ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                        : 'text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2]'
                    }`}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Reports */}
            <button
              onClick={() => handleNavClick('reports')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeNav === 'reports'
                  ? 'bg-[#E7F4EF] text-[#168568] font-semibold border border-[#B7E3D6] shadow-subtle'
                  : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Reports</span>}
            </button>

            {/* 5. Settings */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeNav === 'settings'
                  ? 'bg-[#E7F4EF] text-[#168568] font-semibold border border-[#B7E3D6] shadow-subtle'
                  : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Area */}
        <div className="p-3 border-t border-[#E5E9E5] space-y-2">
          {/* User profile strip */}
          {!collapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F7F8F5] border border-[#E5E9E5]">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.username}
                    className="w-7 h-7 rounded-lg border border-[#B7E3D6] shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#E7F4EF] text-[#168568] font-bold text-xs flex items-center justify-center shrink-0">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#202923] truncate">
                    {user?.username || 'User'}
                  </div>
                  <div className="text-[10px] text-[#78827B] truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="w-8 h-8 rounded-lg bg-[#E7F4EF] text-[#168568] font-bold text-xs flex items-center justify-center">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          )}

          {/* Collapse Sidebar Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2] rounded-lg transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ================= MOBILE NAVIGATION DRAWER ================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#202923]/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-over Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col justify-between shadow-2xl z-50 p-4">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E9E5]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#168568] flex items-center justify-center text-white">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#202923] block leading-tight">
                      SecureVault
                    </span>
                    <span className="text-[10px] font-semibold text-[#168568] uppercase tracking-wider block">
                      Workspace
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#78827B] hover:text-[#202923] hover:bg-[#F3F5F2]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="py-4 space-y-1">
                <button
                  onClick={() => handleNavClick('vaults')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    activeNav === 'vaults'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Vaults</span>
                </button>

                <button
                  onClick={() => handleNavClick('send')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    activeNav === 'send'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>

                <div className="pt-2 pb-1 px-3 text-[11px] font-semibold text-[#78827B] uppercase tracking-wider">
                  Tools
                </div>

                <button
                  onClick={() => handleNavClick('tools_generator')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    activeNav === 'tools_generator'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generator</span>
                </button>

                <button
                  onClick={() => handleNavClick('tools_import')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    activeNav === 'tools_import'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <FileUp className="w-4 h-4" />
                  <span>Import</span>
                </button>

                <button
                  onClick={() => handleNavClick('tools_export')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    activeNav === 'tools_export'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export</span>
                </button>

                <div className="pt-2 pb-1 px-3 text-[11px] font-semibold text-[#78827B] uppercase tracking-wider">
                  System
                </div>

                <button
                  onClick={() => handleNavClick('reports')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    activeNav === 'reports'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Reports</span>
                </button>

                <button
                  onClick={() => handleNavClick('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    activeNav === 'settings'
                      ? 'bg-[#E7F4EF] text-[#168568] font-semibold'
                      : 'text-[#78827B] hover:bg-[#F3F5F2] hover:text-[#202923]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="pt-4 border-t border-[#E5E9E5] space-y-2">
              <div className="flex items-center gap-3 p-2 bg-[#F7F8F5] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-[#E7F4EF] text-[#168568] font-bold text-xs flex items-center justify-center shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#202923] truncate">
                    {user?.username}
                  </div>
                  <div className="text-[10px] text-[#78827B] truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              {isVaultUnlocked && (
                <button
                  onClick={() => {
                    lockVault();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Vault</span>
                </button>
              )}

              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#E5E9E5] bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-subtle">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-[#202923] hover:bg-[#F3F5F2] rounded-xl md:hidden transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand / Page Title */}
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm sm:text-base font-bold text-[#202923] tracking-tight truncate">
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Zero Knowledge Security Pill */}
            <div className="hidden sm:flex items-center">
              {isVaultUnlocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E7F4EF] text-[#168568] border border-[#B7E3D6]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#168568] animate-pulse"></span>
                  Zero-Knowledge Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Lock className="w-3 h-3" />
                  Vault Locked
                </span>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#F3F5F2] transition-colors"
              >
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.username}
                    className="w-8 h-8 rounded-lg border border-[#B7E3D6] object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#E7F4EF] text-[#168568] font-bold text-xs flex items-center justify-center">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="text-left hidden lg:block max-w-[130px]">
                  <span className="text-xs font-semibold text-[#202923] block leading-tight truncate">
                    {user?.username || 'User'}
                  </span>
                  <span className="text-[10px] text-[#78827B] block leading-tight truncate">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#78827B]" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E9E5] rounded-2xl shadow-dropdown py-1.5 z-40 text-xs">
                    <div className="px-3.5 py-2.5 border-b border-[#E5E9E5]">
                      <p className="font-semibold text-[#202923] truncate">{user?.username}</p>
                      <p className="text-[11px] text-[#78827B] truncate">{user?.email}</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => {
                          handleNavClick('settings');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#202923] hover:bg-[#F3F5F2] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#78827B]" />
                        <span>My Profile & Settings</span>
                      </button>

                      {isVaultUnlocked && (
                        <button
                          onClick={() => {
                            lockVault();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span>Lock Vault</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 flex overflow-hidden min-w-0 bg-[#F7F8F5]">
          {children}
        </main>
      </div>

      <PasswordGeneratorModal
        isOpen={generatorModalOpen}
        onClose={() => setGeneratorModalOpen(false)}
        onSelectPassword={() => {}}
      />
    </div>
  );
};
