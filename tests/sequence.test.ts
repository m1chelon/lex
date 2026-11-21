import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { importBackup } from '../src/data/backup';
import { finishSimulado, loadSimulado, saveSimulado, type Simulado } from '../src/learn/simulado';
import { db } from '../src/data/db';
import { reviewQueue, setReviewMark } from '../src/learn/reviewQueue';
import { recordAnswer, regradeAsGuess } from '../src/learn/scheduler';
import { initCorpus } from '../src/data/corpus';
import { buildSession, canConsultStudySource, finishSession, isStudyQuestion, loadSequence, loadSession, questionCheckpoint, recentSequences, resumeSession, saveSession, type SessionConfig } from '../src/learn/session';

const config: SessionConfig = { area: 'geral', focus: 'law:cpp', mode: 'memorizar', minutes: 5 };

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus();
});

afterAll(() => vi.unstubAllGlobals());

it('faz os blocos contarem apenas questões, inclusive o último bloco curto', () => {
  expect(['read', 'cloze-mc', 'term', 'lesson', 'tf'].filter(
    (kind) => isStudyQuestion({ kind } as Parameters<typeof isStudyQuestion>[0]),
  )).toEqual(['cloze-mc', 'tf']);
  expect(questionCheckpoint(1, 7, false)).toBeNull();
  expect(questionCheckpoint(5, 52, true)).toEqual({ block: 1, remaining: 0 });
  expect(questionCheckpoint(6, 52, false)).toEqual({ block: 2, remaining: 5 });
  expect(questionCheckpoint(51, 52, false)).toEqual({ block: 11, remaining: 2 });
  expect(questionCheckpoint(52, 52, true)).toEqual({ block: 11, remaining: 0 });
  expect(questionCheckpoint(21, undefined, false)).toEqual({ block: 5, remaining: 5 });
});

describe('retomada da sequência de artigos', () => {
  it('mantém a sessão pausada e depois abre outra no próximo exercício do mesmo artigo', async () => {
    const s = await buildSession(config);
    expect(s.items.length).toBeGreaterThan(1);
    const first = s.items[0];
    const pausedAt = s.startedAt + 30_000;
    await saveSession({ ...s, pausedAt, results: [{ key: first.key, correct: true, ms: 2000 }] });
    const saved = (await loadSession())!;
    expect(saved.id).toBe(s.id);
    expect(saved.results).toHaveLength(1);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(pausedAt + 700_000);
    const resumed = await resumeSession();
    clock.mockRestore();
    expect(resumed?.startedAt).toBe(s.startedAt + 700_000);
    expect(resumed?.pausedAt).toBeUndefined();

    await finishSession(resumed!, true);
    const savedPosition = (await loadSequence(config))!;
    expect(savedPosition.articleId).toBe(s.items[1].articleId);
    if (first.articleId === savedPosition.articleId) expect(savedPosition.practiced).toContain(first.key);
    const next = await buildSession({ ...config, startArticleId: savedPosition.articleId, sequenceSkip: savedPosition.practiced });
    expect(next.items[0].key).toBe(s.items[1].key);
    expect(await loadSequence({ ...config, order: 'misturado' })).toBeNull();
    expect(await loadSequence({ ...config, activity: 'daily' })).toBeNull();
  });

  it('avança ao próximo artigo após responder ao lote inteiro', async () => {
    const s = await buildSession(config);
    const completed = await finishSession({ ...s, index: s.items.length, results: s.items.map((item) => ({ key: item.key, correct: true, ms: 1000 })) });
    expect(completed.finishedAt).toBeDefined();
    const position = (await loadSequence(config))!;
    const next = await buildSession({ ...config, startArticleId: position.articleId, sequenceSkip: position.practiced });
    expect(next.items[0].articleId).toBe(position.articleId);
    expect(s.items.map((item) => item.articleId)).not.toContain(position.articleId);
    await buildSession({ ...config, focus: 'law:cf' }, false);
    expect((await loadSession())?.id).toBe(next.id);
    expect((await recentSequences())[0]).toMatchObject({ articleId: position.articleId, config: { ...config, order: 'linear' } });
  });

  it('converte uma lacuna antiga de digitação para opções ao retomar Memorizar', async () => {
    const s = await buildSession(config, false);
    const exercise = s.items.find((item) => item.kind === 'cloze-mc')!;
    await saveSession({ ...s, items: [{ ...exercise, kind: 'cloze-type', options: undefined }] });
    const restored = await resumeSession();
    expect(restored?.items[0]).toMatchObject({ key: exercise.key, kind: 'cloze-mc' });
    expect(restored?.items[0].options?.filter((option) => option.correct)).toHaveLength(1);
  });

  it('oferece alternativas para a soberania no art. 1º, I, inclusive ao restaurar uma lacuna antiga', async () => {
    const options = { ...config, focus: 'law:cf', articleIds: ['cf.1'] };
    const memorize = await buildSession(options, false);
    expect(memorize.items.some((item) => item.kind === 'cloze-type')).toBe(false);
    const sovereignty = memorize.items.find((item) => item.answer === 'soberania');
    expect(sovereignty).toMatchObject({ kind: 'cloze-mc', where: 'CF · Art. 1º, inciso I' });
    expect(sovereignty?.options).toHaveLength(4);

    const prove = await buildSession({ ...options, mode: 'provar', mix: 'literal' }, false);
    const typed = prove.items.find((item) => item.answer === 'soberania');
    expect(typed?.kind).toBe('cloze-type');
    const oldItem = { ...typed!, unitId: undefined, articleId: undefined, lawId: undefined };
    await saveSession({ ...memorize, items: [oldItem] });
    const restored = await resumeSession();
    expect(restored?.items[0]).toMatchObject({ key: oldItem.key, kind: 'cloze-mc', answer: 'soberania' });
    expect(restored?.items[0].options?.filter((option) => option.correct)).toHaveLength(1);
  });

  it('retoma uma sessão antiga pelo tempo das questões já respondidas', async () => {
    const s = await buildSession(config);
    await saveSession({ ...s, startedAt: s.startedAt - 700_000, results: [{ key: s.items[0].key, correct: true, ms: 8000 }] });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(s.startedAt);
    const resumed = await resumeSession();
    clock.mockRestore();
    expect(resumed?.startedAt).toBe(s.startedAt - 8000);
  });
});

