import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import AchievementNotification from './components/AchievementNotification';
import { AppStateProvider, useAppState } from './context';
import AchievementsPage from './pages/AchievementsPage';
import AssessmentPage from './pages/AssessmentPage';
import Dashboard from './pages/Dashboard';
import ExercisePage from './pages/ExercisePage';
import GrammarPage from './pages/GrammarPage';
import GrammarTopicPage from './pages/GrammarTopicPage';
import LessonPage from './pages/LessonPage';
import LevelPage from './pages/LevelPage';
import ModulePage from './pages/ModulePage';
import PlacementPage from './pages/PlacementPage';
import ReviewPage from './pages/ReviewPage';
import VocabularyPage from './pages/VocabularyPage';
import { subscribeAchievements } from './services/achievements';
import { getStreak } from './services/streak';
import type { AchievementDef } from './types';

// Cargada de forma diferida: evita que los usuarios invitados (sin cuenta)
// descarguen el SDK de Firebase en el paquete principal.
const LoginPage = lazy(() => import('./pages/LoginPage'));

function SyncBanner() {
  const { syncStatus, retrySync } = useAppState();
  if (syncStatus !== 'error') return null;
  return (
    <div className="sync-banner" role="alert">
      <span>⚠️ No se pudo guardar tu progreso en la nube.</span>
      <button type="button" className="btn btn-small" onClick={retrySync}>
        Reintentar
      </button>
    </div>
  );
}

function Header() {
  const { user, authReady, syncing } = useAppState();
  const streak = getStreak();

  const handleLogout = () => {
    import('./services/authService').then((m) => m.logout());
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <NavLink to="/" className="logo" aria-label="Aprende Hindi, ir al panel">
          🪷 Aprende Hindi
        </NavLink>
        <nav className="main-nav" aria-label="Navegación principal">
          <NavLink to="/" end>
            Panel
          </NavLink>
          <NavLink to="/vocabulary">Vocabulario</NavLink>
          <NavLink to="/grammar">Gramática</NavLink>
          <NavLink to="/review">Repaso</NavLink>
          <NavLink to="/achievements">Logros</NavLink>
        </nav>
        <span className="header-streak" aria-label={`Racha actual: ${streak.count} días`}>
          🔥 {streak.count}
        </span>
        {/* No renderizar el estado de cuenta hasta que Firebase confirme si hay sesión,
            para evitar un parpadeo de "Iniciar sesión" -> cuenta en cada carga. */}
        {authReady &&
          (user ? (
            <span className="header-account">
              {syncing && <span className="muted small">Sincronizando…</span>}
              <span className="muted small header-email">{user.email}</span>
              <button type="button" className="btn btn-small" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </span>
          ) : (
            <NavLink to="/login" className="btn btn-small">
              Iniciar sesión
            </NavLink>
          ))}
      </div>
    </header>
  );
}

/** Cola de notificaciones de logros (superpuestas, mínimo 5 s cada una). */
function AchievementToaster() {
  const [queue, setQueue] = useState<AchievementDef[]>([]);

  useEffect(() => {
    return subscribeAchievements((a) => {
      setQueue((q) => (q.some((x) => x.id === a.id) ? q : [...q, a]));
    });
  }, []);

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);

  if (queue.length === 0) return null;
  return <AchievementNotification achievement={queue[0]} onDismiss={dismiss} />;
}

export default function App() {
  return (
    <AppStateProvider>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <Header />
      <SyncBanner />
      <div id="contenido">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/levels/:levelId" element={<LevelPage />} />
          <Route path="/modules/:moduleId" element={<ModulePage />} />
          <Route path="/lessons/:lessonId" element={<LessonPage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/grammar/:topicId" element={<GrammarTopicPage />} />
          <Route path="/exercises/:exerciseId" element={<ExercisePage />} />
          <Route path="/assessment/:levelId" element={<AssessmentPage />} />
          <Route path="/placement/:moduleId" element={<PlacementPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route
            path="/login"
            element={
              <Suspense fallback={<main className="page">Cargando…</main>}>
                <LoginPage />
              </Suspense>
            }
          />
        </Routes>
      </div>
      <AchievementToaster />
    </AppStateProvider>
  );
}
