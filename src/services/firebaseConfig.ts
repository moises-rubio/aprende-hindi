import { initializeApp } from 'firebase/app';
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check';
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

const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LeLOEUtAAAAAK0NInl8qLg-CSmVvp8NUyIusaKN';

export const firebaseApp = initializeApp(firebaseConfig);

// App Check: atestigua que las peticiones vienen de esta app real (anti-bots).
// En dev (vite) se usa un token de depuración en lugar de reCAPTCHA real.
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
