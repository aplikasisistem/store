import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { initFirebaseService, deleteDocFromFirestore } from './firebase';
import { UserAccount, UserRole } from '../types';
import { storage } from './storage';

export async function createUserWithSync(
  name: string,
  email: string,
  pass: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const { isConfigured, db } = initFirebaseService();

  try {
    let uid = `user-${Date.now()}`;

    if (isConfigured && db) {
      // 1. Use Secondary Firebase App instance so Super Admin session is NOT overwritten or logged out
      const secondaryAppName = `SecondaryAdmin_${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      const secondaryDb = getFirestore(secondaryApp);

      try {
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, pass);
        uid = userCred.user.uid;

        // 2. Immediately write user profile document in Firestore at users/{uid}
        const userDocRef = doc(secondaryDb, 'users', uid);
        await setDoc(userDocRef, {
          id: uid,
          name: name.trim(),
          email: cleanEmail,
          role: role,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await signOut(secondaryAuth);
      } catch (fbErr: unknown) {
        console.warn('[Firebase] Secondary app account creation notice:', fbErr);
      }
    }

    // 3. Update local storage & primary Firestore doc
    const newUser: UserAccount = {
      id: uid,
      name: name.trim(),
      email: cleanEmail,
      role: role,
      password: pass,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    storage.updateUser(newUser);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function deleteUserWithSync(targetUser: UserAccount): Promise<{ success: boolean; error?: string }> {
  const { isConfigured, db } = initFirebaseService();

  try {
    // 1. Delete user document from Firestore at users/{uid}
    if (isConfigured && db) {
      await deleteDocFromFirestore('users', targetUser.id);
    }

    // 2. Delete from local storage
    storage.deleteUser(targetUser.id);

    // 3. Delete from Firebase Authentication via secondary app
    if (isConfigured && targetUser.email && targetUser.password) {
      try {
        const delAppName = `DeleteApp_${Date.now()}`;
        const delApp = initializeApp(firebaseConfig, delAppName);
        const delAuth = getAuth(delApp);
        await signInWithEmailAndPassword(delAuth, targetUser.email, targetUser.password);
        if (delAuth.currentUser) {
          await deleteUser(delAuth.currentUser);
        }
        await signOut(delAuth);
      } catch (authDelErr) {
        console.warn('[Firebase] Auth account deletion notice:', authDelErr);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
