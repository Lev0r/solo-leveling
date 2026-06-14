import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

function ensureApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(getFirebaseConfig());
  }
  return app;
}

function maybeConnectAuthEmulator(authClient: Auth): void {
  if (import.meta.env.VITE_USE_EMULATOR !== 'true' || authEmulatorConnected) {
    return;
  }
  connectAuthEmulator(authClient, 'http://localhost:9099', { disableWarnings: true });
  authEmulatorConnected = true;
}

function maybeConnectFirestoreEmulator(firestore: Firestore): void {
  if (import.meta.env.VITE_USE_EMULATOR !== 'true' || firestoreEmulatorConnected) {
    return;
  }
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  firestoreEmulatorConnected = true;
}

export function getAuthClient(): Auth {
  if (!auth) {
    auth = getAuth(ensureApp());
    maybeConnectAuthEmulator(auth);
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(ensureApp());
    maybeConnectFirestoreEmulator(db);
  }
  return db;
}
