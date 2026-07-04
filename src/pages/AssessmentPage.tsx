import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ExerciseRunner from '../components/exercises/ExerciseRunner';
import TimerDisplay from '../components/TimerDisplay';
import {
  ASSESSMENT_MINUTES,
  PASS_ASSESSMENT,
  SKILL_LABELS,
  WEAK_SKILL_THRESHOLD,
} from '../constants';
import { useAppState } from '../context';
import { getLesson, getLevel } from '../data';
import { onLevelCertified } from '../services/achievements';
import { generateAssessment } from '../services/exerciseEngine';
import type { AssessmentQuestion } from '../services/exerciseEngine';
import {
  assessmentAvailability,
  certifyLevel,
  recordAssessmentFail,
} from '../services/progress';
import type { ExerciseResult, LevelId, Skill } from '../types';

type Phase = 'intro' | 'running' | 'passed' | 'failed';

const SKILLS: Skill[] = ['vocabulary', 'grammar', 'listening', 'speaking'];

export default function AssessmentPage() {
  const { bump } = useAppState();
  const { levelId } = useParams<{ levelId: string }>();
  const level = levelId ? getLevel(levelId) : undefined;

  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(ASSESSMENT_MINUTES * 60);
  const [expired, setExpired] = useState(false);
  const [score, setScore] = useState(0);
  const [skillScores, setSkillScores] = useState<Record<Skill, number>>({
    vocabulary: 0,
    grammar: 0,
    listening: 0,
    speaking: 0,
  });
  const [recommended, setRecommended] = useState<string[]>([]);

  // Temporizador de 45 minutos con envío automático al agotarse.
  useEffect(() => {
    if (phase !== 'running') return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  const availability = useMemo(
    () => (level ? assessmentAvailability(level.id as LevelId) : { available: false, reason: null }),
    [level?.id, phase],
  );

  if (!level) {
    return (
      <main className="page">
        <p>Nivel no encontrado.</p>
        <Link className="btn" to="/">
          Volver al panel
        </Link>
      </main>
    );
  }

  const start = () => {
    setQuestions(generateAssessment(level.id));
    setSecondsLeft(ASSESSMENT_MINUTES * 60);
    setExpired(false);
    setPhase('running');
  };

  const handleFinish = (results: ExerciseResult[]) => {
    // Puntuación global y por destreza (lo no respondido cuenta como incorrecto).
    const byId = new Map(results.map((r) => [r.exercise.id, r.correct]));
    const perSkill: Record<Skill, { total: number; correct: number }> = {
      vocabulary: { total: 0, correct: 0 },
      grammar: { total: 0, correct: 0 },
      listening: { total: 0, correct: 0 },
      speaking: { total: 0, correct: 0 },
    };
    let correct = 0;
    for (const q of questions) {
      const ok = byId.get(q.exercise.id) === true;
      perSkill[q.skill].total += 1;
      if (ok) {
        perSkill[q.skill].correct += 1;
        correct += 1;
      }
    }
    const total = questions.length || 1;
    const pct = Math.round((correct / total) * 100);
    const skills = {} as Record<Skill, number>;
    for (const s of SKILLS) {
      skills[s] = perSkill[s].total > 0 ? Math.round((perSkill[s].correct / perSkill[s].total) * 100) : 100;
    }
    setScore(pct);
    setSkillScores(skills);

    if (pct >= PASS_ASSESSMENT) {
      certifyLevel(level.id as LevelId);
      onLevelCertified();
      setPhase('passed');
    } else {
      const rec = recordAssessmentFail(level.id as LevelId, skills);
      setRecommended(rec.recommendedLessonIds);
      setPhase('failed');
    }
    bump();
  };

  return (
    <main className="page">
      <nav aria-label="Ruta">
        <Link to={`/levels/${level.id}`}>← Nivel {level.id}</Link>
      </nav>
      <h1>Evaluación de nivel {level.id}</h1>

      {phase === 'intro' && (
        <section className="card">
          {availability.available ? (
            <>
              <p>
                La evaluación tiene un mínimo de 20 preguntas repartidas entre las 4 destrezas (ninguna
                supera el 40% del total). Dispones de <strong>{ASSESSMENT_MINUTES} minutos</strong>; al
                agotarse el tiempo la prueba se envía automáticamente.
              </p>
              <p>
                Aprueba con <strong>{PASS_ASSESSMENT}%</strong> para certificar el nivel y desbloquear el
                siguiente.
              </p>
              <button type="button" className="btn btn-primary btn-big" onClick={start}>
                Comenzar (45:00)
              </button>
            </>
          ) : (
            <p className="muted">{availability.reason ?? 'Evaluación no disponible.'}</p>
          )}
        </section>
      )}

      {phase === 'running' && (
        <>
          <TimerDisplay secondsLeft={secondsLeft} />
          <ExerciseRunner
            exercises={questions.map((q) => q.exercise)}
            onFinish={handleFinish}
            forceFinish={expired}
          />
        </>
      )}

      {phase === 'passed' && (
        <section className="card result-card pass">
          <h2>🎓 ¡Nivel {level.id} certificado!</h2>
          <p className="overall-number">{score}%</p>
          <p>Has superado el {PASS_ASSESSMENT}% requerido. El siguiente nivel queda desbloqueado.</p>
          <Link className="btn btn-primary" to="/">
            Volver al panel
          </Link>
        </section>
      )}

      {phase === 'failed' && (
        <section className="card result-card fail">
          <h2>Todavía no… pero estás cerca</h2>
          <p className="overall-number">{score}%</p>
          <p>Necesitabas {PASS_ASSESSMENT}%. Resultados por destreza:</p>
          <ul>
            {SKILLS.map((s) => (
              <li key={s}>
                {SKILL_LABELS[s]}: {skillScores[s]}%{' '}
                {skillScores[s] < WEAK_SKILL_THRESHOLD && <strong>← área débil</strong>}
              </li>
            ))}
          </ul>
          <h3>Lecciones recomendadas</h3>
          <p className="muted">
            Completa al menos una de estas lecciones para poder repetir la evaluación.
          </p>
          <ul className="topic-list">
            {recommended.map((id) => {
              const l = getLesson(id);
              return l ? (
                <li key={id}>
                  <Link to={`/lessons/${id}`}>{l.title}</Link>
                </li>
              ) : null;
            })}
          </ul>
          <Link className="btn" to={`/levels/${level.id}`}>
            Volver al nivel
          </Link>
        </section>
      )}
    </main>
  );
}
