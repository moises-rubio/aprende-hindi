import {
  PASS_LESSON,
  SKILL_WEIGHTS,
  STORAGE_KEYS,
  WEAK_SKILL_THRESHOLD,
} from '../constants';
import {
  LESSONS,
  getLesson,
  lessonsOfLevel,
  lessonsOfModule,
  modulesOfLevel,
  orderedModules,
} from '../data';
import type {
  AssessmentFailRecord,
  LessonRecord,
  LevelId,
  Module,
  PlacementAttemptsState,
  ProgressState,
  Skill,
  VocabBankState,
} from '../types';
import { load, save, todayStr } from './storage';

const EMPTY: ProgressState = {
  completedLessons: {},
  certifiedLevels: [],
  testedOutModules: [],
  assessmentFails: {},
};

export function getProgress(): ProgressState {
  return load<ProgressState>(STORAGE_KEYS.progress, EMPTY);
}

function saveProgress(p: ProgressState): void {
  save(STORAGE_KEYS.progress, p);
}

// ---------- Lecciones ----------

export function getLessonRecord(lessonId: string): LessonRecord | undefined {
  return getProgress().completedLessons[lessonId];
}

export function isLessonCompleted(lessonId: string): boolean {
  const rec = getLessonRecord(lessonId);
  return !!rec && rec.score >= PASS_LESSON;
}

/** Guarda el resultado de una lección (conserva la mejor puntuación). */
export function recordLessonResult(lessonId: string, score: number): void {
  const p = getProgress();
  const prev = p.completedLessons[lessonId];
  if (!prev || score >= prev.score) {
    p.completedLessons[lessonId] = { score, completedAt: new Date().toISOString() };
    saveProgress(p);
  }
}

// ---------- Desbloqueo ----------

export function isLevelUnlocked(levelId: LevelId): boolean {
  const p = getProgress();
  if (levelId === 'A1') return true;
  if (levelId === 'A2') return p.certifiedLevels.includes('A1');
  return p.certifiedLevels.includes('A2');
}

export function isModuleCompleted(moduleId: string): boolean {
  return lessonsOfModule(moduleId).every((l) => isLessonCompleted(l.id));
}

export function isModuleUnlocked(moduleId: string): boolean {
  const mods = orderedModules();
  const idx = mods.findIndex((m) => m.id === moduleId);
  if (idx === -1) return false;
  const mod = mods[idx];
  if (!isLevelUnlocked(mod.levelId)) return false;
  const prevInLevel = modulesOfLevel(mod.levelId).filter((m) => m.order < mod.order);
  if (prevInLevel.length === 0) return true;
  return prevInLevel.every((m) => isModuleCompleted(m.id));
}

export function isLessonUnlocked(lessonId: string): boolean {
  const lesson = getLesson(lessonId);
  if (!lesson) return false;
  if (!isModuleUnlocked(lesson.moduleId)) return false;
  const siblings = lessonsOfModule(lesson.moduleId);
  const idx = siblings.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  return isLessonCompleted(siblings[idx - 1].id);
}

// ---------- Progreso por destreza ----------

export function skillProgress(skill: Skill): number {
  const all = LESSONS.filter((l) => l.skill === skill);
  if (all.length === 0) return 0;
  const done = all.filter((l) => isLessonCompleted(l.id)).length;
  return Math.round((done / all.length) * 100);
}

/** Progreso global = media ponderada de las 4 destrezas. */
export function overallProgress(): number {
  const skills: Skill[] = ['vocabulary', 'grammar', 'listening', 'speaking'];
  const total = skills.reduce((acc, s) => acc + skillProgress(s) * SKILL_WEIGHTS[s], 0);
  return Math.round(total);
}

// ---------- Ruta de aprendizaje ----------

export interface LearningPath {
  completed: Module[];
  current: Module | null;
  next: Module[];
}

export function learningPath(): LearningPath {
  const mods = orderedModules();
  const completed = mods.filter((m) => isModuleCompleted(m.id));
  const remaining = mods.filter((m) => !isModuleCompleted(m.id));
  const current = remaining.length > 0 ? remaining[0] : null;
  const next = remaining.slice(1, 6);
  return { completed, current, next };
}

// ---------- Evaluaciones de nivel ----------

export function isLevelCertified(levelId: LevelId): boolean {
  return getProgress().certifiedLevels.includes(levelId);
}

export function allLevelLessonsCompleted(levelId: LevelId): boolean {
  const lessons = lessonsOfLevel(levelId);
  return lessons.length > 0 && lessons.every((l) => isLessonCompleted(l.id));
}

export function getAssessmentFail(levelId: LevelId): AssessmentFailRecord | undefined {
  return getProgress().assessmentFails[levelId];
}

