import { Link, useParams } from 'react-router-dom';
import LessonCard from '../components/LessonCard';
import { useAppState } from '../context';
import { getModule, lessonsOfModule } from '../data';
import {
  canAttemptPlacement,
  getLessonRecord,
  isLessonCompleted,
  isLessonUnlocked,
  isModuleCompleted,
  isModuleUnlocked,
} from '../services/progress';

export default function ModulePage() {
  useAppState();
  const { moduleId } = useParams<{ moduleId: string }>();
  const mod = moduleId ? getModule(moduleId) : undefined;

  if (!mod) {
    return (
      <main className="page">
        <p>Módulo no encontrado.</p>
        <Link className="btn" to="/">
          Volver al panel
        </Link>
      </main>
    );
  }

  const unlocked = isModuleUnlocked(mod.id);
  const completed = isModuleCompleted(mod.id);
  const placement = canAttemptPlacement(mod.id);
  const lessons = lessonsOfModule(mod.id);

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to={`/levels/${mod.levelId}`}>← Nivel {mod.levelId}</Link>
      </nav>
      <h1>
        {completed ? '✅' : ''} {mod.title}
      </h1>
      <p className="muted">{mod.description}</p>

      {!unlocked && (
        <div className="card warning-card">
          <p>🔒 Módulo bloqueado: completa el módulo anterior… o demuestra lo que sabes.</p>
          {placement.allowed ? (
            <Link className="btn btn-primary" to={`/placement/${mod.id}`}>
              Hacer test de ubicación (aprueba con 85%)
            </Link>
          ) : (
            <p className="muted">{placement.reason}</p>
          )}
        </div>
      )}

      {unlocked && !completed && placement.allowed && (
        <p className="card">
          ¿Ya conoces este contenido?{' '}
          <Link className="btn" to={`/placement/${mod.id}`}>
            Test de ubicación
          </Link>{' '}
          <span className="muted">(una vez al día; con 85% completas el módulo entero)</span>
        </p>
      )}

      <section className="lesson-grid" aria-label="Lecciones del módulo">
        {lessons.map((lesson) => {
          const done = isLessonCompleted(lesson.id);
          const available = isLessonUnlocked(lesson.id);
          return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              status={done ? 'completed' : available ? 'available' : 'locked'}
              score={getLessonRecord(lesson.id)?.score}
            />
          );
        })}
      </section>
    </main>
  );
}
