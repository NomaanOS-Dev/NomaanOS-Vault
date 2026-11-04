import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@pwm/shared';
import { api } from '../services/api';

interface AuthContextType {
  user: (UserProfile & { vaultId?: string; keyMetadata?: any }) | null;
  loading: boolean;
  error: string | null;
  googleConfigured: boolean;
  googleClientId: string | null;
  loginWithGoogle: (idToken: string) => Promise<void>;
  devLogin: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { username?: string; onboardingDismissed?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(UserProfile & { vaultId?: string; keyMetadata?: any }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  const checkConfig = async () => {
    try {
      const config = await api.getAuthConfig();
      setGoogleConfigured(config.googleConfigured);
      setGoogleClientId(config.googleClientId);
    } catch (err: any) {
      console.warn('Could not fetch auth configuration:', err.message);
    }
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      const data = await api.getCurrentUser();
      setUser(data.user);
      setError(null);
    } catch (err: any) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConfig();
    refreshUser();
  }, []);

  const loginWithGoogle = async (idToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.loginWithGoogle(idToken);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const devLogin = async (email: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.devLogin(email, name);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Developer sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  const updateProfile = async (data: { username?: string; onboardingDismissed?: boolean }) => {
    const res = await api.updateProfile(data);
    setUser((prev) => (prev ? { ...prev, ...res.user } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        googleConfigured,
        googleClientId,
        loginWithGoogle,
        devLogin,
        logout,
        updateProfile,
        refreshUser,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

