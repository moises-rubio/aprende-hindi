import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Contexto mínimo: un contador de versión que las páginas incrementan
 * tras escribir en localStorage para que la cabecera y el panel se refresquen.
 */
interface AppState {
  version: number;
  bump: () => void;
}

const AppCtx = createContext<AppState>({ version: 0, bump: () => {} });

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, bump }), [version, bump]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppState(): AppState {
  return useContext(AppCtx);
}
