import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

interface FirebaseWebConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const configModules = import.meta.glob('/firebase-applet-config.json', {
  eager: true,
}) as Record<string, { default?: FirebaseWebConfig } | FirebaseWebConfig>;

const fileModule = configModules['/firebase-applet-config.json'];
const fileConfig: FirebaseWebConfig =
  fileModule && 'default' in fileModule && fileModule.default
    ? fileModule.default
    : (fileModule as FirebaseWebConfig) || {};

const firebaseConfig: FirebaseWebConfig = {
  apiKey: fileConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: fileConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: fileConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: fileConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: fileConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: fileConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let authInstance: Auth | null = null;
let providerInstance: GoogleAuthProvider | null = null;

if (isFirebaseEnabled) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  providerInstance = new GoogleAuthProvider();
}

export const auth = authInstance;
export const googleAuthProvider = providerInstance;
