import { useState } from 'react';
import type { FormEvent } from 'react';
import AudioButton from '../AudioButton';
import { matchesAnswer } from '../../services/exerciseEngine';
import type { FreeTextExercise } from '../../types';

interface Props {
  exercise: FreeTextExercise;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export default function FreeText({ exercise, answered, onAnswer }: Props) {
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
      <p className="exercise-prompt">
        {exercise.audioSrc && (
          <AudioButton src={exercise.audioSrc} label="audio del ejercicio" phonetic={exercise.phonetic} />
        )}{' '}
        {exercise.prompt}
      </p>
      <input
        type="text"
        className="text-input hindi-text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={answered}
        aria-label="Tu respuesta en transliteración latina"
        placeholder="Escribe aquí…"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
      />
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
