import { doc, getDoc, setDoc } from 'firebase/firestore';
import { STORAGE_KEYS } from '../constants';
import { db } from './firebaseConfig';

const LOCAL_KEYS = Object.values(STORAGE_KEYS);

export type SyncStatus = 'idle' | 'syncing' | 'error';
type Listener = (status: SyncStatus) => void;
const listeners = new Set<Listener>();

export function subscribeSyncStatus(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify(status: SyncStatus): void {
  listeners.forEach((fn) => fn(status));
}

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
let lastUid: string | null = null;
const PUSH_DEBOUNCE_MS = 2000;

async function attemptPush(uid: string): Promise<void> {
  notify('syncing');
  try {
    await pushToCloud(uid);
    notify('idle');
  } catch {
    notify('error');
  }
}

/** Llamar tras cada cambio de progreso; sube a la nube con un pequeño retraso (debounce). */
export function scheduleCloudPush(uid: string | null): void {
  if (!uid) return;
  lastUid = uid;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => attemptPush(uid), PUSH_DEBOUNCE_MS);
}

/** Reintento manual desde la interfaz cuando la última subida falló. */
export function retrySync(): void {
  if (lastUid) attemptPush(lastUid);
}
