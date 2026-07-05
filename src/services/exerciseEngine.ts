import { ASSESSMENT_QUESTIONS_PER_SKILL } from '../constants';
import { VOCAB, getLesson, getTopic, getWord, lessonsOfLevel, lessonsOfModule } from '../data';
import { grammarAudioSrc, wordAudioSrc } from './audio';
import type {
  Exercise,
  FillBlankExercise,
  FreeTextExercise,
  GrammarTopic,
  Lesson,
  MatchingExercise,
  MultipleChoiceExercise,
  SRItem,
  Skill,
  VocabWord,
} from '../types';
import { todayStr } from './storage';

// ---------- RNG determinista (mulberry32 con semilla de texto) ----------

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: string): Rng {
  return mulberry32(hashSeed(seed));
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Barajado determinista a partir de una semilla de texto (para componentes de UI). */
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  return shuffle(arr, makeRng(seed));
}

function pick<T>(arr: T[], n: number, rng: Rng): T[] {
  return shuffle(arr, rng).slice(0, n);
}

// ---------- Normalización y comprobación de respuestas ----------

/** Normaliza texto libre: minúsculas, sin tildes, sin puntuación, espacios simples. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de Levenshtein acotada a 2 (suficiente para tolerancia de erratas). */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Acepta cualquier variante ortográfica exacta y, para respuestas de 5+
 * caracteres, tolera una errata de una letra (p. ej. «dhanyavad» ~ «dhanyavaad»).
 */
export function matchesAnswer(answers: string[], input: string): boolean {
  const norm = normalizeText(input);
  return answers.some((a) => {
    const target = normalizeText(a);
    if (target === norm) return true;
    return target.length >= 5 && editDistance(target, norm) <= 1;
  });
}

/** Texto de la respuesta correcta para mostrar en la retroalimentación. */
export function correctAnswerText(ex: Exercise): string {
  switch (ex.type) {
    case 'multiple-choice':
      return ex.options[ex.correctIndex];
    case 'fill-blank':
    case 'free-text':
      return ex.answers[0];
    case 'matching':
      return ex.pairs.map((p) => `${p.left} — ${p.right}`).join(' · ');
  }
}

// ---------- Utilidades de generación ----------

function truncateExplanation(s: string): string {
  return s.length <= 200 ? s : `${s.slice(0, 197)}…`;
}

function distractorsFor(word: VocabWord, count: number, rng: Rng, field: 'spanish' | 'hindi'): string[] {
  const pool = VOCAB.filter((w) => w.id !== word.id && w[field] !== word[field]);
  return pick(pool, count, rng).map((w) => w[field]);
}

function mcqHindiToSpanish(word: VocabWord, lesson: Lesson, idx: number, rng: Rng): MultipleChoiceExercise {
  const options = shuffle([word.spanish, ...distractorsFor(word, 3, rng, 'spanish')], rng);
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'multiple-choice',
    prompt: `¿Qué significa «${word.hindi}»?`,
    options,
    correctIndex: options.indexOf(word.spanish),
    explanation: truncateExplanation(`«${word.hindi}» significa «${word.spanish}». Ej.: ${word.exampleHi}`),
    wordId: word.id,
  };
}

function mcqSpanishToHindi(word: VocabWord, lesson: Lesson, idx: number, rng: Rng): MultipleChoiceExercise {
  const options = shuffle([word.hindi, ...distractorsFor(word, 3, rng, 'hindi')], rng);
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'multiple-choice',
    prompt: `¿Cómo se dice «${word.spanish}» en hindi?`,
    options,
    correctIndex: options.indexOf(word.hindi),
    explanation: truncateExplanation(`«${word.spanish}» se dice «${word.hindi}» (${word.ipa}).`),
    wordId: word.id,
  };
}

function mcqListening(word: VocabWord, lesson: Lesson, idx: number, rng: Rng): MultipleChoiceExercise {
  const options = shuffle([word.spanish, ...distractorsFor(word, 3, rng, 'spanish')], rng);
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'multiple-choice',
    prompt: 'Escucha la palabra y elige su significado.',
    options,
    correctIndex: options.indexOf(word.spanish),
    explanation: truncateExplanation(`La palabra era «${word.hindi}» (${word.ipa}): «${word.spanish}».`),
    wordId: word.id,
    audioSrc: wordAudioSrc(word.id),
    phonetic: word.ipa,
  };
}

function freeTextListening(word: VocabWord, lesson: Lesson, idx: number): FreeTextExercise {
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'free-text',
    prompt: 'Escucha y escribe la palabra en transliteración latina.',
    answers: word.variants,
    explanation: truncateExplanation(
      `Era «${word.hindi}» («${word.spanish}»). Variantes aceptadas: ${word.variants.join(', ')}.`,
    ),
    wordId: word.id,
    audioSrc: wordAudioSrc(word.id),
    phonetic: word.ipa,
  };
}

function freeTextProduce(word: VocabWord, lesson: Lesson, idx: number): FreeTextExercise {
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'free-text',
    prompt: `Escribe en hindi (transliteración): «${word.spanish}»`,
    answers: word.variants,
    explanation: truncateExplanation(
      `«${word.spanish}» = «${word.hindi}» (${word.ipa}). Variantes: ${word.variants.join(', ')}.`,
    ),
    wordId: word.id,
  };
}

