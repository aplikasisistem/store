import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  enableIndexedDbPersistence, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { getAuth, Auth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserAccount } from '../types';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let isFirestoreInitialized = false;

export function getActiveFirebaseConfig(): FirebaseConfig | null {
  // Check localStorage override first, then env variables
  try {
    const saved = localStorage.getItem('pandir_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) return parsed;
    }
  } catch {
    // Ignore storage parse error
  }

  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envApiKey !== 'AIzaSy...' && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef',
    };
  }

  return null;
}

export function initFirebaseService(): { 
  isConfigured: boolean; 
  db: Firestore | null; 
  auth: Auth | null; 
} {
  const config = getActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { isConfigured: false, db: null, auth: null };
  }

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }

    firestoreDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);

    if (!isFirestoreInitialized && typeof window !== 'undefined') {
      isFirestoreInitialized = true;
      enableIndexedDbPersistence(firestoreDb).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[Firebase] Multiple tabs open, persistence enabled in first tab only.');
        } else if (err.code === 'unimplemented') {
          console.warn('[Firebase] Current browser does not support IndexedDb persistence.');
        }
      });
    }

    return { isConfigured: true, db: firestoreDb, auth: firebaseAuth };
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    return { isConfigured: false, db: null, auth: null };
  }
}

/**
 * Real-time Document Listener with automatic fallback
 */
