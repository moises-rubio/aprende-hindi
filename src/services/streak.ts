import { STORAGE_KEYS } from '../constants';
import type { StreakState } from '../types';
import { daysBetween, load, save, todayStr } from './storage';

const EMPTY: StreakState = { count: 0, best: 0, lastDate: null };

export function getStreak(): StreakState {
  const s = load<StreakState>(STORAGE_KEYS.streak, EMPTY);
  // Si el usuario dejó pasar un día completo, la racha efectiva es 0.
  if (s.lastDate && daysBetween(s.lastDate, todayStr()) > 1) {
    return { ...s, count: 0 };
  }
  return s;
}

/**
 * Registra actividad (>= 1 ejercicio completado hoy, correcto o no).
 * +1 por día de calendario; se reinicia a 0 si se saltó el día anterior.
 */
export function recordActivity(): StreakState {
  const s = load<StreakState>(STORAGE_KEYS.streak, EMPTY);
  const today = todayStr();
  if (s.lastDate === today) return s;

  let count: number;
  if (s.lastDate && daysBetween(s.lastDate, today) === 1) {
    count = s.count + 1;
  } else {
    count = 1;
  }
  const next: StreakState = { count, best: Math.max(s.best, count), lastDate: today };
  save(STORAGE_KEYS.streak, next);
  return next;
}
