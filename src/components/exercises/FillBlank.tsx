import { useState } from 'react';
import type { FormEvent } from 'react';
import { matchesAnswer } from '../../services/exerciseEngine';
import type { FillBlankExercise } from '../../types';

interface Props {
  exercise: FillBlankExercise;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export default function FillBlank({ exercise, answered, onAnswer }: Props) {
  const [value, setValue] = useState('');
  const [emptyWarning, setEmptyWarning] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (answered) return;
    // Respuesta en blanco: se rechaza sin contar como intento.
    if (value.trim() === '') {
      setEmptyWarning(true);
      return;
    }
    setEmptyWarning(false);
    onAnswer(matchesAnswer(exercise.answers, value));
  };

  return (
    <form onSubmit={submit}>
      <p className="exercise-prompt hindi-text">
        {exercise.promptBefore}
        <input
          type="text"
          className="blank-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={answered}
          aria-label="Completa el hueco"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
        />
        {exercise.promptAfter}
      </p>
      {exercise.hint && <p className="muted">{exercise.hint}</p>}
      {emptyWarning && (
        <p className="warning" role="alert">
          Escribe una respuesta antes de comprobar.
        </p>
      )}
      {!answered && (
        <button type="submit" className="btn btn-primary">
          Comprobar
        </button>
      )}
    </form>
  );
}
