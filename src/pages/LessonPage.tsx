import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AudioButton from '../components/AudioButton';
import ExerciseRunner, { scorePercent } from '../components/exercises/ExerciseRunner';
import { PASS_LESSON } from '../constants';
import { useAppState } from '../context';
import { getLesson, getModule, getTopic, getWord, lessonsOfModule } from '../data';
import { grammarAudioSrc, wordAudioSrc } from '../services/audio';
import { generateLessonExercises } from '../services/exerciseEngine';
import {
  addWordsToBank,
  isLessonUnlocked,
  recordLessonResult,
} from '../services/progress';
import { addItems } from '../services/spacedRepetition';
import type { ExerciseResult, VocabWord } from '../types';

type Phase = 'study' | 'exercises' | 'done';

export default function LessonPage() {
  const { bump } = useAppState();
  const { lessonId } = useParams<{ lessonId: string }>();
  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const [phase, setPhase] = useState<Phase>('study');
  const [finalScore, setFinalScore] = useState(0);

  const exercises = useMemo(
    () => (lesson ? generateLessonExercises(lesson) : []),
    [lesson?.id],
  );

  if (!lesson) {
    return (
      <main className="page">
        <p>Lección no encontrada.</p>
        <Link className="btn" to="/">
          Volver al panel
        </Link>
      </main>
    );
  }

  const mod = getModule(lesson.moduleId);
  const unlocked = isLessonUnlocked(lesson.id);
  const topic = lesson.grammarTopicId ? getTopic(lesson.grammarTopicId) : undefined;
  const words = lesson.vocabIds.map((id) => getWord(id)).filter((w): w is VocabWord => !!w);

  if (!unlocked) {
    return (
      <main className="page">
        <nav aria-label="Ruta">
          <Link to={`/modules/${lesson.moduleId}`}>← {mod?.title}</Link>
        </nav>
        <div className="card warning-card">
          <p>🔒 Esta lección está bloqueada. Completa la lección anterior con al menos {PASS_LESSON}%.</p>
        </div>
      </main>
    );
  }

  const handleFinish = (results: ExerciseResult[]) => {
    const score = scorePercent(results);
    setFinalScore(score);
    recordLessonResult(lesson.id, score);
    if (score >= PASS_LESSON) {
      // La lección se completa: vocabulario al banco + repetición espaciada (1 día).
      addWordsToBank(lesson.vocabIds);
      addItems(lesson.vocabIds, 'vocab', 0);
      if (lesson.grammarTopicId) addItems([lesson.grammarTopicId], 'grammar', 0);
    }
    bump();
    setPhase('done');
  };

  const siblings = lessonsOfModule(lesson.moduleId);
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const nextLesson = idx >= 0 && idx + 1 < siblings.length ? siblings[idx + 1] : null;

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to={`/modules/${lesson.moduleId}`}>← {mod?.title}</Link>
      </nav>
      <h1>{lesson.title}</h1>
      <p className="muted">{lesson.description}</p>

      {phase === 'study' && (
        <>
          {topic && (
            <section className="card" aria-label="Explicación de gramática">
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
              {topic.steps.map((step, si) => (
                <div key={si} className="grammar-step">
                  <h3>{step.title}</h3>
                  <p>{step.explanation}</p>
                  <ul className="example-list">
                    {step.examples.map((ex, ei) => (
                      <li key={ei} className="example-item">
                        <AudioButton
                          src={grammarAudioSrc(topic.id, si, ei)}
                          label={ex.hindi}
                          phonetic={ex.ipa}
                        />{' '}
                        <span className="hindi-text">{ex.hindi}</span>
                        <span className="muted"> — {ex.spanish}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {words.length > 0 && (
            <section className="card" aria-label="Vocabulario de la lección">
              <h2>Vocabulario</h2>
              <ul className="vocab-list">
                {words.map((w) => (
                  <li key={w.id} className="vocab-item">
                    <AudioButton src={wordAudioSrc(w.id)} label={w.hindi} phonetic={w.ipa} />
                    <div>
                      <span className="hindi-text vocab-word">{w.hindi}</span>
                      <span className="muted"> [{w.ipa}] — {w.spanish}</span>
                      <p className="muted small">
                        <span className="hindi-text">{w.exampleHi}</span> · {w.exampleEs}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button type="button" className="btn btn-primary btn-big" onClick={() => setPhase('exercises')}>
            Comenzar ejercicios ({exercises.length})
          </button>
        </>
      )}

      {phase === 'exercises' && <ExerciseRunner exercises={exercises} onFinish={handleFinish} />}

      {phase === 'done' && (
        <section className={`card result-card ${finalScore >= PASS_LESSON ? 'pass' : 'fail'}`}>
          <h2>{finalScore >= PASS_LESSON ? '🎉 ¡Lección completada!' : '📚 Sigue practicando'}</h2>
          <p className="overall-number">{finalScore}%</p>
          {finalScore >= PASS_LESSON ? (
            <p>Has superado el {PASS_LESSON}% y la siguiente lección queda desbloqueada.</p>
          ) : (
            <p>Necesitas al menos {PASS_LESSON}% para completar la lección. ¡Inténtalo de nuevo!</p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPhase('study');
              }}
            >
              Repetir lección
            </button>
            {finalScore >= PASS_LESSON && nextLesson && (
              <Link className="btn btn-primary" to={`/lessons/${nextLesson.id}`} onClick={() => setPhase('study')}>
                Siguiente lección →
              </Link>
            )}
            {finalScore >= PASS_LESSON && !nextLesson && (
              <Link className="btn btn-primary" to={`/modules/${lesson.moduleId}`}>
                Volver al módulo
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
