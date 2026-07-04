import { STORAGE_KEYS } from '../constants';
import type { AchievementDef, AchievementState } from '../types';
import { load, save } from './storage';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-exercise',
    name: 'Primer paso',
    description: 'Completaste tu primer ejercicio.',
    condition: 'Completa 1 ejercicio (cualquier respuesta).',
  },
  {
    id: 'streak-7',
    name: 'Una semana en llamas',
    description: 'Mantuviste una racha de 7 días seguidos.',
    condition: 'Practica al menos un ejercicio durante 7 días consecutivos.',
  },
  {
    id: 'streak-30',
    name: 'Mes imparable',
    description: 'Mantuviste una racha de 30 días seguidos.',
    condition: 'Practica al menos un ejercicio durante 30 días consecutivos.',
  },
  {
    id: 'level-completed',
    name: 'Nivel superado',
    description: 'Certificaste un nivel completo del CEFR.',
    condition: 'Aprueba una evaluación de nivel con 75% o más.',
  },
  {
    id: 'words-100',
    name: 'Cien palabras',
    description: 'Respondiste correctamente 100 palabras.',
    condition: 'Acumula 100 respuestas correctas de vocabulario.',
  },
  {
    id: 'words-500',
    name: 'Quinientas palabras',
    description: 'Respondiste correctamente 500 palabras.',
    condition: 'Acumula 500 respuestas correctas de vocabulario.',
  },
];

const EMPTY: AchievementState = { earned: {}, correctWordCount: 0 };

type Listener = (a: AchievementDef) => void;
const listeners = new Set<Listener>();

/** Suscripción para mostrar la notificación superpuesta al desbloquear. */
export function subscribeAchievements(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getAchievementState(): AchievementState {
  return load<AchievementState>(STORAGE_KEYS.achievements, EMPTY);
}

function unlock(id: string): void {
  const state = getAchievementState();
  if (state.earned[id]) return;
  state.earned[id] = new Date().toISOString();
  save(STORAGE_KEYS.achievements, state);
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (def) listeners.forEach((fn) => fn(def));
}

/** Llamado en cada respuesta de ejercicio. */
export function onExerciseAnswered(correct: boolean, isWordExercise: boolean): void {
  unlock('first-exercise');
  if (correct && isWordExercise) {
    const state = getAchievementState();
    state.correctWordCount += 1;
    save(STORAGE_KEYS.achievements, state);
    if (state.correctWordCount >= 100) unlock('words-100');
    if (state.correctWordCount >= 500) unlock('words-500');
  }
}

export function onStreakUpdated(count: number): void {
  if (count >= 7) unlock('streak-7');
  if (count >= 30) unlock('streak-30');
}

export function onLevelCertified(): void {
  unlock('level-completed');
}