describe('minha revisão', () => {
  it('distingue motivo do cartão e abre somente o exercício escolhido', async () => {
    const s = await buildSession(config);
    const [wrong, guessed, due, saved] = s.items;
    for (const ex of [wrong, guessed, due, saved]) {
      await recordAnswer({ cardId: ex.key, base: { articleId: ex.articleId, unitId: ex.unitId, dim: ex.dim, type: ex.kind },
        correct: ex !== wrong, ms: 8000, expectedMs: ex.expectedMs, mode: config.mode, type: ex.kind });
    }
    await regradeAsGuess(undefined, guessed.key);
    const dueCard = (await db.cards.get(due.key))!;
    await db.cards.update(due.key, { fsrs: { ...dueCard.fsrs, due: new Date(Date.now() - 60_000) } });
    await setReviewMark(saved.key, true);
    expect(new Map((await reviewQueue()).map(({ card, reason }) => [card.id, reason]))).toEqual(new Map([
      [wrong.key, 'wrong'], [guessed.key, 'guessed'], [due.key, 'due'], [saved.key, 'saved'],
    ]));
    const practice = await buildSession({ ...config, activity: 'review', practiceCardIds: [wrong.key] });
    expect(practice.config.timed).toBe(false);
    expect(practice.items.map(({ key, practice }) => ({ key, practice }))).toEqual([{ key: wrong.key, practice: 'revanche' }]);
    await setReviewMark(saved.key, false);
    expect((await reviewQueue()).some(({ card }) => card.id === saved.key)).toBe(false);
  });
});

describe('persistência do simulado e backup', () => {
  it('mantém a posição e registra uma finalização apenas uma vez', async () => {
    const sim: Simulado = {
      id: 'sim-audit', estilo: 'leiseca', n: 1, tempoMin: null, createdAt: 1, startedAt: 1, title: 'Teste',
      position: 0, questoes: [{ id: 'S:cpp.10.cpt:B:prazos', articleId: 'cpp.10', unitId: 'cpp.10.cpt',
        estilo: 'leiseca', enunciado: 'Qual é o prazo?', options: [{ id: 'ok', text: '10 dias', correct: true }] }],
      respostas: { 'S:cpp.10.cpt:B:prazos': 'ok' },
    };
    await saveSimulado({ ...sim, position: 1 });
    expect((await loadSimulado(sim.id))?.position).toBe(1);
    const [first, second] = await Promise.all([finishSimulado(sim), finishSimulado(sim)]);
    expect(first.finishedAt).toBe(second.finishedAt);
    await saveSimulado({ ...sim, respostas: {} });
    expect((await loadSimulado(sim.id))?.respostas).toEqual(sim.respostas);
    const rows = await db.reviews.where('cardId').equals(sim.questoes[0].id).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dim: 'prazos', correct: true, given: '10 dias' });
  });

  it('preserva revisões com IDs coincidentes e ignora a reimportação do mesmo backup', async () => {
    const rows = await db.reviews.toArray();
    const [{ id, ...original }] = rows;
    const incoming = { ...original, id, at: original.at + 123, given: 'de outro aparelho' };
    const backup = { app: 'LEX', version: 2, reviews: [incoming] };
    const file = { text: async () => JSON.stringify(backup) };
    await importBackup(file);
    await importBackup(file);
    expect(await db.reviews.count()).toBe(rows.length + 1);
    expect(await db.reviews.get(id!)).toMatchObject(original);
    await expect(importBackup({ text: async () => JSON.stringify({ ...backup, cards: [{}] }) })).rejects.toThrow();
    expect(await db.reviews.count()).toBe(rows.length + 1);
  });
});
it('só libera a fonte de uma questão depois de uma resposta avaliada', () => {
  for (const kind of ['cloze-mc', 'cloze-type', 'cloze-multi', 'tf', 'spot', 'order', 'case', 'which-article', 'concept', 'doctrine', 'rubric'] as const) {
    expect(canConsultStudySource({ kind })).toBe(false);
    expect(canConsultStudySource({ kind }, null)).toBe(false);
    expect(canConsultStudySource({ kind }, false)).toBe(true);
    expect(canConsultStudySource({ kind }, true)).toBe(true);
  }
  for (const kind of ['read', 'lesson', 'term'] as const) expect(canConsultStudySource({ kind })).toBe(true);
});
