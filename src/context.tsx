import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SyncStatus } from './services/cloudSync';
import type { User } from './services/authService';

/** Marca local: el usuario ha usado (o intentado usar) una cuenta alguna vez. */
const AUTH_USED_KEY = 'hlp_auth_used';

/**
 * Contexto global: un contador de versión que las páginas incrementan tras
 * escribir en localStorage (para que la cabecera y el panel se refresquen), y
 * el estado de autenticación (usuario o invitado). Cuando hay sesión iniciada,
 * cada bump() también programa una subida a la nube con retraso (debounce).
 *
 * Firebase (auth + Firestore) se carga de forma diferida y SOLO si el usuario
 * ha usado cuentas alguna vez (o abre la página de acceso): los invitados
 * puros nunca descargan ese paquete y la app queda 100% sin conexión.
 */
interface AppState {
  version: number;
  bump: () => void;
  user: User | null;
  authReady: boolean;
  syncing: boolean;
  syncStatus: SyncStatus;
  retrySync: () => void;
  /** Carga Firebase Auth bajo demanda (la llama la página de acceso). */
  ensureAuthLoaded: () => void;
}

const AppCtx = createContext<AppState>({
  version: 0,
  bump: () => {},
  user: null,
  authReady: false,
  syncing: false,
  syncStatus: 'idle',
  retrySync: () => {},
  ensureAuthLoaded: () => {},
});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const userRef = useRef<User | null>(null);
  const cloudSyncRef = useRef<typeof import('./services/cloudSync') | null>(null);
  const loadStarted = useRef(false);

  const ensureAuthLoaded = useCallback(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    try {
      localStorage.setItem(AUTH_USED_KEY, '1');
    } catch {
      // sin almacenamiento disponible: seguimos igualmente
    }
    Promise.all([import('./services/authService'), import('./services/cloudSync')]).then(
      ([authService, cloudSync]) => {
        cloudSyncRef.current = cloudSync;
        cloudSync.subscribeSyncStatus(setSyncStatus);
        authService.subscribeAuth((u) => {
          userRef.current = u;
          setUser(u);
          setAuthReady(true);
          if (u) {
            setSyncing(true);
            cloudSync
              .syncOnLogin(u.uid)
              .catch(() => {})
              .finally(() => {
                setSyncing(false);
                setVersion((v) => v + 1);
              });
          }
        });
      },
    );
  }, []);

  useEffect(() => {
    let used: string | null = null;
    try {
      used = localStorage.getItem(AUTH_USED_KEY);
    } catch {
      used = null;
    }
    if (used) {
      ensureAuthLoaded();
    } else {
      // Invitado puro: no se carga Firebase; el estado "sin sesión" es definitivo.
      setAuthReady(true);
    }
  }, [ensureAuthLoaded]);

  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    cloudSyncRef.current?.scheduleCloudPush(userRef.current?.uid ?? null);
  }, []);

  const retrySync = useCallback(() => {
    cloudSyncRef.current?.retrySync();
  }, []);

  const value = useMemo(
    () => ({ version, bump, user, authReady, syncing, syncStatus, retrySync, ensureAuthLoaded }),
    [version, bump, user, authReady, syncing, syncStatus, retrySync, ensureAuthLoaded],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppState(): AppState {
  return useContext(AppCtx);
}
