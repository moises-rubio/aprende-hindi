import { useCallback, useEffect, useState } from 'react';
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

function Header() {
  useAppState();
  const streak = getStreak();
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
        </Routes>
      </div>
      <AchievementToaster />
    </AppStateProvider>
  );
}
