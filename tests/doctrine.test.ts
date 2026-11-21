import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { ADMINISTRATIVE_COURSE } from '../src/content/administrativo';
import { CIVIL_COURSE } from '../src/content/civil';
import { CONSTITUTIONAL_COURSE } from '../src/content/constitutional';
import { CONSUMER_COURSE } from '../src/content/consumidor';
import { COURSE_BOOKS, DOCTRINE_COURSES } from '../src/content/courseBank';
import { ELECTORAL_COURSE } from '../src/content/electoral';
import { PENAL_COURSE } from '../src/content/penal';
import { CIVIL_PROCEDURE_COURSE } from '../src/content/processo-civil';
import { CRIMINAL_PROCEDURE_COURSE } from '../src/content/processo-penal';
import { buildDoctrineSession, doctrineExercise, doctrineProgress, gradeDoctrineParts, isCurrentDoctrineQuestion } from '../src/learn/doctrineCourses';
import { doutrinaMeta, importDoutrina, loadDoutrinaLaw, removeDoutrina } from '../src/learn/doutrinaStore';
import { reviewQueue } from '../src/learn/reviewQueue';
import { recordAnswer } from '../src/learn/scheduler';
import { buildSession, resumeSession, saveSession } from '../src/learn/session';

it('mantém os identificadores do histórico anterior', () => {
  const keys = new Set<string>();
  const sources = new Set<string>();
  for (const course of DOCTRINE_COURSES) for (const module of course.modules) {
    sources.add(module.book);
    for (const [id, , , , pages] of module.facts) for (const format of ['case', 'criterion']) {
      const key = `D:${course.id}:${module.id}:${id}:${format}`;
      const question = doctrineExercise(key, 'conferencia')!;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options?.map((option) => option.text)).size).toBe(4);
      expect(question.options?.filter((option) => option.correct)).toHaveLength(1);
      expect(question.options?.find((option) => option.correct)?.why).toBeTruthy();
      expect(question.doctrine?.pages).toBe(pages);
      expect(question.doctrine?.source).toBe(COURSE_BOOKS[module.book]);
      expect(isCurrentDoctrineQuestion(key)).toBe(false);
    }
  }
  expect(sources.size).toBe(19);
  expect(keys.size).toBeGreaterThanOrEqual(200);
});

