import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is not a secret: it identifies the app, not a credential.
// Access control is enforced by Firebase Auth + Firestore security rules.
const firebaseConfig = {
  apiKey: 'AIzaSyDwQo8Px1pPmkgXVceL8U87wXRkhHGajeA',
  authDomain: 'ia-humanos-3d251e.firebaseapp.com',
  projectId: 'ia-humanos-3d251e',
  storageBucket: 'ia-humanos-3d251e.firebasestorage.app',
  messagingSenderId: '543274642464',
  appId: '1:543274642464:web:eb3d03c54944fe3f1be045',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