/**
 * Disponible si: todas las lecciones del nivel completadas, no certificado aún y,
 * tras un suspenso, se ha completado al menos 1 lección recomendada después del suspenso.
 */
export function assessmentAvailability(levelId: LevelId): {
  available: boolean;
  reason: string | null;
} {
  if (isLevelCertified(levelId)) return { available: false, reason: 'Nivel ya certificado.' };
  if (!allLevelLessonsCompleted(levelId)) {
    return {
      available: false,
      reason: 'Completa todas las lecciones del nivel para desbloquear la evaluación.',
    };
  }
  const fail = getAssessmentFail(levelId);
  if (fail) {
    const p = getProgress();
    const retaken = fail.recommendedLessonIds.some((id) => {
      const rec = p.completedLessons[id];
      return rec && rec.completedAt > fail.failedAt;
    });
    if (!retaken) {
      return {
        available: false,
        reason:
          'Para repetir la evaluación, vuelve a completar al menos una de las lecciones recomendadas.',
      };
    }
  }
  return { available: true, reason: null };
}

export function certifyLevel(levelId: LevelId): void {
  const p = getProgress();
  if (!p.certifiedLevels.includes(levelId)) {
    p.certifiedLevels.push(levelId);
  }
  delete p.assessmentFails[levelId];
  saveProgress(p);
}

export function recordAssessmentFail(
  levelId: LevelId,
  skillScores: Record<Skill, number>,
): AssessmentFailRecord {
  const weakSkills = (Object.keys(skillScores) as Skill[]).filter(
    (s) => skillScores[s] < WEAK_SKILL_THRESHOLD,
  );
  const recommendedLessonIds = lessonsOfLevel(levelId)
    .filter((l) => weakSkills.includes(l.skill))
    .map((l) => l.id);
  const record: AssessmentFailRecord = {
    failedAt: new Date().toISOString(),
    weakSkills,
    recommendedLessonIds:
      recommendedLessonIds.length > 0
        ? recommendedLessonIds
        : lessonsOfLevel(levelId).map((l) => l.id),
  };
  const p = getProgress();
  p.assessmentFails[levelId] = record;
  saveProgress(p);
  return record;
}

// ---------- Tests de ubicación (test out) ----------

export function getPlacementAttempts(): PlacementAttemptsState {
  return load<PlacementAttemptsState>(STORAGE_KEYS.placementAttempts, {});
}

/** Una vez por día de calendario (zona horaria del usuario) y por módulo. */
export function canAttemptPlacement(moduleId: string): { allowed: boolean; reason: string | null } {
  if (isModuleCompleted(moduleId)) {
    return { allowed: false, reason: 'Este módulo ya está completado.' };
  }
  const attempts = getPlacementAttempts();
  if (attempts[moduleId] === todayStr()) {
    return {
      allowed: false,
      reason: 'Ya hiciste el test de ubicación de este módulo hoy. Vuelve a intentarlo mañana.',
    };
  }
  return { allowed: true, reason: null };
}

export function recordPlacementAttempt(moduleId: string): void {
  const attempts = getPlacementAttempts();
  attempts[moduleId] = todayStr();
  save(STORAGE_KEYS.placementAttempts, attempts);
}

/** Aprobado el test: marca todas las lecciones como completadas y desbloquea el siguiente módulo. */
export function testOutModule(moduleId: string): void {
  const p = getProgress();
  for (const lesson of lessonsOfModule(moduleId)) {
    const prev = p.completedLessons[lesson.id];
    if (!prev || prev.score < 100) {
      p.completedLessons[lesson.id] = { score: 100, completedAt: new Date().toISOString() };
    }
  }
  if (!p.testedOutModules.includes(moduleId)) {
    p.testedOutModules.push(moduleId);
  }
  saveProgress(p);
}

// ---------- Banco de vocabulario (hlp_vocabulary) ----------

export function getVocabBank(): VocabBankState {
  return load<VocabBankState>(STORAGE_KEYS.vocabulary, {});
}

export function addWordsToBank(wordIds: string[]): void {
  const bank = getVocabBank();
  let changed = false;
  for (const id of wordIds) {
    if (!bank[id]) {
      bank[id] = { addedAt: new Date().toISOString(), timesCorrect: 0, timesWrong: 0 };
      changed = true;
    }
  }
  if (changed) save(STORAGE_KEYS.vocabulary, bank);
}

export function recordWordResult(wordId: string, correct: boolean): void {
  const bank = getVocabBank();
  const entry = bank[wordId];
  if (!entry) return;
  if (correct) entry.timesCorrect += 1;
  else entry.timesWrong += 1;
  save(STORAGE_KEYS.vocabulary, bank);
}