it.each([
  { course: CONSTITUTIONAL_COURSE, ranges: [[59, 1, 1008], [16, 1, 1169]], minimum: 821 },
  { course: ELECTORAL_COURSE, ranges: [[27, 1, 976], [28, 977, 1477]], minimum: 600 },
  { course: PENAL_COURSE, ranges: [[33, 1, 646], [24, 1, 456], [30, 1, 688], [23, 1, 1336], [13, 1, 175]], minimum: 800 },
  { course: CIVIL_PROCEDURE_COURSE, ranges: [[28, 1022, 1740], [30, 1741, 2327], [32, 2328, 3257], [32, 1, 590], [28, 591, 1021]], minimum: 800 },
  { course: CRIMINAL_PROCEDURE_COURSE, ranges: [[25, 1, 221], [29, 222, 561], [32, 562, 850], [33, 851, 1108], [41, 1, 1218]], minimum: 740 },
  { course: CIVIL_COURSE, ranges: [[32, 1, 745], [33, 1, 710], [36, 1, 846], [34, 1, 893], [35, 1, 930], [35, 1, 739]], minimum: 1000 },
  { course: ADMINISTRATIVE_COURSE, ranges: [[29, 1, 229], [48, 230, 520], [48, 521, 822], [26, 823, 952], [41, 953, 1137]], minimum: 750 },
  { course: CONSUMER_COURSE, ranges: [[29, 1, 153], [32, 154, 318], [29, 319, 482], [39, 483, 648], [25, 649, 778], [53, 779, 1015]], minimum: 720 },
])('cobre $course.title com questões autônomas, respostas únicas e referências internas', ({ course, ranges, minimum }) => {
  const { id, books } = course;
  expect(books.map((book) => [book.chapters.length, book.startPage, book.endPage])).toEqual(ranges);
  const prompts = new Set<string>();
  const formats = new Set<number>();
  let count = 0;
  for (const book of books) for (const chapter of book.chapters) {
    expect(chapter.questions.length).toBeGreaterThan(0);
    for (const entry of chapter.questions) {
      count++;
      expect(prompts.has(entry.prompt)).toBe(false);
      prompts.add(entry.prompt);
      expect(`${entry.prompt} ${entry.explanation}`).not.toMatch(/\b(?:na obra|da obra|pela obra|no livro|no início do capítulo|o capítulo examina)\b/iu);
      const exercise = doctrineExercise(`D:${id}:${chapter.id}:${entry.id}`, 'conferencia')!;
      expect(isCurrentDoctrineQuestion(exercise.key)).toBe(true);
      const options = exercise.options!;
      const parts = exercise.doctrineParts!;
      expect(parts).toHaveLength(3);
      expect(new Set(parts.map(({ prompt }) => prompt)).size).toBe(3);
      for (const part of parts) expect(part.options.filter(({ correct }) => correct)).toHaveLength(1);
      const choices = parts.map((part) => part.options.find(({ correct }) => correct)!.id);
      expect(gradeDoctrineParts(parts, choices)).toBe(true);
      expect(gradeDoctrineParts(parts, choices.slice(0, 2))).toBe(false);
      choices[2] = parts[2].options.find(({ correct }) => !correct)!.id;
      expect(gradeDoctrineParts(parts, choices)).toBe(false);
      formats.add(options.length);
      if (entry.distractors) expect(options).toHaveLength(4);
      else expect(options.map((option) => option.text)).toEqual(['Certo', 'Errado']);
      expect(new Set(options.map((option) => option.text)).size).toBe(options.length);
      const answers = options.filter((option) => option.correct);
      expect(answers).toHaveLength(1);
      expect(answers[0].why).toBe(entry.explanation);
      expect(exercise.doctrine).toMatchObject({ source: COURSE_BOOKS[book.id], pages: entry.pages, module: chapter.title });
    }
  }
  expect(count).toBeGreaterThanOrEqual(minimum);
  expect(formats).toEqual(new Set([2, 4]));
});

it('atualiza a doutrina constitucional sem perder as outras leis já importadas', async () => {
  const law = (id: string, articles: string[]) => ({
    law: id, obras: ['Obra de teste'], arts: Object.fromEntries(articles.map((number) => [number, []])),
  });
  const file = (leis: Record<string, ReturnType<typeof law>>) => new File([
    JSON.stringify({ formato: 'lex-doutrina', versao: 1, geradoEm: '2026-11-21', leis }),
  ], 'lex-doutrina.json');
  const penal = law('cp', ['1', '2']);
  try {
    await importDoutrina(file({ cp: penal, cf: law('cf', ['1']) }));
    const constitutional = law('cf', ['5', '37', '60']);
    const meta = await importDoutrina(file({ cf: constitutional }));
    expect(meta).toMatchObject({ leis: 2, artigos: 5 });
    expect(await doutrinaMeta()).toEqual(meta);
    expect(await loadDoutrinaLaw('cp')).toEqual(penal);
    expect(await loadDoutrinaLaw('cf')).toEqual(constitutional);
  } finally {
    await removeDoutrina();
  }
});

it('pratica uma trilha de Eleitoral e mantém seus erros restritos ao curso', async () => {
  const scope = { courseId: 'eleitoral', book: 'eleitoralCrimes', filter: 'study' } as const;
  const criminal = await buildDoctrineSession(scope, 'teste-eleitoral');
  expect(criminal).toHaveLength(8);
  expect(criminal[0].key).toBe('D:eleitoral:p01:1');
  expect(criminal.every((question) => question.doctrine?.source === COURSE_BOOKS.eleitoralCrimes)).toBe(true);
  const chapter = await buildDoctrineSession({ ...scope, moduleId: 'p28' }, 'teste-último-bloco');
  expect(chapter).toHaveLength(3);
  expect(chapter.every((question) => question.key.startsWith('D:eleitoral:p28:'))).toBe(true);

  const { key, dim, kind, expectedMs } = criminal[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...scope, filter: 'errors' }, 'revisão')).map((question) => question.key)).toEqual([key]);
  expect(await buildDoctrineSession({ ...scope, book: 'eleitoral', filter: 'errors' }, 'outra-trilha')).toEqual([]);
  expect((await doctrineProgress('constitucional')).some((question) => question.key === key)).toBe(false);
});

