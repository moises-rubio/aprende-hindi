import type { CategoryId, Skill } from './types';

// Claves de localStorage (requeridas por la especificación)
export const STORAGE_KEYS = {
  progress: 'hlp_progress',
  vocabulary: 'hlp_vocabulary',
  spacedRep: 'hlp_spaced_rep',
  streak: 'hlp_streak',
  achievements: 'hlp_achievements',
  placementAttempts: 'hlp_placement_attempts',
} as const;

// Umbrales de aprobación
export const PASS_LESSON = 70; // % para completar una lección y desbloquear la siguiente
export const PASS_ASSESSMENT = 75; // % para certificar un nivel
export const PASS_PLACEMENT = 85; // % para aprobar un test de ubicación
export const WEAK_SKILL_THRESHOLD = 60; // < 60% => área débil en evaluación de nivel
export const WEAK_LESSON_THRESHOLD = 70; // < 70% => lección débil en test de ubicación

// Evaluación de nivel
export const ASSESSMENT_MINUTES = 45;
export const ASSESSMENT_QUESTIONS_PER_SKILL = 5; // 4 destrezas x 5 = 20 preguntas, ninguna >40%

// Test de ubicación
export const PLACEMENT_MIN_QUESTIONS = 10;
export const PLACEMENT_TESTOUT_SR_INDEX = 2; // intervalo inicial de 7 días

// Repetición espaciada (días)
export const SR_INTERVALS = [1, 3, 7, 14, 30];

// Ponderación de destrezas para el progreso global
export const SKILL_WEIGHTS: Record<Skill, number> = {
  vocabulary: 0.3,
  grammar: 0.3,
  listening: 0.2,
  speaking: 0.2,
};

export const SKILL_LABELS: Record<Skill, string> = {
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  listening: 'Comprensión auditiva',
  speaking: 'Expresión oral',
};

// Categorías temáticas (las conversacionales primero)
export const CATEGORY_ORDER: CategoryId[] = [
  'introducciones',
  'origen',
  'planes-futuros',
  'familia',
  'comida',
  'viajes',
  'trabajo',
  'vida-diaria',
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  introducciones: 'Presentaciones personales',
  origen: 'Origen y procedencia',
  'planes-futuros': 'Planes de futuro',
  familia: 'Familia',
  comida: 'Comida',
  viajes: 'Viajes',
  trabajo: 'Trabajo',
  'vida-diaria': 'Vida diaria',
};
