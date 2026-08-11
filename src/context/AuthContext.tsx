import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { isAdminEmail } from '../lib/admin';

interface AuthContextType {
  user: User | { uid: string; email: string | null; displayName: string | null; photoURL?: string } | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithDevAccount: (email: string, displayName?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  authError: string | null;
  isUnauthorizedDomainError: boolean;
  currentDomain: string;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUnauthorizedDomainError, setIsUnauthorizedDomainError] = useState<boolean>(false);
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const adminStatus = isAdminEmail(currentUser.email);
        setIsAdmin(adminStatus);

        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);

          const profileData: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            photoURL: currentUser.photoURL || undefined,
            role: adminStatus ? 'admin' : 'user',
            createdAt: userSnap.exists() ? userSnap.data().createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await setDoc(userRef, {
            ...profileData,
            lastLoginAt: serverTimestamp()
          }, { merge: true });

          setUserProfile(profileData);
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      } else {
        // Check for local dev user session fallback
        const savedDevUser = localStorage.getItem('ak_star_dev_user');
        if (savedDevUser) {
          try {
            const devData = JSON.parse(savedDevUser);
            setUser(devData);
            const adminStatus = isAdminEmail(devData.email);
            setIsAdmin(adminStatus);

            const profileData: UserProfile = {
              uid: devData.uid,
              email: devData.email || '',
              displayName: devData.displayName || 'Dev User',
              role: adminStatus ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setUserProfile(profileData);
          } catch (e) {
            localStorage.removeItem('ak_star_dev_user');
            setUser(null);
            setUserProfile(null);
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setIsUnauthorizedDomainError(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed the popup window, treat gracefully as cancellation without error modal
        console.info('Sign-in popup closed by user.');
        return;
      }
      
      console.error('Google Sign In Error:', error);
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setAuthError('Popup was blocked and redirect failed. Please allow popups for login.');
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        setIsUnauthorizedDomainError(true);
        setAuthError(`Domain "${currentDomain}" is not authorized in Firebase Console.`);
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your internet connection.');
      } else {
        setAuthError(error.message || 'Failed to sign in with Google');
      }
    }
  };

  const signInWithDevAccount = async (email: string, displayName?: string) => {
    setAuthError(null);
    setIsUnauthorizedDomainError(false);
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const uid = `dev_${btoa(sanitizedEmail).replace(/[^a-zA-Z0-9]/g, '')}`;
      const devUserData = {
        uid,
        email: sanitizedEmail,
        displayName: displayName || sanitizedEmail.split('@')[0],
      };

      localStorage.setItem('ak_star_dev_user', JSON.stringify(devUserData));
      setUser(devUserData);
      const adminStatus = isAdminEmail(sanitizedEmail);
      setIsAdmin(adminStatus);

      const profileData: UserProfile = {
        uid,
        email: sanitizedEmail,
        displayName: devUserData.displayName,
        role: adminStatus ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
          ...profileData,
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.warn('Dev account firestore sync warning:', err);
      }

      setUserProfile(profileData);
    } catch (err: any) {
      setAuthError('Failed to sign in with email: ' + (err.message || String(err)));
    }
  };

  const signOutUser = async () => {
    try {
      localStorage.removeItem('ak_star_dev_user');
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
    setIsUnauthorizedDomainError(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAdmin,
      loading,
      signInWithGoogle,
      signInWithDevAccount,
      signOutUser,
      authError,
      isUnauthorizedDomainError,
      currentDomain,
      clearAuthError
    }}>
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