it('mantém o treino e a revisão de Direito Penal na trilha escolhida', async () => {
  const scope = { courseId: 'penal', book: 'organizacoes', moduleId: 'o01', filter: 'study' } as const;
  const session = await buildDoctrineSession(scope, 'organizações');
  expect(session).toHaveLength(8);
  expect(session.every(({ doctrine }) => doctrine?.source === COURSE_BOOKS.organizacoes)).toBe(true);
  expect(session[0].key).toBe('D:penal:o01:1');

  const { key, dim, kind, expectedMs } = session[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...scope, filter: 'errors' }, 'revisão penal')).map((question) => question.key)).toEqual([key]);
  expect(await buildDoctrineSession({ courseId: 'penal', book: 'penal1', filter: 'errors' }, 'parte geral')).toEqual([]);
  expect((await doctrineProgress('eleitoral')).some((question) => question.key === key)).toBe(false);
});

it('separa as trilhas de Processo Civil mesmo quando usam o mesmo volume', async () => {
  const courseId = 'processo-civil';
  const execution = { courseId, book: 'processoCivilExecucao', moduleId: 'x05', filter: 'study' } as const;
  const questions = await buildDoctrineSession(execution, 'impugnação');
  expect(questions).toHaveLength(8);
  expect(questions.every(({ key }) => key.startsWith('D:processo-civil:x05:'))).toBe(true);

  const { key, dim, kind, expectedMs } = questions[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...execution, filter: 'errors' }, 'revisão')).map((question) => question.key)).toEqual([key]);
  expect(await buildDoctrineSession({ courseId, book: 'processoCivilTribunais', filter: 'errors' }, 'tribunais')).toEqual([]);
  expect((await doctrineProgress(courseId)).find((question) => question.key === key)).toMatchObject({ answered: true, correct: false });
});

it('mantém o estudo e os erros de Processo Penal no bloco e na trilha selecionados', async () => {
  const courseId = 'processo-penal';
  const scope = { courseId, book: 'processoPenalProvas', moduleId: 'm22', filter: 'study' } as const;
  const questions = await buildDoctrineSession(scope, 'reconhecimento');
  expect(questions).toHaveLength(5);
  expect(questions.every(({ key }) => key.startsWith('D:processo-penal:m22:'))).toBe(true);

  const { key, dim, kind, expectedMs } = questions[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...scope, filter: 'errors' }, 'revisão')).map((question) => question.key)).toEqual([key]);
  expect(await buildDoctrineSession({ courseId, book: 'processoPenal', filter: 'errors' }, 'fundamentos')).toEqual([]);
  expect((await doctrineProgress(courseId)).find((question) => question.key === key)).toMatchObject({ answered: true, correct: false });
});

it('refaz os erros de Sucessões sem misturá-los aos demais volumes de Direito Civil', async () => {
  const scope = { courseId: 'civil', book: 'civil6', moduleId: 's14', filter: 'study' } as const;
  const questions = await buildDoctrineSession(scope, 'reserva e representação');
  expect(questions).toHaveLength(4);
  expect(questions.every(({ key }) => key.startsWith('D:civil:s14:'))).toBe(true);

  const { key, dim, kind, expectedMs } = questions[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...scope, filter: 'errors' }, 'revisão civil')).map(({ key }) => key)).toEqual([key]);
  expect(await buildDoctrineSession({ courseId: 'civil', book: 'civil5', filter: 'errors' }, 'família')).toEqual([]);
});

