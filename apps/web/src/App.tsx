import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { LoginPage } from './pages/LoginPage';
import { MasterPasswordSetupPage } from './pages/MasterPasswordSetupPage';
import { VaultsDashboardPage } from './pages/VaultsDashboardPage';
import { SendDashboardPage } from './pages/SendDashboardPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { ImportPage } from './pages/ImportPage';
import { ExportPage } from './pages/ExportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublicSendRecipientPage } from './pages/PublicSendRecipientPage';
import { AppLayout } from './components/layout/AppLayout';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center text-slate-400 text-sm">
        <span className="inline-block animate-spin mr-2">⚙️</span>
        Checking secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.hasMasterPassword) {
    return <Navigate to="/setup-master-password" replace />;
  }

  return <>{children}</>;
};

const DashboardContainer: React.FC = () => {
  const [activeNav, setActiveNav] = useState('vaults');

  return (
    <AppLayout activeNav={activeNav} setActiveNav={setActiveNav}>
      {activeNav === 'vaults' && (
        <VaultsDashboardPage onNavigateToImport={() => setActiveNav('tools_import')} />
      )}
      {activeNav === 'send' && <SendDashboardPage />}
      {activeNav === 'tools_generator' && <GeneratorPage />}
      {activeNav === 'tools_import' && <ImportPage />}
      {activeNav === 'tools_export' && <ExportPage />}
      {activeNav === 'reports' && <ReportsPage />}
      {activeNav === 'settings' && <SettingsPage />}

      {activeNav === 'admin' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0a0f1d]">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Admin Console</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Organizational policies and audit logs.
          </p>
        </div>
      )}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VaultProvider>
          <Routes>
            {/* Public Unauthenticated Send Recipient Route */}
            <Route path="/send/:token" element={<PublicSendRecipientPage />} />

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup-master-password" element={<MasterPasswordSetupPage />} />

            {/* Authenticated Application */}
            <Route
              path="/vaults"
              element={
                <ProtectedRoute>
                  <DashboardContainer />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/vaults" replace />} />
          </Routes>
        </VaultProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
