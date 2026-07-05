import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SyncStatus } from './services/cloudSync';
import type { User } from './services/authService';

/**
 * Contexto global: un contador de versión que las páginas incrementan tras
 * escribir en localStorage (para que la cabecera y el panel se refresquen), y
 * el estado de autenticación (usuario o invitado). Cuando hay sesión iniciada,
 * cada bump() también programa una subida a la nube con retraso (debounce).
 *
 * Firebase (auth + Firestore) se importa de forma diferida (import() dinámico)
 * para que los usuarios invitados —que nunca usan cuentas— no paguen el coste
 * de ese paquete en su carga inicial.
 */
interface AppState {
  version: number;
  bump: () => void;
  user: User | null;
  authReady: boolean;
  syncing: boolean;
  syncStatus: SyncStatus;
  retrySync: () => void;
}

const AppCtx = createContext<AppState>({
  version: 0,
  bump: () => {},
  user: null,
  authReady: false,
  syncing: false,
  syncStatus: 'idle',
  retrySync: () => {},
});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const userRef = useRef<User | null>(null);
  const cloudSyncRef = useRef<typeof import('./services/cloudSync') | null>(null);

  useEffect(() => {
    let unsubscribeSyncStatus: (() => void) | null = null;
    let cancelled = false;

    Promise.all([import('./services/authService'), import('./services/cloudSync')]).then(
      ([authService, cloudSync]) => {
        if (cancelled) return;
        cloudSyncRef.current = cloudSync;
        unsubscribeSyncStatus = cloudSync.subscribeSyncStatus(setSyncStatus);

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

    return () => {
      cancelled = true;
      unsubscribeSyncStatus?.();
    };
  }, []);

  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    cloudSyncRef.current?.scheduleCloudPush(userRef.current?.uid ?? null);
  }, []);

  const retrySync = useCallback(() => {
    cloudSyncRef.current?.retrySync();
  }, []);

  const value = useMemo(
    () => ({ version, bump, user, authReady, syncing, syncStatus, retrySync }),
    [version, bump, user, authReady, syncing, syncStatus, retrySync],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppState(): AppState {
  return useContext(AppCtx);
}
