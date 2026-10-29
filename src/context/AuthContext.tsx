import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount } from '../types';
import { storage } from '../services/storage';
import { listenToDocument, loginWithFirebase } from '../services/firebase';

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string) => void;
  sessionRevokedMessage: string | null;
  clearSessionMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('pandir_current_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === 'object' && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  });

  const [sessionRevokedMessage, setSessionRevokedMessage] = useState<string | null>(null);

  // Monitor the logged in user in real-time across tabs / Firebase
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenToDocument<UserAccount>('users', currentUser.id, (updated) => {
      // Only logout if the document explicitly exists and its status is set to 'disabled' by Admin
      if (updated && updated.status === 'disabled') {
        logout('Akun Anda telah dinonaktifkan atau dihapus oleh Admin.');
      } else if (updated && updated.status === 'active') {
        // Update user state if name, role, or other fields changed
        setCurrentUser(updated);
        localStorage.setItem('pandir_current_user', JSON.stringify(updated));
      }
    });

    // Also listen to internal user update custom events
    const handleLocalUpdate = () => {
      const freshUsers = storage.getUsers();
      const matched = freshUsers.find((u) => u.id === currentUser.id);
      if (matched && matched.status === 'disabled') {
        logout('Akun Anda telah dinonaktifkan atau dihapus oleh Admin.');
      } else if (matched && matched.status === 'active') {
        setCurrentUser(matched);
        localStorage.setItem('pandir_current_user', JSON.stringify(matched));
      }
    };

    window.addEventListener('pandir_data_updated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('pandir_data_updated', handleLocalUpdate);
    };
  }, [currentUser?.id]);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setSessionRevokedMessage(null);
    try {
      const user = await loginWithFirebase(identifier, pass);
      setCurrentUser(user);
      localStorage.setItem('pandir_current_user', JSON.stringify(user));
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal masuk. Silakan periksa kredensial Anda.';
      return { success: false, error: errorMessage };
    }
  };

  const logout = (reason?: string) => {
    setCurrentUser(null);
    localStorage.removeItem('pandir_current_user');
    if (reason) {
      setSessionRevokedMessage(reason);
    }
  };

  const clearSessionMessage = () => setSessionRevokedMessage(null);

  const isAdmin = currentUser?.role === 'admin';
  const isAuthenticated = !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        sessionRevokedMessage,
        clearSessionMessage,
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
