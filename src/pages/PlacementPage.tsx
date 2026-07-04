import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ExerciseRunner from '../components/exercises/ExerciseRunner';
import { PASS_PLACEMENT, PLACEMENT_TESTOUT_SR_INDEX, WEAK_LESSON_THRESHOLD } from '../constants';
import { useAppState } from '../context';
import { getLesson, getModule, lessonsOfModule } from '../data';
import { generatePlacement } from '../services/exerciseEngine';
import type { AssessmentQuestion } from '../services/exerciseEngine';
import {
  canAttemptPlacement,
  recordPlacementAttempt,
  testOutModule,
  addWordsToBank,
} from '../services/progress';
import { addItems } from '../services/spacedRepetition';
import type { ExerciseResult } from '../types';

type Phase = 'intro' | 'running' | 'passed' | 'failed';

export default function PlacementPage() {
  const { bump } = useAppState();
  const { moduleId } = useParams<{ moduleId: string }>();
  const mod = moduleId ? getModule(moduleId) : undefined;

  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [score, setScore] = useState(0);
  const [weakLessons, setWeakLessons] = useState<string[]>([]);

  const attempt = useMemo(
    () => (mod ? canAttemptPlacement(mod.id) : { allowed: false, reason: null }),
    [mod?.id, phase],
  );

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

  const start = () => {
    setQuestions(generatePlacement(mod.id));
    setPhase('running');
  };

  const handleFinish = (results: ExerciseResult[]) => {
    // El intento cuenta al enviar el test (una vez por día de calendario y módulo).
    recordPlacementAttempt(mod.id);

    const byId = new Map(results.map((r) => [r.exercise.id, r.correct]));
    const perLesson = new Map<string, { total: number; correct: number }>();
    let correct = 0;
    for (const q of questions) {
      const ok = byId.get(q.exercise.id) === true;
      const agg = perLesson.get(q.lessonId) ?? { total: 0, correct: 0 };
      agg.total += 1;
      if (ok) {
        agg.correct += 1;
        correct += 1;
      }
      perLesson.set(q.lessonId, agg);
    }
    const pct = Math.round((correct / (questions.length || 1)) * 100);
    setScore(pct);

    if (pct >= PASS_PLACEMENT) {
      // Aprobado: lecciones completadas, siguiente módulo desbloqueado,
      // vocabulario al banco y repetición espaciada a 7 días.
      testOutModule(mod.id);
      const vocabIds = [...new Set(lessonsOfModule(mod.id).flatMap((l) => l.vocabIds))];
      addWordsToBank(vocabIds);
      addItems(vocabIds, 'vocab', PLACEMENT_TESTOUT_SR_INDEX);
      const topics = lessonsOfModule(mod.id)
        .map((l) => l.grammarTopicId)
        .filter((t): t is string => !!t);
      addItems(topics, 'grammar', PLACEMENT_TESTOUT_SR_INDEX);
      setPhase('passed');
    } else {
      const weak = [...perLesson.entries()]
        .filter(([, agg]) => (agg.correct / agg.total) * 100 < WEAK_LESSON_THRESHOLD)
        .map(([lessonId]) => lessonId);
      setWeakLessons(weak);
      setPhase('failed');
    }
    bump();
  };

  const firstWeak = weakLessons.length > 0 ? getLesson(weakLessons[0]) : undefined;

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to={`/modules/${mod.id}`}>← {mod.title}</Link>
      </nav>
      <h1>Test de ubicación: {mod.title}</h1>

      {phase === 'intro' && (
        <section className="card">
          {attempt.allowed ? (
            <>
              <p>
                Mínimo 10 preguntas muestreadas proporcionalmente de las lecciones del módulo. Si obtienes{' '}
                <strong>{PASS_PLACEMENT}% o más</strong>, todas las lecciones se marcan como completadas,
                se desbloquea el siguiente módulo y el vocabulario entra en repaso espaciado a 7 días.
              </p>
              <p className="muted">
                Solo un intento por día de calendario y módulo. Las evaluaciones de nivel no admiten test
                de ubicación.
              </p>
              <button type="button" className="btn btn-primary btn-big" onClick={start}>
                Comenzar test
              </button>
            </>
          ) : (
            <p className="muted">{attempt.reason ?? 'Test no disponible.'}</p>
          )}
        </section>
      )}

      {phase === 'running' && (
        <ExerciseRunner exercises={questions.map((q) => q.exercise)} onFinish={handleFinish} />
      )}

      {phase === 'passed' && (
        <section className="card result-card pass">
          <h2>🏁 ¡Módulo superado!</h2>
          <p className="overall-number">{score}%</p>
          <p>
            Todas las lecciones de «{mod.title}» quedan completadas y el siguiente módulo está
            desbloqueado. El vocabulario se añadió a tu banco con repaso en 7 días.
          </p>
          <Link className="btn btn-primary" to={`/levels/${mod.levelId}`}>
            Volver al nivel
          </Link>
        </section>
      )}

      {phase === 'failed' && (
        <section className="card result-card fail">
          <h2>No alcanzaste el {PASS_PLACEMENT}%</h2>
          <p className="overall-number">{score}%</p>
          {weakLessons.length > 0 ? (
            <>
              <p>Lecciones con puntuación baja (&lt;{WEAK_LESSON_THRESHOLD}%):</p>
              <ul className="topic-list">
                {weakLessons.map((id) => {
                  const l = getLesson(id);
                  return l ? <li key={id}>{l.title}</li> : null;
                })}
              </ul>
              {firstWeak && (
                <p>
                  Te recomendamos empezar por:{' '}
                  <Link className="btn btn-primary" to={`/lessons/${firstWeak.id}`}>
                    {firstWeak.title}
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p>Repasa las lecciones del módulo y vuelve a intentarlo mañana.</p>
          )}
          <Link className="btn" to={`/modules/${mod.id}`}>
            Volver al módulo
          </Link>
        </section>
      )}
    </main>
  );
}
