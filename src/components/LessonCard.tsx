import { Link } from 'react-router-dom';
import { SKILL_LABELS } from '../constants';
import type { Lesson, Skill } from '../types';

interface Props {
  lesson: Lesson;
  status: 'locked' | 'available' | 'completed';
  score?: number;
}

const SKILL_ICONS: Record<Skill, string> = {
  vocabulary: '📖',
  grammar: '🧩',
  listening: '🎧',
  speaking: '🗣️',
};

export default function LessonCard({ lesson, status, score }: Props) {
  const inner = (
    <>
      <div className="lesson-card-top">
        <span className={`badge badge-${lesson.skill}`}>
          <span aria-hidden="true">{SKILL_ICONS[lesson.skill]}</span> {SKILL_LABELS[lesson.skill]}
        </span>
        {status === 'completed' && (
          <span className="lesson-score" aria-label={`Completada con ${score ?? 0}%`}>
            ✓ {score ?? 0}%
          </span>
        )}
        {status === 'locked' && <span aria-hidden="true">🔒</span>}
      </div>
      <h3 className="lesson-card-title">{lesson.title}</h3>
      <p className="lesson-card-desc">{lesson.description}</p>
    </>
  );

  if (status === 'locked') {
    return (
      <div
        className={`card lesson-card locked skill-${lesson.skill}`}
        aria-label={`Lección bloqueada: ${lesson.title}`}
      >
        {inner}
        <p className="muted">Completa la lección anterior para desbloquear.</p>
      </div>
    );
  }

  return (
    <Link to={`/lessons/${lesson.id}`} className={`card lesson-card ${status} skill-${lesson.skill}`}>
      {inner}
    </Link>
  );
}
