import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ExerciseRunner from '../components/exercises/ExerciseRunner';
import { findExerciseById } from '../services/exerciseEngine';

/** Página de un ejercicio individual (enlace directo /exercises/:exerciseId). */
export default function ExercisePage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const exercise = useMemo(() => (exerciseId ? findExerciseById(exerciseId) : undefined), [exerciseId]);
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState(false);

  if (!exercise) {
    return (
      <main className="page">
        <p>Ejercicio no encontrado.</p>
        <Link className="btn" to="/">
          Volver al panel
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to={`/lessons/${exercise.lessonId}`}>← Volver a la lección</Link>
      </nav>
      <h1>Ejercicio suelto</h1>
      {!done ? (
        <ExerciseRunner
          exercises={[exercise]}
          onFinish={(results) => {
            setCorrect(results[0]?.correct ?? false);
            setDone(true);
          }}
        />
      ) : (
        <section className="card result-card">
          <h2>{correct ? '✅ ¡Correcto!' : '❌ Incorrecto'}</h2>
          <Link className="btn btn-primary" to={`/lessons/${exercise.lessonId}`}>
            Ir a la lección completa
          </Link>
        </section>
      )}
    </main>
  );
}
