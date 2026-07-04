// ---------- Contenido estático ----------

export type LevelId = 'A1' | 'A2' | 'B1';

export type Skill = 'vocabulary' | 'grammar' | 'listening' | 'speaking';

export type CategoryId =
  | 'introducciones'
  | 'origen'
  | 'planes-futuros'
  | 'familia'
  | 'comida'
  | 'viajes'
  | 'trabajo'
  | 'vida-diaria';

export interface Level {
  id: LevelId;
  title: string;
  description: string;
  order: number;
}

export interface Module {
  id: string;
  levelId: LevelId;
  title: string;
  description: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  skill: Skill;
  order: number;
  vocabIds: string[];
  grammarTopicId?: string;
}

export interface VocabWord {
  id: string;
  /** Transliteración latina (forma principal) */
  hindi: string;
  /** Variantes ortográficas aceptadas (>= 2) */
  variants: string[];
  spanish: string;
  /** Transcripción fonética aproximada (IPA simplificada) */
  ipa: string;
  category: CategoryId;
  exampleHi: string;
  exampleEs: string;
}

export interface GrammarExample {
  hindi: string;
  spanish: string;
  ipa: string;
}

export interface GrammarStep {
  title: string;
  explanation: string;
  examples: GrammarExample[];
}

export interface GrammarTopic {
  id: string;
  levelId: LevelId;
  title: string;
  description: string;
  steps: GrammarStep[];
}

// ---------- Ejercicios ----------

export type ExerciseType = 'multiple-choice' | 'fill-blank' | 'matching' | 'free-text';

interface ExerciseBase {
  id: string;
  lessonId: string;
  skill: Skill;
  /** Explicación mostrada al fallar (<= 200 caracteres) */
  explanation: string;
  /** Palabra de vocabulario asociada (para logros / banco) */
  wordId?: string;
  /** Audio asociado (ejercicios de escucha) */
  audioSrc?: string;
  /** Transcripción fonética alternativa si el audio falla */
  phonetic?: string;
}

export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple-choice';
  prompt: string;
  options: string[]; // siempre 4
  correctIndex: number;
}

export interface FillBlankExercise extends ExerciseBase {
  type: 'fill-blank';
  promptBefore: string;
  promptAfter: string;
  hint?: string;
  answers: string[];
}

export interface MatchingExercise extends ExerciseBase {
  type: 'matching';
  pairs: { left: string; right: string }[]; // 3-6 pares
}

export interface FreeTextExercise extends ExerciseBase {
  type: 'free-text';
  prompt: string;
  answers: string[];
}

export type Exercise =
  | MultipleChoiceExercise
  | FillBlankExercise
  | MatchingExercise
  | FreeTextExercise;

export interface ExerciseResult {
  exercise: Exercise;
  correct: boolean;
}

// ---------- Estado persistido (localStorage) ----------

export interface LessonRecord {
  score: number; // 0-100
  completedAt: string; // ISO
}

export interface AssessmentFailRecord {
  failedAt: string; // ISO
  weakSkills: Skill[];
  recommendedLessonIds: string[];
}

export interface ProgressState {
  completedLessons: Record<string, LessonRecord>;
  certifiedLevels: LevelId[];
  testedOutModules: string[];
  assessmentFails: Record<string, AssessmentFailRecord>;
}

export interface VocabBankEntry {
  addedAt: string; // ISO
  timesCorrect: number;
  timesWrong: number;
}

export type VocabBankState = Record<string, VocabBankEntry>;

export interface StreakState {
  count: number;
  best: number;
  lastDate: string | null; // YYYY-MM-DD (zona horaria local del usuario)
}

export interface SRItem {
  id: string; // wordId o topicId
  kind: 'vocab' | 'grammar';
  intervalIndex: number; // índice en [1,3,7,14,30]
  nextReview: string; // YYYY-MM-DD
  lastReviewed: string | null;
}

export type SRState = Record<string, SRItem>;

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  condition: string;
}

export interface AchievementState {
  earned: Record<string, string>; // id -> fecha ISO
  correctWordCount: number;
}

export type PlacementAttemptsState = Record<string, string>; // moduleId -> YYYY-MM-DD
