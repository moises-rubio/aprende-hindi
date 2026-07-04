import { SR_INTERVALS, STORAGE_KEYS } from '../constants';
import type { SRItem, SRState } from '../types';
import { addDays, dateStr, load, save, todayStr } from './storage';

function getState(): SRState {
  return load<SRState>(STORAGE_KEYS.spacedRep, {});
}

function saveState(state: SRState): void {
  save(STORAGE_KEYS.spacedRep, state);
}

function nextReviewDate(intervalIndex: number): string {
  const days = SR_INTERVALS[Math.min(intervalIndex, SR_INTERVALS.length - 1)];
  return dateStr(addDays(new Date(), days));
}

/** Añade elementos nuevos (no sobrescribe los existentes). */
export function addItems(ids: string[], kind: 'vocab' | 'grammar', intervalIndex = 0): void {
  const state = getState();
  let changed = false;
  for (const id of ids) {
    if (!state[id]) {
      state[id] = {
        id,
        kind,
        intervalIndex,
        nextReview: nextReviewDate(intervalIndex),
        lastReviewed: null,
      };
      changed = true;
    }
  }
  if (changed) saveState(state);
}

export function getAllItems(): SRItem[] {
  return Object.values(getState());
}

export function getDueItems(): SRItem[] {
  const today = todayStr();
  return getAllItems()
    .filter((it) => it.nextReview <= today)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function pendingCounts(): { vocab: number; grammar: number; total: number } {
  const due = getDueItems();
  const vocab = due.filter((d) => d.kind === 'vocab').length;
  const grammar = due.length - vocab;
  return { vocab, grammar, total: due.length };
}

/**
 * Registra el resultado de un repaso:
 * correcto => avanza al siguiente intervalo (se queda en 30 si ya es el máximo);
 * incorrecto => vuelve al intervalo de 1 día.
 */
export function review(id: string, correct: boolean): void {
  const state = getState();
  const item = state[id];
  if (!item) return;
  const intervalIndex = correct
    ? Math.min(item.intervalIndex + 1, SR_INTERVALS.length - 1)
    : 0;
  state[id] = {
    ...item,
    intervalIndex,
    nextReview: nextReviewDate(intervalIndex),
    lastReviewed: todayStr(),
  };
  saveState(state);
}
