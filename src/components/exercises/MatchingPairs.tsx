import { useMemo, useState } from 'react';
import type { MatchingExercise } from '../../types';

interface Props {
  exercise: MatchingExercise;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

/**
 * Emparejar: pulsa una palabra en hindi y luego su traducción.
 * Se considera correcto si se completó con pocos errores (< pares/2).
 */
export default function MatchingPairs({ exercise, answered, onAnswer }: Props) {
  const rights = useMemo(
    () => exercise.pairs.map((p) => p.right).slice().sort(() => 0.5 - Math.random()),
    [exercise.id],
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState<string | null>(null);

  const clickLeft = (left: string) => {
    if (answered || matched[left]) return;
    setSelectedLeft(left);
  };

  const clickRight = (right: string) => {
    if (answered || !selectedLeft) return;
    if (Object.values(matched).includes(right)) return;
    const pair = exercise.pairs.find((p) => p.left === selectedLeft);
    if (pair && pair.right === right) {
      const next = { ...matched, [selectedLeft]: right };
      setMatched(next);
      setSelectedLeft(null);
      if (Object.keys(next).length === exercise.pairs.length) {
        onAnswer(mistakes < exercise.pairs.length / 2);
      }
    } else {
      setMistakes((m) => m + 1);
      setShake(right);
      window.setTimeout(() => setShake(null), 400);
      setSelectedLeft(null);
    }
  };

  return (
    <div>
      <p className="exercise-prompt">Empareja cada palabra con su traducción.</p>
      <div className="matching-grid">
        <div className="matching-col" role="group" aria-label="Palabras en hindi">
          {exercise.pairs.map((p) => (
            <button
              key={p.left}
              type="button"
              className={`btn match-item hindi-text ${selectedLeft === p.left ? 'selected' : ''} ${
                matched[p.left] ? 'matched' : ''
              }`}
              onClick={() => clickLeft(p.left)}
              disabled={answered || !!matched[p.left]}
              aria-pressed={selectedLeft === p.left}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="matching-col" role="group" aria-label="Traducciones en español">
          {rights.map((r) => {
            const taken = Object.values(matched).includes(r);
            return (
              <button
                key={r}
                type="button"
                className={`btn match-item ${taken ? 'matched' : ''} ${shake === r ? 'shake' : ''}`}
                onClick={() => clickRight(r)}
                disabled={answered || taken || !selectedLeft}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <p className="muted" aria-live="polite">
        Errores: {mistakes}
      </p>
    </div>
  );
}
