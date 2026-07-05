import { beforeEach, describe, expect, it } from 'vitest';
import { LESSONS, VOCAB, getWord } from '../src/data';
import {
  correctAnswerText,
  findExerciseById,
  generateAssessment,
  generateLessonExercises,
  generatePlacement,
  matchesAnswer,
  normalizeText,
} from '../src/services/exerciseEngine';

beforeEach(() => localStorage.clear());

describe('normalizeText', () => {
  it('quita tildes, mayúsculas y puntuación', () => {
    expect(normalizeText('  Namasté!  ')).toBe('namaste');
    expect(normalizeText('DHANYAVAAD')).toBe('dhanyavaad');
    expect(normalizeText('a  b\tc')).toBe('a b c');
  });
});

describe('matchesAnswer', () => {
  it('acepta variantes exactas', () => {
    expect(matchesAnswer(['namaste', 'namastey'], 'Namastey')).toBe(true);
    expect(matchesAnswer(['se', 'sey'], 'xx')).toBe(false);
  });

  it('tolera una errata en palabras de 5+ letras', () => {
    expect(matchesAnswer(['dhanyavaad'], 'dhanyavad')).toBe(true); // letra de menos
    expect(matchesAnswer(['parivaar'], 'parivbar')).toBe(true); // letra cambiada
    expect(matchesAnswer(['parivaar'], 'parivxyz')).toBe(false); // demasiados cambios
  });

  it('NO tolera erratas en palabras cortas (evita falsos positivos)', () => {
    expect(matchesAnswer(['se'], 'me')).toBe(false);
    expect(matchesAnswer(['kal'], 'mal')).toBe(false);
  });
});

describe('generateLessonExercises', () => {
  it('es determinista (misma semilla, mismos ejercicios)', () => {
    const lesson = LESSONS[0];
    const a = generateLessonExercises(lesson);
    const b = generateLessonExercises(lesson);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('genera ejercicios para TODAS las lecciones', () => {
    for (const lesson of LESSONS) {
      const exs = generateLessonExercises(lesson);
      expect(exs.length, `lección ${lesson.id}`).toBeGreaterThanOrEqual(4);
      for (const ex of exs) {
        expect(ex.explanation.length).toBeLessThanOrEqual(200);
        if (ex.type === 'multiple-choice') {
          expect(ex.options).toHaveLength(4);
          expect(ex.options[ex.correctIndex]).toBeDefined();
        }
        if (ex.type === 'matching') {
          expect(ex.pairs.length).toBeGreaterThanOrEqual(3);
          expect(ex.pairs.length).toBeLessThanOrEqual(6);
        }
        expect(correctAnswerText(ex)).toBeTruthy();
      }
    }
  });

  it('los ejercicios se pueden reencontrar por id (ruta /exercises/:id)', () => {
    const lesson = LESSONS[0];
    const exs = generateLessonExercises(lesson);
    const found = findExerciseById(exs[2].id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(exs[2].id);
  });
});

describe('generateAssessment', () => {
  it.each(['A1', 'A2', 'B1'])('nivel %s: >=20 preguntas, ninguna destreza >40%%', (levelId) => {
    const qs = generateAssessment(levelId);
    expect(qs.length).toBeGreaterThanOrEqual(20);
    const bySkill = new Map<string, number>();
    for (const q of qs) bySkill.set(q.skill, (bySkill.get(q.skill) ?? 0) + 1);
    for (const [skill, count] of bySkill) {
      expect(count, `destreza ${skill}`).toBeGreaterThanOrEqual(4);
      expect(count / qs.length, `destreza ${skill}`).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('generatePlacement', () => {
  it('todos los módulos: >=10 preguntas repartidas entre lecciones', () => {
    const moduleIds = [...new Set(LESSONS.map((l) => l.moduleId))];
    for (const moduleId of moduleIds) {
      const qs = generatePlacement(moduleId);
      expect(qs.length, `módulo ${moduleId}`).toBeGreaterThanOrEqual(10);
      const lessonsCovered = new Set(qs.map((q) => q.lessonId));
      expect(lessonsCovered.size, `módulo ${moduleId}`).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('datos de contenido', () => {
  it('cada palabra tiene >=2 variantes y su ejemplo contiene la palabra', () => {
    for (const w of VOCAB) {
      expect(w.variants.length, w.id).toBeGreaterThanOrEqual(2);
      expect(w.exampleHi.toLowerCase(), w.id).toContain(w.hindi.toLowerCase());
    }
  });

  it('todas las lecciones referencian palabras existentes', () => {
    for (const lesson of LESSONS) {
      for (const id of lesson.vocabIds) {
        expect(getWord(id), `${lesson.id} -> ${id}`).toBeDefined();
      }
    }
  });
});
