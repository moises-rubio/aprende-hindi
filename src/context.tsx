import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { scheduleCloudPush, syncOnLogin } from './services/cloudSync';
import { subscribeAuth, type User } from './services/authService';

/**
 * Contexto global: un contador de versión que las páginas incrementan tras
 * escribir en localStorage (para que la cabecera y el panel se refresquen), y
 * el estado de autenticación (usuario o invitado). Cuando hay sesión iniciada,
 * cada bump() también programa una subida a la nube con retraso (debounce).
 */
interface AppState {
  version: number;
  bump: () => void;
  user: User | null;
  authReady: boolean;
  syncing: boolean;
}

const AppCtx = createContext<AppState>({ version: 0, bump: () => {}, user: null, authReady: false, syncing: false });

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth((u) => {
      userRef.current = u;
      setUser(u);
      setAuthReady(true);
      if (u) {
        setSyncing(true);
        syncOnLogin(u.uid)
          .catch(() => {})
          .finally(() => {
            setSyncing(false);
            setVersion((v) => v + 1);
          });
      }
    });
    return unsubscribe;
  }, []);

  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    scheduleCloudPush(userRef.current?.uid ?? null);
  }, []);

  const value = useMemo(
    () => ({ version, bump, user, authReady, syncing }),
    [version, bump, user, authReady, syncing],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppState(): AppState {
  return useContext(AppCtx);
}
