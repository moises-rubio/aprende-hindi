import { beforeEach, describe, expect, it } from 'vitest';
import { PASS_LESSON, SR_INTERVALS, STORAGE_KEYS } from '../src/constants';
import { lessonsOfModule } from '../src/data';
import {
  isLessonCompleted,
  isLessonUnlocked,
  isModuleUnlocked,
  overallProgress,
  recordLessonResult,
  skillProgress,
} from '../src/services/progress';
import { addItems, getDueItems, review } from '../src/services/spacedRepetition';
import { dateStr, daysBetween, todayStr } from '../src/services/storage';
import { getStreak, recordActivity } from '../src/services/streak';

beforeEach(() => localStorage.clear());

describe('storage: fechas', () => {
  it('daysBetween calcula días de calendario', () => {
    expect(daysBetween('2026-07-01', '2026-07-04')).toBe(3);
    expect(daysBetween('2026-07-04', '2026-07-01')).toBe(-3);
    expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1); // cambio de mes
  });
});

describe('racha', () => {
  it('nueva actividad inicia la racha en 1', () => {
    expect(getStreak().count).toBe(0);
    const s = recordActivity();
    expect(s.count).toBe(1);
    expect(s.lastDate).toBe(todayStr());
  });

  it('actividad repetida el mismo día no suma', () => {
    recordActivity();
    const s = recordActivity();
    expect(s.count).toBe(1);
  });

  it('continúa si el último día fue ayer y se reinicia si hubo hueco', () => {
    const yesterday = dateStr(new Date(Date.now() - 86400000));
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify({ count: 4, best: 4, lastDate: yesterday }));
    expect(recordActivity().count).toBe(5);

    const old = dateStr(new Date(Date.now() - 3 * 86400000));
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify({ count: 9, best: 9, lastDate: old }));
    expect(getStreak().count).toBe(0); // racha efectiva
    expect(recordActivity().count).toBe(1); // reinicio
  });
});

describe('repetición espaciada', () => {
  it('acierta => avanza intervalo; falla => vuelve a 1 día; tope en 30', () => {
    addItems(['w-test'], 'vocab', 0);
    // recién añadido: revisión en 1 día, no pendiente hoy
    expect(getDueItems().find((i) => i.id === 'w-test')).toBeUndefined();

    // forzamos que esté pendiente hoy
    const state = JSON.parse(localStorage.getItem(STORAGE_KEYS.spacedRep)!);
    state['w-test'].nextReview = todayStr();
    localStorage.setItem(STORAGE_KEYS.spacedRep, JSON.stringify(state));
    expect(getDueItems().find((i) => i.id === 'w-test')).toBeDefined();

    review('w-test', true);
    let it2 = JSON.parse(localStorage.getItem(STORAGE_KEYS.spacedRep)!)['w-test'];
    expect(it2.intervalIndex).toBe(1); // 1 -> 3 días

    review('w-test', false);
    it2 = JSON.parse(localStorage.getItem(STORAGE_KEYS.spacedRep)!)['w-test'];
    expect(it2.intervalIndex).toBe(0); // reinicio a 1 día

    for (let i = 0; i < 10; i++) review('w-test', true);
    it2 = JSON.parse(localStorage.getItem(STORAGE_KEYS.spacedRep)!)['w-test'];
    expect(it2.intervalIndex).toBe(SR_INTERVALS.length - 1); // se queda en 30
  });
});

describe('progreso y desbloqueo', () => {
  it('lección completada con >=70% desbloquea la siguiente', () => {
    const [l1, l2] = lessonsOfModule('a1-m1');
    expect(isLessonUnlocked(l1.id)).toBe(true);
    expect(isLessonUnlocked(l2.id)).toBe(false);

    recordLessonResult(l1.id, PASS_LESSON - 5); // 65%: no completa
    expect(isLessonCompleted(l1.id)).toBe(false);
    expect(isLessonUnlocked(l2.id)).toBe(false);

    recordLessonResult(l1.id, 90);
    expect(isLessonCompleted(l1.id)).toBe(true);
    expect(isLessonUnlocked(l2.id)).toBe(true);
  });

  it('un resultado peor no sobreescribe una puntuación mejor', () => {
    const [l1] = lessonsOfModule('a1-m1');
    recordLessonResult(l1.id, 90);
    recordLessonResult(l1.id, 40);
    expect(isLessonCompleted(l1.id)).toBe(true);
  });

  it('el módulo 2 se desbloquea al completar el módulo 1', () => {
    expect(isModuleUnlocked('a1-m2')).toBe(false);
    for (const lesson of lessonsOfModule('a1-m1')) recordLessonResult(lesson.id, 100);
    expect(isModuleUnlocked('a1-m2')).toBe(true);
  });

  it('progreso global parte de 0 y sube al completar lecciones', () => {
    expect(overallProgress()).toBe(0);
    for (const lesson of lessonsOfModule('a1-m1')) recordLessonResult(lesson.id, 100);
    expect(overallProgress()).toBeGreaterThan(0);
    expect(skillProgress('vocabulary')).toBeGreaterThan(0);
  });
});
