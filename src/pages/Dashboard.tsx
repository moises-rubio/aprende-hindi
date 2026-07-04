import { Link } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import { SKILL_LABELS } from '../constants';
import { useAppState } from '../context';
import { LEVELS, getLevel } from '../data';
import {
  isLevelCertified,
  isLevelUnlocked,
  learningPath,
  overallProgress,
  skillProgress,
} from '../services/progress';
import { pendingCounts } from '../services/spacedRepetition';
import { getStreak } from '../services/streak';
import type { Skill } from '../types';

const SKILLS: Skill[] = ['vocabulary', 'grammar', 'listening', 'speaking'];

export default function Dashboard() {
  useAppState(); // re-render al cambiar el estado

  const streak = getStreak();
  const overall = overallProgress();
  const path = learningPath();
  const pending = pendingCounts();

  return (
    <main className="page">
      {/* Sección superior: racha visible sin desplazarse */}
      <section className="card streak-banner" aria-label="Tu racha de estudio">
        <span className="flame" aria-hidden="true">
          🔥
        </span>
        <div>
          <p className="streak-count">{streak.count} {streak.count === 1 ? 'día' : 'días'} de racha</p>
          <p className="muted">Mejor racha: {streak.best} · Practica cada día para no perderla.</p>
        </div>
        <Link className="btn btn-primary" to="/review">
          Repasar ({pending.total})
        </Link>
      </section>

      <section className="card" aria-label="Progreso general">
        <h2>Tu progreso</h2>
        <div className="overall-progress">
          <span className="overall-number">{overall}%</span>
          <span className="muted">progreso global (media ponderada de las 4 destrezas)</span>
        </div>
        {SKILLS.map((s) => (
          <ProgressBar key={s} label={SKILL_LABELS[s]} value={skillProgress(s)} />
        ))}
        <p className="muted">
          Repasos pendientes: {pending.vocab} de vocabulario · {pending.grammar} de gramática
        </p>
      </section>

      <section className="card" aria-label="Ruta de aprendizaje">
        <h2>Ruta de aprendizaje</h2>
        <ol className="path-list">
          {path.completed.map((m) => (
            <li key={m.id} className="path-item completed">
              <span aria-hidden="true">✅</span>{' '}
              <Link to={`/modules/${m.id}`}>
                {m.title} <span className="muted">({m.levelId})</span>
              </Link>
            </li>
          ))}
          {path.current && (
            <li className="path-item current">
              <span aria-hidden="true">▶️</span>{' '}
              <Link to={`/modules/${path.current.id}`}>
                <strong>
                  {path.current.title} <span className="muted">({path.current.levelId})</span>
                </strong>{' '}
                — en curso
              </Link>
            </li>
          )}
          {path.next.map((m) => (
            <li key={m.id} className="path-item upcoming">
              <span aria-hidden="true">🔜</span>{' '}
              <Link to={`/modules/${m.id}`}>
                {m.title} <span className="muted">({m.levelId})</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="card" aria-label="Niveles">
        <h2>Niveles</h2>
        <div className="level-grid">
          {LEVELS.map((lvl) => {
            const unlocked = isLevelUnlocked(lvl.id);
            const certified = isLevelCertified(lvl.id);
            return (
              <div key={lvl.id} className={`card level-card ${unlocked ? '' : 'locked'}`}>
                <h3>
                  {getLevel(lvl.id)?.title}{' '}
                  {certified ? '🎓' : unlocked ? '' : '🔒'}
                </h3>
                <p className="muted">{lvl.description}</p>
                {unlocked ? (
                  <Link className="btn" to={`/levels/${lvl.id}`}>
                    Ver módulos
                  </Link>
                ) : (
                  <p className="muted">Certifica el nivel anterior para desbloquear.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
