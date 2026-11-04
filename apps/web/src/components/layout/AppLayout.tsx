import React, { useState, ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import {
  Shield,
  Send,
  Wrench,
  BarChart3,
  Settings,
  Lock,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans">
      {/* Primary Left Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between shrink-0 transition-all duration-200 select-none`}
      >
        <div>
          {/* Brand */}
          <div className="h-16 flex items-center px-4 border-b border-[#1e293b] gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/30">
              <Shield className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                  SecureVault
                </span>
                <span className="text-[10px] text-slate-400 block tracking-normal">
                  Password Manager
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {/* 1. Vaults */}
            <button
              onClick={() => setActiveNav('vaults')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'vaults'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-[#162036] hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Vaults</span>}
            </button>

            {/* 2. Send */}
            <button
              onClick={() => setActiveNav('send')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'send'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-[#162036] hover:text-white'
              }`}
            >
              <Send className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Send</span>}
            </button>

            {/* 3. Tools (Expandable) */}
            <div>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeNav.startsWith('tools')
                    ? 'text-blue-400'
                    : 'text-slate-300 hover:bg-[#162036] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>Tools</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      toolsOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {toolsOpen && !collapsed && (
                <div className="pl-9 pr-2 py-1 space-y-1 text-xs text-slate-400">
                  <button
                    onClick={() => setActiveNav('tools_generator')}
                    className={`w-full text-left py-1.5 px-2 rounded transition-colors ${
                      activeNav === 'tools_generator'
                        ? 'bg-blue-600/15 text-blue-400 font-medium'
                        : 'hover:text-white hover:bg-[#162036]'
                    }`}
                  >
                    Generator
                  </button>
                  <button
                    onClick={() => setActiveNav('tools_import')}
                    className={`w-full text-left py-1.5 px-2 rounded transition-colors ${
                      activeNav === 'tools_import'
                        ? 'bg-blue-600/15 text-blue-400 font-medium'
                        : 'hover:text-white hover:bg-[#162036]'
                    }`}
                  >
                    Import
                  </button>
                  <button
                    onClick={() => setActiveNav('tools_export')}
                    className={`w-full text-left py-1.5 px-2 rounded transition-colors ${
                      activeNav === 'tools_export'
                        ? 'bg-blue-600/15 text-blue-400 font-medium'
                        : 'hover:text-white hover:bg-[#162036]'
                    }`}
                  >
                    Export
                  </button>
                </div>
              )}
            </div>

            {/* 4. Reports */}
            <button
              onClick={() => setActiveNav('reports')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'reports'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-[#162036] hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Reports</span>}
            </button>

            {/* 5. Settings */}
            <button
              onClick={() => setActiveNav('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                activeNav === 'settings'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-[#162036] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </button>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-[#1e293b] space-y-2">
          {/* Password Manager App Pill */}
          <div className="bg-[#162036] border border-[#1f2e4d] rounded-lg px-3 py-2 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            {!collapsed && <span className="text-xs font-medium text-slate-200">Password Manager</span>}
          </div>

          {/* Admin Console Placeholder */}
          <button
            onClick={() => setActiveNav('admin')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-[#162036] transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Admin Console</span>}
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-300 hover:bg-[#162036] rounded transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#1e293b] bg-[#0c1322] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Vault Session:</span>
            {isVaultUnlocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Zero-Knowledge Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#162036] transition-colors"
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border border-blue-500/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <span className="text-xs font-semibold text-slate-200 block leading-tight">
                  {user?.username || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#131d31] border border-[#1f2e4d] rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-[#1f2e4d]">
                  <p className="font-semibold text-slate-200">{user?.username}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>

                {isVaultUnlocked && (
                  <button
                    onClick={() => {
                      lockVault();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-amber-400 hover:bg-[#162036] transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Lock Vault</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveNav('settings');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-[#162036] transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-[#162036] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </div>

      <PasswordGeneratorModal
        isOpen={generatorModalOpen}
        onClose={() => setGeneratorModalOpen(false)}
        onSelectPassword={() => {}}
      />
    </div>
  );
};