export function listenToDocument<T>(
  collectionName: string, 
  docId: string, 
  callback: (data: T | null) => void
): Unsubscribe {
  const { isConfigured, db } = initFirebaseService();
  if (isConfigured && db) {
    try {
      const docRef = doc(db, collectionName, docId);
      return onSnapshot(
        docRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as T);
          } else {
            callback(null);
          }
        }, 
        (err) => {
          console.warn(`[Firebase] doc listener error on ${collectionName}/${docId}:`, err);
        }
      );
    } catch (e) {
      console.warn('[Firebase] listener error:', e);
    }
  }

  // Fallback: Cross-tab localStorage event listener
  const handleStorage = (event: StorageEvent) => {
    if (event.key === `pandir_${collectionName}`) {
      try {
        const items = JSON.parse(event.newValue || '[]');
        const target = items.find((item: { id: string }) => item.id === docId);
        callback(target || null);
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

/**
 * Save / sync document to Firestore if active
 */
export async function syncDocToFirestore(collectionName: string, docId: string, data: Record<string, unknown>): Promise<boolean> {
  const { isConfigured, db } = initFirebaseService();
  if (!isConfigured || !db) return false;

  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[Firebase] sync error on ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Delete document from Firestore real-time if active
 */
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  const { isConfigured, db } = initFirebaseService();
  if (!isConfigured || !db) return false;

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[Firebase] delete error on ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Send transaction to Google Apps Script Webhook for Google Sheets
 */
export async function sendToGoogleSheetsWebhook(
  webhookUrl: string, 
  payload: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook Google Apps Script belum diisi.' };
  }

  try {
    // Mode no-cors is standard for Google Apps Script Web Apps when called from browser
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { 
      success: true, 
      message: 'Transaksi berhasil dikirim ke antrean Google Sheets.' 
    };
  } catch (err) {
    console.error('[GAS] Webhook Error:', err);
    return { 
      success: false, 
      message: `Gagal mengirim ke Google Sheets: ${err instanceof Error ? err.message : String(err)}` 
    };
  }
}

/**
 * Pure Firebase Auth & Firestore Profile Login
 */
export async function loginWithFirebase(
  identifier: string,
  pass: string
): Promise<UserAccount> {
  const cleanId = identifier.trim().toLowerCase();
  const { isConfigured, db, auth } = initFirebaseService();

  let targetEmail = cleanId;

  // 1. Resolve Username to Email if no '@' provided
  if (!cleanId.includes('@')) {
    let resolvedEmail: string | null = null;

    if (isConfigured && db) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', cleanId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const uDoc = snap.docs[0].data();
          if (uDoc.email) resolvedEmail = uDoc.email;
        }
      } catch (e) {
        console.warn('[Firebase] Username Firestore lookup error:', e);
      }
    }

    // Check local storage users cache if not resolved via Firestore
    if (!resolvedEmail && typeof window !== 'undefined') {
      try {
        const localUsers: UserAccount[] = JSON.parse(localStorage.getItem('pandir_users') || '[]');
        const matched = localUsers.find(
          (u) => (u.username && u.username.toLowerCase() === cleanId) || u.email.split('@')[0].toLowerCase() === cleanId
        );
        if (matched) {
          resolvedEmail = matched.email;
        }
      } catch {
        // ignore
      }
    }

    if (!resolvedEmail) {
      throw new Error('Email atau username tidak ditemukan.');
    }
    targetEmail = resolvedEmail.toLowerCase();
  }

  // 2. Perform Firebase Auth login if service is configured
  if (isConfigured && auth) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, pass);
      const authUser = userCredential.user;
      const emailLower = (authUser.email || targetEmail).toLowerCase();

      // Normalize inverted/spec-defined account roles
      let forcedRole: 'admin' | 'kasir' | null = null;
      if (emailLower === 'kasir@pandirstore.com' || authUser.uid === 'LFADLH8EjcOCZOqTLqBgdEKxodc2') {
        forcedRole = 'kasir';
      } else if (
        emailLower === 'pandir@pandirstore.com' || 
        emailLower === 'admin@pandirstore.com' || 
        authUser.uid === '7warlUHrREdfMvbLpccdrYgGBP83'
      ) {
        forcedRole = 'admin';
      }

      // 3. Fast retrieve user profile document with 1s timeout race
      let userProfile: UserAccount | null = null;
      if (db) {
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDocSnap = await Promise.race([
            getDoc(userDocRef),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
          ]);
          if (userDocSnap && userDocSnap.exists()) {
            const data = userDocSnap.data();
            userProfile = {
              id: authUser.uid,
              email: authUser.email || targetEmail,
              name: data.name || authUser.displayName || (forcedRole === 'admin' ? 'Pemilik Toko (Admin Super)' : 'Kasir Toko'),
              role: forcedRole || data.role || 'kasir',
              username: data.username,
              status: data.status || 'active',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt,
            };
          }
        } catch (err) {
          console.warn('[Firebase] Error reading user profile doc from Firestore:', err);
        }
      }

      // Fallback profile if Firestore doc fetch times out or doesn't exist yet
      if (!userProfile) {
        userProfile = {
          id: authUser.uid,
          email: authUser.email || targetEmail,
          name: authUser.displayName || (forcedRole === 'admin' ? 'Pemilik Toko (Admin Super)' : 'Kasir Toko'),
          role: forcedRole || 'kasir',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        if (db) {
          syncDocToFirestore('users', authUser.uid, userProfile as unknown as Record<string, unknown>);
        }
      } else if (forcedRole && userProfile.role !== forcedRole) {
        userProfile.role = forcedRole;
        if (db) {
          syncDocToFirestore('users', authUser.uid, { role: forcedRole });
        }
      }

      // 4. Verify account active status
      if (userProfile.status !== 'active') {
        await signOut(auth);
        throw new Error('Akun Anda tidak aktif. Silakan hubungi Administrator.');
      }

      return userProfile;
    } catch (err: unknown) {
      // Fallback credential matching for local/default accounts if Cloud Auth fails
      if (typeof window !== 'undefined') {
        const localUsers: UserAccount[] = JSON.parse(localStorage.getItem('pandir_users') || '[]');
        
        const defaultAccounts: UserAccount[] = [
          {
            id: '7warlUHrREdfMvbLpccdrYgGBP83',
            email: 'admin@pandirstore.com',
            name: 'Pemilik Toko (Admin Super)',
            role: 'admin',
            password: 'admin123',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: '7warlUHrREdfMvbLpccdrYgGBP83',
            email: 'pandir@pandirstore.com',
            name: 'Pemilik Toko (Admin Super)',
            role: 'admin',
            password: 'admin123',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'LFADLH8EjcOCZOqTLqBgdEKxodc2',
            email: 'kasir@pandirstore.com',
            name: 'Kasir Toko',
            role: 'kasir',
            password: 'kasir123',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ];

        const allUsers = [...localUsers, ...defaultAccounts];
        const matched = allUsers.find(
          (u) =>
            u.email.toLowerCase() === targetEmail ||
            (u.username && u.username.toLowerCase() === cleanId) ||
            u.email.split('@')[0].toLowerCase() === cleanId
        );

        if (matched) {
          if (matched.status === 'disabled') {
            throw new Error('Akun Anda tidak aktif. Silakan hubungi Administrator.');
          }
          if (matched.password && matched.password === pass) {
            const { password, ...safeUser } = matched;
            return safeUser as UserAccount;
          }
        }
      }

      if (err instanceof Error) {
        if (
          err.message === 'Email atau username tidak ditemukan.' ||
          err.message === 'Akun Anda tidak aktif. Silakan hubungi Administrator.'
        ) {
          throw err;
        }

        const code = (err as { code?: string }).code || '';
        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/wrong-password' ||
          code === 'auth/user-not-found' ||
          code === 'auth/invalid-email'
        ) {
          throw new Error('Email/Username atau Kata Sandi salah.');
        } else if (code === 'auth/too-many-requests') {
          throw new Error('Terlalu banyak percobaan login yang gagal. Silakan coba lagi nanti.');
        } else if (code === 'auth/network-request-failed') {
          throw new Error('Gagal terhubung ke server Firebase. Periksa koneksi internet Anda.');
        } else {
          throw new Error(err.message || 'Gagal masuk. Silakan periksa kredensial Anda.');
        }
      }

      throw new Error('Terjadi kesalahan saat otentikasi. Silakan coba lagi.');
    }
  }

  // 5. Offline fallback if Firebase Auth is not configured
  if (typeof window !== 'undefined') {
    const localUsers: UserAccount[] = JSON.parse(localStorage.getItem('pandir_users') || '[]');
    const matched = localUsers.find(
      (u) => u.email.toLowerCase() === targetEmail || (u.username && u.username.toLowerCase() === cleanId)
    );
    if (!matched) {
      throw new Error('Email/Username atau Kata Sandi salah.');
    }
    if (matched.status === 'disabled') {
      throw new Error('Akun Anda tidak aktif. Silakan hubungi Administrator.');
    }
    if (matched.password && matched.password !== pass) {
      throw new Error('Email/Username atau Kata Sandi salah.');
    }
    return matched;
  }

  throw new Error('Sistem autentikasi tidak tersedia.');
}

