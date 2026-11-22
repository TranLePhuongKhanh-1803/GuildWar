import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.includes('your_api_key')
);

let app = null;
let db = null;
let storage = null;
let auth = null;
let firebaseInitError = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  } catch (err) {
    firebaseInitError = err;
  }
}

export { app, db, storage, auth, firebaseInitError };
