import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PUBLISHED_DOCTRINE_COURSES } from '../src/content/doctrineCatalog';
import { EDITAL_SUBJECTS } from '../src/content/editalBasico';
import { initCorpus } from '../src/data/corpus';
import { buildDoctrineSession, doctrineExamQuestions, doctrineExercise, doctrineLabel } from '../src/learn/doctrineCourses';
import { editalQuestionCount, finishSimulado, gerarSimuladoEdital, simuladoErrors, updateSimulado } from '../src/learn/simulado';
import { db } from '../src/data/db';

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus();
});
afterAll(() => vi.unstubAllGlobals());

const course = (id: string) => PUBLISHED_DOCTRINE_COURSES.find((c) => c.id === id)!;

describe('cursos de Língua Portuguesa e Informática', () => {
  it('cada tópico do edital aponta blocos existentes com questões suficientes', () => {
    for (const subjects of Object.values(EDITAL_SUBJECTS)) {
      for (const subject of subjects) {
        const chapters = course(subject.courseId).books.flatMap((book) => book.chapters);
        for (const topic of subject.topics) {
          const linked = chapters.filter((chapter) => topic.chapters.includes(chapter.id));
          expect(linked.map(({ id }) => id).sort(), topic.texto).toEqual([...topic.chapters].sort());
          expect(linked.reduce((n, chapter) => n + chapter.questions.length, 0), topic.texto).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });

  it('não repete enunciados e mantém explicação em todas as questões', () => {
    for (const id of ['portugues', 'informatica']) {
      const questions = course(id).books.flatMap((book) => book.chapters.flatMap((chapter) => chapter.questions));
      expect(new Set(questions.map((q) => q.prompt)).size).toBe(questions.length);
      expect(questions.every((q) => q.explanation.length >= 20)).toBe(true);
    }
  });

  it('usa o nome da disciplina no lugar de "Doutrina" e monta sessões de estudo', async () => {
    expect(doctrineLabel('portugues')).toBe('Língua Portuguesa');
    expect(doctrineLabel('penal')).toBe('Doutrina');
    const items = await buildDoctrineSession({ courseId: 'informatica', filter: 'study' }, 'semente');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.doctrine?.courseId === 'informatica' && item.doctrineParts?.length)).toBe(true);
    const ex = doctrineExercise(items[0].key, 'x')!;
    expect(ex.doctrineParts!.every((part) => part.options.filter((o) => o.correct).length === 1)).toBe(true);
  });

  it('seleciona questões de 5 alternativas espalhadas pelos blocos', async () => {
    const items = await doctrineExamQuestions('portugues', 16, 'teste');
    expect(items).toHaveLength(16);
    expect(items.every((item) => item.options.length === 5 && item.options.filter((o) => o.correct).length === 1)).toBe(true);
    expect(new Set(items.map((item) => item.chapterId)).size).toBeGreaterThanOrEqual(12);
  });
});

it('o simulado do TJSP traz Português, Direito e Informática e registra as respostas no curso', async () => {
  const sim = await gerarSimuladoEdital('tjsp', null);
  expect(sim.questoes).toHaveLength(editalQuestionCount('tjsp'));
  const by = (bloco: string) => sim.questoes.filter((q) => q.bloco === bloco);
  expect(by('I')).toHaveLength(16);
  expect(by('II')).toHaveLength(30);
  expect(by('III')).toHaveLength(9);
  expect(by('I').every((q) => q.disciplina === 'Língua Portuguesa' && q.doctrineKey?.startsWith('D:portugues:'))).toBe(true);
  expect(by('III').every((q) => q.disciplina === 'Informática' && q.options?.length === 5)).toBe(true);
  const pt = by('I')[0];
  const wrong = pt.options!.find((o) => !o.correct)!;
  await updateSimulado(sim.id, { questionId: pt.id, optionId: wrong.id });
  const done = await finishSimulado(sim.id);
  expect(await db.cards.get(pt.doctrineKey!)).toMatchObject({ type: 'doctrine', wrong: 1 });
  const retry = simuladoErrors(done).find((ex) => ex.key === pt.doctrineKey);
  expect(retry).toMatchObject({ kind: 'doctrine', doctrine: { courseId: 'portugues' } });
}, 60_000);