it('seleciona a trilha de licitações e registra a revisão em Direito Administrativo', async () => {
  const courseId = 'administrativo';
  const scope = { courseId, book: 'administrativoContratos', moduleId: 'b32', filter: 'study' } as const;
  const questions = await buildDoctrineSession(scope, 'inexigibilidade');
  expect(questions.map(({ key }) => key)).toEqual(['D:administrativo:b32:1', 'D:administrativo:b32:2', 'D:administrativo:b32:3']);
  expect(questions[0].doctrine).toMatchObject({ source: 'Direito Administrativo', pages: '448–449' });

  const { key, dim, kind, expectedMs } = questions[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...scope, filter: 'errors' }, 'revisão')).map((question) => question.key)).toEqual([key]);
  expect(await buildDoctrineSession({ courseId, book: 'administrativoControle', filter: 'errors' }, 'controle')).toEqual([]);
});

it('separa a revisão de cadastros e de contratos em Direito do Consumidor', async () => {
  const courseId = 'consumidor';
  const scope = { courseId, book: 'consumidorMercado', moduleId: 'd29', filter: 'study' } as const;
  const questions = await buildDoctrineSession(scope, 'notificação da negativação');
  expect(questions).toHaveLength(4);
  expect(questions.every(({ key }) => key.startsWith('D:consumidor:d29:'))).toBe(true);

  const { key, dim, kind, expectedMs } = questions[0];
  await recordAnswer({ cardId: key, base: { dim, type: kind }, correct: false, ms: 1000, expectedMs, mode: 'memorizar', type: kind });
  expect((await buildDoctrineSession({ ...scope, filter: 'errors' }, 'revisão')).map((question) => question.key)).toEqual([key]);
  expect(await buildDoctrineSession({ courseId, book: 'consumidorContratos', filter: 'errors' }, 'contratos')).toEqual([]);
  expect((await doctrineProgress(courseId)).find((question) => question.key === key)).toMatchObject({ answered: true, correct: false });
});

it('atualiza enunciados doutrinários pendentes ao retomar uma sessão anterior', async () => {
  const session = await buildSession({ area: 'geral', focus: 'auto', minutes: 7, mode: 'memorizar', activity: 'doctrine',
    doctrine: { courseId: 'constitucional', moduleId: 't01', filter: 'study' } }, false);
  const [answered, pending, ...rest] = session.items;
  const results = [{ key: answered.key, correct: true, ms: 1000 }];
  await saveSession({ ...session, index: 1, results, items: [answered, { ...pending, prompt: 'Qual hipótese foi examinada na obra?' }, ...rest] });
  const resumed = await resumeSession();
  expect(resumed?.items[1]).toMatchObject({ key: pending.key, prompt: pending.prompt });
  expect(resumed?.results).toEqual(results);
});

it('registra o progresso da doutrina e refaz erros sem misturar questões de lei seca', async () => {
  const config = { area: 'geral', focus: 'auto', minutes: 7, mode: 'memorizar', activity: 'doctrine',
    doctrine: { courseId: 'constitucional', moduleId: 't06', filter: 'study' } } as const;
  const session = await buildSession(config, false);
  expect(session.config.timed).toBe(false);
  expect(session.items).toHaveLength(8);
  expect(session.items.every((question) => question.kind === 'doctrine')).toBe(true);
  const question = session.items[0];
  await recordAnswer({ cardId: question.key, base: { dim: question.dim, type: question.kind },
    correct: false, ms: 1000, expectedMs: question.expectedMs, mode: config.mode, type: question.kind });
  expect((await doctrineProgress('constitucional')).find((entry) => entry.key === question.key)).toMatchObject({ answered: true, correct: false });
  expect((await buildDoctrineSession({ ...config.doctrine, filter: 'errors' }, 'a')).map(({ key }) => key)).toEqual([question.key]);
  expect((await buildDoctrineSession(config.doctrine, 'b')).map(({ key }) => key)).not.toContain(question.key);
  expect((await reviewQueue()).find(({ card }) => card.id === question.key)?.reason).toBe('wrong');

  const book = { courseId: 'constitucional', book: 'constitucional', filter: 'study' } as const;
  const secondBook = await buildDoctrineSession(book, 'segunda-obra');
  expect(secondBook).toHaveLength(8);
  expect(secondBook[0].key).toBe('D:constitucional:m01:1');
  expect(secondBook.every((question) => question.doctrine?.source === COURSE_BOOKS.constitucional)).toBe(true);
  expect(await buildDoctrineSession({ ...book, filter: 'errors' }, 'c')).toEqual([]);
});
