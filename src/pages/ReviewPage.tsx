import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ExerciseRunner, { scorePercent } from '../components/exercises/ExerciseRunner';
import { useAppState } from '../context';
import { generateReviewExercise } from '../services/exerciseEngine';
import { getDueItems, review } from '../services/spacedRepetition';
import type { Exercise, ExerciseResult } from '../types';

type Phase = 'intro' | 'running' | 'done';

export default function ReviewPage() {
  const { bump } = useAppState();
  const [phase, setPhase] = useState<Phase>('intro');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [itemByExercise, setItemByExercise] = useState<Map<string, string>>(new Map());
  const [finalScore, setFinalScore] = useState(0);

  const due = useMemo(() => getDueItems(), [phase]);

  const start = () => {
    const seed = String(Date.now());
    const map = new Map<string, string>();
    const exs: Exercise[] = [];
    for (const item of due) {
      const ex = generateReviewExercise(item, seed);
      if (ex) {
        exs.push(ex);
        map.set(ex.id, item.id);
      }
    }
    setExercises(exs);
    setItemByExercise(map);
    setPhase('running');
  };

  const handleEachAnswer = (exercise: Exercise, correct: boolean) => {
    const itemId = itemByExercise.get(exercise.id);
    // Correcto => siguiente intervalo (1→3→7→14→30); incorrecto => vuelve a 1 día.
    if (itemId) review(itemId, correct);
  };

  const handleFinish = (results: ExerciseResult[]) => {
    setFinalScore(scorePercent(results));
    bump();
    setPhase('done');
  };

  return (
    <main className="page">
      <h1>Repaso espaciado</h1>

      {phase === 'intro' && (
        <section className="card">
          {due.length === 0 ? (
            <>
              <p>🎉 No tienes repasos pendientes hoy.</p>
              <p className="muted">
                Los elementos vuelven según los intervalos 1 → 3 → 7 → 14 → 30 días. Completa lecciones
                para añadir palabras y temas a tu plan de repaso.
              </p>
              <Link className="btn btn-primary" to="/">
                Volver al panel
              </Link>
            </>
          ) : (
            <>
              <p>
                Tienes <strong>{due.length}</strong> elementos pendientes de repaso (
                {due.filter((d) => d.kind === 'vocab').length} de vocabulario,{' '}
                {due.filter((d) => d.kind === 'grammar').length} de gramática).
              </p>
              <p className="muted">
                Acertar avanza el elemento al siguiente intervalo; fallar lo devuelve a 1 día.
              </p>
              <button type="button" className="btn btn-primary btn-big" onClick={start}>
                Comenzar repaso
              </button>
            </>
          )}
        </section>
      )}

      {phase === 'running' && (
        <ExerciseRunner exercises={exercises} onFinish={handleFinish} onEachAnswer={handleEachAnswer} />
      )}

      {phase === 'done' && (
        <section className="card result-card pass">
          <h2>Repaso terminado</h2>
          <p className="overall-number">{finalScore}%</p>
          <p>Los intervalos de repaso se han actualizado.</p>
          <Link className="btn btn-primary" to="/">
            Volver al panel
          </Link>
        </section>
      )}
    </main>
  );
}
