import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBSNPcLi6d6wNJks2tyPiMEP3q8DyYQnGU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ardent-runway-hn50x.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ardent-runway-hn50x",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ardent-runway-hn50x.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "804472875332",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:804472875332:web:c51542c36013271ae24f11"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Primary database ID configured in applet
const databaseId = "ai-studio-6e281c3e-fa41-4118-a88f-0cd3b033304f";

let dbInstance;
try {
  dbInstance = getFirestore(app, databaseId);
} catch (e) {
  console.warn("Falling back to default Firestore database", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const storage = getStorage(app);