/** Huecos sobre la frase de ejemplo de la palabra. */
function fillFromExample(word: VocabWord, lesson: Lesson, idx: number): FillBlankExercise | null {
  const lower = word.exampleHi.toLowerCase();
  const target = word.hindi.toLowerCase();
  const at = lower.indexOf(target);
  if (at === -1) return null;
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'fill-blank',
    promptBefore: word.exampleHi.slice(0, at),
    promptAfter: word.exampleHi.slice(at + word.hindi.length),
    hint: `Pista: «${word.exampleEs}»`,
    answers: word.variants,
    explanation: truncateExplanation(
      `La palabra era «${word.hindi}» («${word.spanish}»). Frase: ${word.exampleHi}`,
    ),
    wordId: word.id,
  };
}

function matchingFromWords(words: VocabWord[], lesson: Lesson, idx: number, rng: Rng): MatchingExercise {
  const chosen = pick(words, Math.min(4, Math.max(3, words.length)), rng);
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'matching',
    pairs: chosen.map((w) => ({ left: w.hindi, right: w.spanish })),
    explanation: truncateExplanation(
      `Parejas: ${chosen.map((w) => `${w.hindi} = ${w.spanish}`).join('; ')}`,
    ),
  };
}

interface FlatGrammarExample {
  hindi: string;
  spanish: string;
  ipa: string;
  stepIndex: number;
  exampleIndex: number;
}

function flatExamples(topic: GrammarTopic): FlatGrammarExample[] {
  return topic.steps.flatMap((step, si) =>
    step.examples.map((ex, ei) => ({ ...ex, stepIndex: si, exampleIndex: ei })),
  );
}

/** Hueco sobre la palabra más larga de un ejemplo de gramática. */
function grammarFill(
  topic: GrammarTopic,
  ex: FlatGrammarExample,
  lesson: Lesson,
  idx: number,
): FillBlankExercise {
  const tokens = ex.hindi.split(/\s+/);
  const clean = (t: string) => t.replace(/[.,?!]/g, '');
  let best = tokens[0];
  for (const t of tokens) {
    if (clean(t).length > clean(best).length) best = t;
  }
  const target = clean(best);
  const at = ex.hindi.indexOf(target);
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'fill-blank',
    promptBefore: ex.hindi.slice(0, at),
    promptAfter: ex.hindi.slice(at + target.length),
    hint: `Pista: «${ex.spanish}»`,
    answers: [target],
    explanation: truncateExplanation(`Faltaba «${target}». Frase completa: ${ex.hindi} (${ex.spanish})`),
    audioSrc: grammarAudioSrc(topic.id, ex.stepIndex, ex.exampleIndex),
    phonetic: ex.ipa,
  };
}

function grammarMcq(
  topic: GrammarTopic,
  ex: FlatGrammarExample,
  lesson: Lesson,
  idx: number,
  rng: Rng,
): MultipleChoiceExercise {
  const others = flatExamples(topic).filter((e) => e.spanish !== ex.spanish);
  const distractors = pick(others, 3, rng).map((e) => e.spanish);
  const options = shuffle([ex.spanish, ...distractors], rng);
  return {
    id: `${lesson.id}__${idx}`,
    lessonId: lesson.id,
    skill: lesson.skill,
    type: 'multiple-choice',
    prompt: `¿Qué significa: «${ex.hindi}»?`,
    options,
    correctIndex: options.indexOf(ex.spanish),
    explanation: truncateExplanation(`«${ex.hindi}» = «${ex.spanish}».`),
    audioSrc: grammarAudioSrc(topic.id, ex.stepIndex, ex.exampleIndex),
    phonetic: ex.ipa,
  };
}

// ---------- Generación por lección ----------

/**
 * Genera los ejercicios de una lección de forma determinista
 * (misma semilla => mismos ejercicios, para que /exercises/:id sea estable).
 */
