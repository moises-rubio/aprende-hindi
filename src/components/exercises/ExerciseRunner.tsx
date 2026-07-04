import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../../context';
import { onExerciseAnswered, onStreakUpdated } from '../../services/achievements';
import { correctAnswerText } from '../../services/exerciseEngine';
import { recordWordResult } from '../../services/progress';
import { recordActivity } from '../../services/streak';
import type { Exercise, ExerciseResult } from '../../types';
import FillBlank from './FillBlank';
import FreeText from './FreeText';
import MatchingPairs from './MatchingPairs';
import MultipleChoice from './MultipleChoice';

interface Props {
  exercises: Exercise[];
  onFinish: (results: ExerciseResult[]) => void;
  /** Retroalimentación extra por respuesta (repaso espaciado, etc.). */
  onEachAnswer?: (exercise: Exercise, correct: boolean) => void;
  /** Al ponerse a true (temporizador agotado) se envía todo: lo no respondido cuenta como incorrecto. */
  forceFinish?: boolean;
}

/**
 * Orquesta una sesión de ejercicios: uno a uno, con retroalimentación
 * inmediata (< 2 s) y explicación al fallar (respuesta correcta incluida).
 */
export default function ExerciseRunner({ exercises, onFinish, onEachAnswer, forceFinish }: Props) {
  const { bump } = useAppState();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const finished = useRef(false);
  const resultsRef = useRef<ExerciseResult[]>([]);
  resultsRef.current = results;

  const current = exercises[index];
  const answered = lastCorrect !== null;

  useEffect(() => {
    if (forceFinish && !finished.current) {
      finished.current = true;
      const done = resultsRef.current;
      const remaining = exercises
        .slice(done.length)
        .map((exercise) => ({ exercise, correct: false }));
      onFinish([...done, ...remaining]);
    }
  }, [forceFinish, exercises, onFinish]);

  if (!current) return null;

  const handleAnswer = (correct: boolean) => {
    if (answered || finished.current) return;
    setLastCorrect(correct);
    const next = [...results, { exercise: current, correct }];
    setResults(next);

    // Efectos de gamificación: cualquier respuesta cuenta para la racha.
    const streak = recordActivity();
    onStreakUpdated(streak.count);
    onExerciseAnswered(correct, !!current.wordId);
    if (current.wordId) recordWordResult(current.wordId, correct);
    onEachAnswer?.(current, correct);
    bump();
  };

  const advance = () => {
    setLastCorrect(null);
    if (index + 1 >= exercises.length) {
      if (!finished.current) {
        finished.current = true;
        onFinish(resultsRef.current);
      }
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="exercise-runner">
      <p className="muted" aria-live="polite">
        Ejercicio {index + 1} de {exercises.length}
      </p>
      <div className="card exercise-card">
        {current.type === 'multiple-choice' && (
          <MultipleChoice key={current.id} exercise={current} answered={answered} onAnswer={handleAnswer} />
        )}
        {current.type === 'fill-blank' && (
          <FillBlank key={current.id} exercise={current} answered={answered} onAnswer={handleAnswer} />
        )}
        {current.type === 'matching' && (
          <MatchingPairs key={current.id} exercise={current} answered={answered} onAnswer={handleAnswer} />
        )}
        {current.type === 'free-text' && (
          <FreeText key={current.id} exercise={current} answered={answered} onAnswer={handleAnswer} />
        )}

        {answered && (
          <div
            className={`feedback ${lastCorrect ? 'feedback-correct' : 'feedback-wrong'}`}
            role="status"
            aria-live="assertive"
          >
            {lastCorrect ? (
              <p className="feedback-title">✅ ¡Correcto!</p>
            ) : (
              <>
                <p className="feedback-title">❌ Incorrecto</p>
                <p>
                  Respuesta correcta: <strong className="hindi-text">{correctAnswerText(current)}</strong>
                </p>
                <p>{current.explanation}</p>
              </>
            )}
            <button type="button" className="btn btn-primary" onClick={advance} autoFocus>
              {index + 1 >= exercises.length ? 'Ver resultado' : 'Siguiente'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function scorePercent(results: ExerciseResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.correct).length;
  return Math.round((correct / results.length) * 100);
}
