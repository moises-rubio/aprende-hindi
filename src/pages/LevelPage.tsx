import { Link, useParams } from 'react-router-dom';
import { useAppState } from '../context';
import { getLevel, lessonsOfModule, modulesOfLevel } from '../data';
import {
  assessmentAvailability,
  canAttemptPlacement,
  isLessonCompleted,
  isLevelCertified,
  isLevelUnlocked,
  isModuleCompleted,
  isModuleUnlocked,
} from '../services/progress';
import type { LevelId } from '../types';

export default function LevelPage() {
  useAppState();
  const { levelId } = useParams<{ levelId: string }>();
  const level = levelId ? getLevel(levelId) : undefined;

  if (!level) {
    return (
      <main className="page">
        <p>Nivel no encontrado.</p>
        <Link className="btn" to="/">
          Volver al panel
        </Link>
      </main>
    );
  }

  const unlocked = isLevelUnlocked(level.id as LevelId);
  const certified = isLevelCertified(level.id as LevelId);
  const assessment = assessmentAvailability(level.id as LevelId);
  const modules = modulesOfLevel(level.id);

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to="/">← Panel</Link>
      </nav>
      <h1>
        {level.title} {certified && '🎓'}
      </h1>
      <p className="muted">{level.description}</p>

      {!unlocked && (
        <p className="card warning-card">
          🔒 Este nivel está bloqueado. Certifica el nivel anterior con su evaluación para acceder.
        </p>
      )}

      {unlocked && (
        <>
          <section aria-label="Módulos del nivel">
            {modules.map((m) => {
              const modUnlocked = isModuleUnlocked(m.id);
              const modCompleted = isModuleCompleted(m.id);
              const lessons = lessonsOfModule(m.id);
              const done = lessons.filter((l) => isLessonCompleted(l.id)).length;
              const placement = canAttemptPlacement(m.id);
              return (
                <div key={m.id} className={`card module-card ${modUnlocked ? '' : 'locked'}`}>
                  <div className="module-card-main">
                    <h3>
                      {modCompleted ? '✅' : modUnlocked ? '📖' : '🔒'} {m.title}
                    </h3>
                    <p className="muted">{m.description}</p>
                    <p className="muted">
                      {done}/{lessons.length} lecciones completadas
                    </p>
                  </div>
                  <div className="module-card-actions">
                    {modUnlocked && (
                      <Link className="btn btn-primary" to={`/modules/${m.id}`}>
                        {modCompleted ? 'Repasar módulo' : 'Continuar'}
                      </Link>
                    )}
                    {!modCompleted && placement.allowed && (
                      <Link className="btn" to={`/placement/${m.id}`}>
                        Test de ubicación
                      </Link>
                    )}
                    {!modCompleted && !placement.allowed && placement.reason && (
                      <p className="muted small">{placement.reason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="card assessment-card" aria-label="Evaluación de nivel">
            <h2>Evaluación de nivel {level.id}</h2>
            {certified ? (
              <p>🎓 Nivel certificado. ¡Enhorabuena!</p>
            ) : assessment.available ? (
              <>
                <p>
                  20 preguntas · 45 minutos · necesitas un 75% para certificar el nivel y desbloquear el
                  siguiente. No es posible hacer «test out» de esta evaluación.
                </p>
                <Link className="btn btn-primary" to={`/assessment/${level.id}`}>
                  Comenzar evaluación
                </Link>
              </>
            ) : (
              <p className="muted">{assessment.reason}</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
