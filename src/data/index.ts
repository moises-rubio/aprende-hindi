import levelsRaw from './levels.json';
import vocabRaw from './vocabulary.json';
import grammarRaw from './grammar.json';
import type { GrammarTopic, Lesson, Level, Module, VocabWord } from '../types';

export const LEVELS: Level[] = (levelsRaw.levels as Level[])
  .slice()
  .sort((a, b) => a.order - b.order);

export const MODULES: Module[] = (levelsRaw.modules as Module[]).slice();

export const LESSONS: Lesson[] = (levelsRaw.lessons as Lesson[]).slice();

export const VOCAB: VocabWord[] = vocabRaw as VocabWord[];

export const GRAMMAR_TOPICS: GrammarTopic[] = grammarRaw as GrammarTopic[];

const levelById = new Map(LEVELS.map((l) => [l.id, l]));
const moduleById = new Map(MODULES.map((m) => [m.id, m]));
const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
const wordById = new Map(VOCAB.map((w) => [w.id, w]));
const topicById = new Map(GRAMMAR_TOPICS.map((t) => [t.id, t]));

export function getLevel(id: string): Level | undefined {
  return levelById.get(id as Level['id']);
}

export function getModule(id: string): Module | undefined {
  return moduleById.get(id);
}

export function getLesson(id: string): Lesson | undefined {
  return lessonById.get(id);
}

export function getWord(id: string): VocabWord | undefined {
  return wordById.get(id);
}

export function getTopic(id: string): GrammarTopic | undefined {
  return topicById.get(id);
}

export function modulesOfLevel(levelId: string): Module[] {
  return MODULES.filter((m) => m.levelId === levelId).sort((a, b) => a.order - b.order);
}

export function lessonsOfModule(moduleId: string): Lesson[] {
  return LESSONS.filter((l) => l.moduleId === moduleId).sort((a, b) => a.order - b.order);
}

export function lessonsOfLevel(levelId: string): Lesson[] {
  return modulesOfLevel(levelId).flatMap((m) => lessonsOfModule(m.id));
}

export function topicsOfLevel(levelId: string): GrammarTopic[] {
  return GRAMMAR_TOPICS.filter((t) => t.levelId === levelId);
}

/** Todos los módulos en orden global de la ruta de aprendizaje (nivel, luego orden). */
export function orderedModules(): Module[] {
  return LEVELS.flatMap((lvl) => modulesOfLevel(lvl.id));
}

/** Todas las lecciones en orden global. */
export function orderedLessons(): Lesson[] {
  return orderedModules().flatMap((m) => lessonsOfModule(m.id));
}