export function generateLessonExercises(lesson: Lesson, seedPrefix = 'lesson'): Exercise[] {
  const rng = makeRng(`${seedPrefix}-${lesson.id}`);
  const words = lesson.vocabIds
    .map((id) => getWord(id))
    .filter((w): w is VocabWord => !!w);
  const exercises: Exercise[] = [];
  let idx = 0;
  const nextId = () => idx++;

  const shuffled = shuffle(words, rng);

  switch (lesson.skill) {
    case 'vocabulary': {
      for (const w of shuffled.slice(0, 3)) exercises.push(mcqHindiToSpanish(w, lesson, nextId(), rng));
      if (words.length >= 3) exercises.push(matchingFromWords(words, lesson, nextId(), rng));
      for (const w of shuffled.slice(3, 5)) {
        const fb = fillFromExample(w, lesson, nextId());
        if (fb) exercises.push(fb);
        else exercises.push(freeTextProduce(w, lesson, idx - 1));
      }
      for (const w of shuffled.slice(5, 7)) exercises.push(freeTextProduce(w, lesson, nextId()));
      break;
    }
    case 'grammar': {
      const topic = lesson.grammarTopicId ? getTopic(lesson.grammarTopicId) : undefined;
      if (topic) {
        const examples = shuffle(flatExamples(topic), rng);
        for (const ex of examples.slice(0, 3)) exercises.push(grammarFill(topic, ex, lesson, nextId()));
        for (const ex of examples.slice(3, 6)) exercises.push(grammarMcq(topic, ex, lesson, nextId(), rng));
      }
      for (const w of shuffled.slice(0, 2)) exercises.push(freeTextProduce(w, lesson, nextId()));
      break;
    }
    case 'listening': {
      for (const w of shuffled.slice(0, 4)) exercises.push(mcqListening(w, lesson, nextId(), rng));
      for (const w of shuffled.slice(4, 8)) exercises.push(freeTextListening(w, lesson, nextId()));
      break;
    }
    case 'speaking': {
      for (const w of shuffled.slice(0, 4)) exercises.push(freeTextProduce(w, lesson, nextId()));
      for (const w of shuffled.slice(4, 6)) exercises.push(mcqSpanishToHindi(w, lesson, nextId(), rng));
      for (const w of shuffled.slice(6, 8)) {
        const fb = fillFromExample(w, lesson, nextId());
        if (fb) exercises.push(fb);
        else exercises.push(freeTextProduce(w, lesson, idx - 1));
      }
      break;
    }
  }
  return exercises;
}

export function findExerciseById(exerciseId: string): Exercise | undefined {
  const sep = exerciseId.lastIndexOf('__');
  if (sep === -1) return undefined;
  const lesson = getLesson(exerciseId.slice(0, sep));
  if (!lesson) return undefined;
  return generateLessonExercises(lesson).find((e) => e.id === exerciseId);
}

// ---------- Evaluación de nivel ----------

export interface AssessmentQuestion {
  exercise: Exercise;
  skill: Skill;
  lessonId: string;
}

/**
 * Min 20 preguntas, min 4 por destreza, ninguna destreza supera el 40%.
 * Con 5 por destreza: 20 preguntas, cada destreza = 25%.
 */
export function generateAssessment(levelId: string): AssessmentQuestion[] {
  const rng = makeRng(`assessment-${levelId}-${todayStr()}`);
  const questions: AssessmentQuestion[] = [];
  const skills: Skill[] = ['vocabulary', 'grammar', 'listening', 'speaking'];
  for (const skill of skills) {
    const lessons = lessonsOfLevel(levelId).filter((l) => l.skill === skill);
    const pool = lessons.flatMap((lesson) =>
      generateLessonExercises(lesson, `assess-${todayStr()}`)
        .filter((e) => e.type !== 'matching')
        .map((exercise) => ({ exercise, skill, lessonId: lesson.id })),
    );
    questions.push(...pick(pool, ASSESSMENT_QUESTIONS_PER_SKILL, rng));
  }
  return shuffle(questions, rng);
}

// ---------- Test de ubicación (módulo) ----------

/** Min 10 preguntas, muestreadas proporcionalmente entre las lecciones del módulo. */
export function generatePlacement(moduleId: string): AssessmentQuestion[] {
  const rng = makeRng(`placement-${moduleId}-${todayStr()}`);
  const lessons = lessonsOfModule(moduleId);
  if (lessons.length === 0) return [];
  const perLesson = Math.max(1, Math.ceil(10 / lessons.length));
  const questions: AssessmentQuestion[] = [];
  for (const lesson of lessons) {
    const pool = generateLessonExercises(lesson, `place-${todayStr()}`)
      .filter((e) => e.type !== 'matching')
      .map((exercise) => ({ exercise, skill: lesson.skill, lessonId: lesson.id }));
    questions.push(...pick(pool, perLesson, rng));
  }
  return shuffle(questions, rng);
}

// ---------- Repaso (repetición espaciada) ----------

export function generateReviewExercise(item: SRItem, seedExtra: string): Exercise | null {
  const rng = makeRng(`review-${item.id}-${seedExtra}`);
  if (item.kind === 'vocab') {
    const word = getWord(item.id);
    if (!word) return null;
    const lessonStub: Lesson = {
      id: `review-${item.id}`,
      moduleId: 'review',
      title: 'Repaso',
      description: '',
      skill: 'vocabulary',
      order: 0,
      vocabIds: [item.id],
    };
    return rng() < 0.5
      ? mcqHindiToSpanish(word, lessonStub, 0, rng)
      : freeTextProduce(word, lessonStub, 0);
  }
  const topic = getTopic(item.id);
  if (!topic) return null;
  const lessonStub: Lesson = {
    id: `review-${item.id}`,
    moduleId: 'review',
    title: 'Repaso',
    description: '',
    skill: 'grammar',
    order: 0,
    vocabIds: [],
  };
  const examples = flatExamples(topic);
  const ex = examples[Math.floor(rng() * examples.length)];
  return rng() < 0.5 ? grammarFill(topic, ex, lessonStub, 0) : grammarMcq(topic, ex, lessonStub, 0, rng);
}
