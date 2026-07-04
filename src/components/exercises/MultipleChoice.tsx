import { useState } from 'react';
import AudioButton from '../AudioButton';
import type { MultipleChoiceExercise } from '../../types';

interface Props {
  exercise: MultipleChoiceExercise;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export default function MultipleChoice({ exercise, answered, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    onAnswer(i === exercise.correctIndex);
  };

  return (
    <div>
      <p className="exercise-prompt hindi-text">
        {exercise.audioSrc && (
          <AudioButton src={exercise.audioSrc} label="audio de la pregunta" phonetic={exercise.phonetic} />
        )}{' '}
        {exercise.prompt}
      </p>
      <div className="mc-options" role="group" aria-label="Opciones de respuesta">
        {exercise.options.map((opt, i) => {
          let cls = 'btn mc-option';
          if (answered) {
            if (i === exercise.correctIndex) cls += ' mc-correct';
            else if (i === selected) cls += ' mc-wrong';
          }
          return (
            <button key={i} type="button" className={cls} onClick={() => choose(i)} disabled={answered}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
