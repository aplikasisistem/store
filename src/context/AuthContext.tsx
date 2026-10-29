import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount } from '../types';
import { auth, db, initFirebaseService } from '../services/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc, onSnapshot } from 'firebase/firestore';

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

  // Background Cache-First Firestore Retrieval & Real-Time Sync with Auto-Creation of Missing Docs
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const { isConfigured, db: firestoreDb } = initFirebaseService();
    if (!isConfigured || !firestoreDb) return;

    const userDocRef = doc(firestoreDb, 'users', currentUser.id);

    // Try cache first asynchronously
    getDocFromCache(userDocRef)
      .then((cacheSnap) => {
        if (cacheSnap.exists()) {
          const data = cacheSnap.data() as Record<string, any>;
          if (data && data.status === 'active') {
            const emailLower = (data.email || currentUser.email || '').toLowerCase();
            const isSuperAdmin = emailLower === 'pandir@pandirstore.com' || emailLower === 'admin@pandirstore.com' || data.role?.toLowerCase() === 'admin';
            const updated: UserAccount = {
              id: cacheSnap.id,
              email: data.email || currentUser.email,
              name: data.name || currentUser.name,
              role: isSuperAdmin ? 'admin' : (data.role || 'kasir'),
              status: 'active',
              createdAt: data.createdAt || currentUser.createdAt,
            };
            setCurrentUser(updated);
            localStorage.setItem('pandir_current_user', JSON.stringify(updated));
          }
        }
      })
      .catch(() => {
        // Cache miss, rely on server snapshot
      });

    // Background onSnapshot listener with auto-creation if document is missing
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          // Automatically create default document in Firestore if missing
          const defaultProfile = {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role,
            status: 'active',
            createdAt: currentUser.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          try {
            await setDoc(userDocRef, defaultProfile, { merge: true });
          } catch (err) {
            console.warn('[AuthContext] Failed to auto-create missing user doc:', err);
          }
        } else {
          const data = snapshot.data() as Record<string, any>;
          if (data && data.status === 'disabled') {
            if (auth) {
              try {
                await signOut(auth);
              } catch {
                // ignore
              }
            }
            setCurrentUser(null);
            localStorage.removeItem('pandir_current_user');
            setSessionRevokedMessage('Akun Anda telah dinonaktifkan oleh Administrator.');
            return;
          }

          const emailLower = (data.email || currentUser.email || '').toLowerCase();
          const isSuperAdmin = emailLower === 'pandir@pandirstore.com' || emailLower === 'admin@pandirstore.com' || data.role?.toLowerCase() === 'admin';

          const updatedUser: UserAccount = {
            id: snapshot.id,
            email: data.email || currentUser.email,
            name: data.name || currentUser.name,
            role: isSuperAdmin ? 'admin' : (data.role || 'kasir'),
            status: data.status || 'active',
            createdAt: data.createdAt || currentUser.createdAt,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('pandir_current_user', JSON.stringify(updatedUser));
        }
      },
      (error) => {
        console.warn('[AuthContext] background snapshot error:', error);
      }
    );

    return () => {
      unsubscribeSnapshot();
    };
  }, [currentUser?.id]);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setSessionRevokedMessage(null);
    const cleanId = identifier.trim().toLowerCase();
    const emailToAuth = cleanId.includes('@') ? cleanId : `${cleanId}@pandirstore.com`;

    try {
      const { isConfigured, auth: firebaseAuth, db: firestoreDb } = initFirebaseService();

      if (!isConfigured || !firebaseAuth || !firestoreDb) {
        return { success: false, error: 'Firebase belum dikonfigurasi.' };
      }

      // Strict 2-second timeout guard for non-blocking sign-in
      const signInPromise = signInWithEmailAndPassword(firebaseAuth, emailToAuth, pass);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), 2000)
      );

      const cred = await Promise.race([signInPromise, timeoutPromise]) as Awaited<ReturnType<typeof signInWithEmailAndPassword>>;
      const authUser = cred.user;

      if (!authUser) {
        return { success: false, error: 'Akun tidak terdaftar di Firebase Auth.' };
      }

      const emailLower = (authUser.email || emailToAuth).toLowerCase();
      const isSuperAdmin = emailLower === 'pandir@pandirstore.com' || emailLower === 'admin@pandirstore.com';

      // Immediate non-blocking state commit & local storage for instant navigation under 1s
      const instantUser: UserAccount = {
        id: authUser.uid,
        email: authUser.email || emailToAuth,
        name: authUser.displayName || (isSuperAdmin ? 'Pemilik Toko (Admin Super)' : 'Kasir Toko'),
        role: isSuperAdmin ? 'admin' : 'kasir',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(instantUser);
      localStorage.setItem('pandir_current_user', JSON.stringify(instantUser));

      // Asynchronously fetch or auto-create profile from Firestore in the background
      const userDocRef = doc(firestoreDb, 'users', authUser.uid);
      getDoc(userDocRef)
        .then(async (docSnap) => {
          if (!docSnap.exists()) {
            // Automatically create default document in Firestore if it doesn't exist
            const defaultProfile = {
              id: authUser.uid,
              email: authUser.email || emailToAuth,
              name: instantUser.name,
              role: instantUser.role,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, defaultProfile, { merge: true });
          } else {
            const data = docSnap.data() as Record<string, any>;
            if (data && data.status === 'active') {
              const bgSuperAdmin = emailLower === 'pandir@pandirstore.com' || emailLower === 'admin@pandirstore.com' || data.role?.toLowerCase() === 'admin';
              const fullUser: UserAccount = {
                id: authUser.uid,
                email: authUser.email || data.email || emailToAuth,
                name: data.name || authUser.displayName || instantUser.name,
                role: bgSuperAdmin ? 'admin' : (data.role || 'kasir'),
                status: 'active',
                createdAt: data.createdAt || instantUser.createdAt,
              };
              setCurrentUser(fullUser);
              localStorage.setItem('pandir_current_user', JSON.stringify(fullUser));
            }
          }
        })
        .catch(() => {
          // Ignore background fetch/creation errors to prevent blocking
        });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Timeout') || msg.includes('timeout')) {
        return { success: false, error: 'Koneksi lambat atau timeout (2s).' };
      }
      return { success: false, error: 'Akun tidak terdaftar di Firebase Auth atau kata sandi salah.' };
    }
  };

  const logout = (reason?: string) => {
    if (auth) {
      signOut(auth).catch(() => {});
    }
    setCurrentUser(null);
    localStorage.removeItem('pandir_current_user');
    if (reason) {
      setSessionRevokedMessage(reason);
    }
  };

  const clearSessionMessage = () => setSessionRevokedMessage(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'pandir@pandirstore.com' || currentUser?.email?.toLowerCase() === 'admin@pandirstore.com';
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
