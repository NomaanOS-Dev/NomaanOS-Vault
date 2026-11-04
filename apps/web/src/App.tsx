import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
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
import { ShieldAlert, Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center text-[#78827B] text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-[#168568] mb-2" />
        <span className="font-medium">Checking secure session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F7F8F5]">
          <div className="w-16 h-16 bg-[#E7F4EF] border border-[#B7E3D6] rounded-2xl flex items-center justify-center text-[#168568] mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#202923] mb-2">Admin Console</h2>
          <p className="text-sm text-[#78827B] max-w-md">
            Organizational security policies, seat licenses, and tamper-evident audit logs.
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
            <Route path="/verify-email" element={<VerifyEmailPage />} />
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
