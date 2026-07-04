import { doc, getDoc, setDoc } from 'firebase/firestore';
import { STORAGE_KEYS } from '../constants';
import { db } from './firebaseConfig';

const LOCAL_KEYS = Object.values(STORAGE_KEYS);

function readLocalState(): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const key of LOCAL_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        state[key] = JSON.parse(raw);
      } catch {
        // ignore malformed entries
      }
    }
  }
  return state;
}

function writeLocalState(state: Record<string, unknown>): void {
  for (const key of LOCAL_KEYS) {
    if (key in state) {
      localStorage.setItem(key, JSON.stringify(state[key]));
    }
  }
}

async function pushToCloud(uid: string): Promise<void> {
  const state = readLocalState();
  await setDoc(doc(db, 'hindi_progress', uid), { ...state, updatedAt: new Date().toISOString() });
}

/**
 * Al iniciar sesión: si ya existe progreso en la nube, ese progreso reemplaza
 * el local (permite continuar en cualquier dispositivo). Si es la primera vez
 * que este usuario inicia sesión, se sube el progreso local actual (modo
 * invitado) para no perder lo ya avanzado.
 */
export async function syncOnLogin(uid: string): Promise<void> {
  const snap = await getDoc(doc(db, 'hindi_progress', uid));
  if (snap.exists()) {
    writeLocalState(snap.data());
  } else {
    await pushToCloud(uid);
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 2000;

/** Llamar tras cada cambio de progreso; sube a la nube con un pequeño retraso (debounce). */
export function scheduleCloudPush(uid: string | null): void {
  if (!uid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushToCloud(uid).catch(() => {
      // fallo de red silencioso: el progreso local sigue intacto y se reintentará
      // en el siguiente cambio.
    });
  }, PUSH_DEBOUNCE_MS);
}
