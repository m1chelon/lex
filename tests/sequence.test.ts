import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { importBackup } from '../src/data/backup';
import { createBackupBlob } from '../src/data/profileBackup';
import { finishSimulado, gerarSimulado, listSimulados, loadSimulado, saveSimulado, simuladoErrors, updateSimulado, type Simulado } from '../src/learn/simulado';
import { baterPonto, getPontos, pontoHoje } from '../src/learn/ponto';
import { db } from '../src/data/db';
import { reviewQueue, setReviewMark } from '../src/learn/reviewQueue';
import { recordAnswer, regradeAsGuess } from '../src/learn/scheduler';
import { getArticle, initCorpus } from '../src/data/corpus';
import { buildSession, canConsultStudySource, exerciseForCard, extendSession, finishSession, isStudyQuestion, loadSequence, loadSession, pendingSessionErrors, questionCheckpoint, recentSequences, requireCurrentSession, resumeSession, saveSession, scopeArticles, SessionConflict, type SessionConfig } from '../src/learn/session';
import { planToConfig } from '../src/learn/plan';
import { buildOrder, buildRubric, buildWhich, shuffledOrderItems } from '../src/learn/generators';
import { normAnswer } from '../src/learn/text';
import { getStats } from '../src/learn/stats';

const config: SessionConfig = { area: 'geral', focus: 'law:cpp', mode: 'memorizar', minutes: 5 };

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus();
});

afterAll(() => vi.unstubAllGlobals());

it('abre Legislação Interna do TJSP com o recorte próprio após um treino de Constitucional', async () => {
  const constitutional = await buildSession({ ...config, area: 'tjsp', focus: 'topico:4. Direito Constitucional' });
  const internal = planToConfig({ scope: { kind: 'curso', area: 'tjsp', topico: '6. Legislação Interna' }, mode: 'memorizar', minutes: 5 });
  const articles = await scopeArticles(internal, 1);
  expect(new Set(articles.map((id) => id.split('.')[0]))).toEqual(new Set(['res850', 'res963', 'lc1111', 'ritjsp', 'nscgj']));
  const training = await buildSession(internal, false);
  expect(training.items.length).toBeGreaterThan(0);
  expect(training.items.every((item) => item.articleId && articles.includes(item.articleId))).toBe(true);
  expect((await loadSession())?.id).toBe(constitutional.id);
});

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

it('usa os mesmos sete dias no gráfico e na taxa de acertos e ignora registros futuros', async () => {
  const now = new Date(2020, 5, 14, 15);
  const row = { cardId: 'audit-stats', dim: 'literal', type: 'cloze-mc', rating: 3, ms: 30_000, mode: 'memorizar' } as const;
  await db.reviews.bulkAdd([
    { ...row, at: +new Date(2020, 5, 7, 16), correct: false },
    { ...row, at: +new Date(2020, 5, 8, 0), correct: true },
    { ...row, at: +new Date(2020, 5, 13, 12), correct: true },
    { ...row, at: +new Date(2020, 5, 14, 16), correct: false },
  ]);
  try {
    expect(await getStats(now)).toMatchObject({ todayCount: 0, todayMs: 0, streak: 1, accuracy7: 1,
      lastPracticeAt: +new Date(2020, 5, 13, 12) });
    expect((await getStats(now)).days.map(({ ms }) => ms)).toEqual([30_000, 0, 0, 0, 0, 30_000, 0]);
  } finally { await db.reviews.where('cardId').equals(row.cardId).delete(); }
});

it('recomeça um treino infinito de um único exercício, mesmo com a revisão agendada', async () => {
  const active = await buildSession({ ...config, articleIds: ['cpp.3'], infinite: true, order: 'misturado' }, false);
  const literal = active.items.find(({ key }) => key.startsWith('L:'))!;
  expect(literal).toBeDefined();
  for (const ex of active.items) {
    await recordAnswer({ cardId: ex.key, base: { articleId: ex.articleId, unitId: ex.unitId, dim: ex.dim, type: ex.kind },
      correct: true, ms: 1000, expectedMs: ex.expectedMs, mode: config.mode, type: ex.kind });
    const card = (await db.cards.get(ex.key))!;
    await db.cards.update(ex.key, { fsrs: { ...card.fsrs, due: new Date(Date.now() + 86_400_000) } });
  }
  const extended = await extendSession({ ...active, index: active.items.length });
  expect(extended.items.slice(active.items.length).map(({ key }) => key)).toContain(literal.key);
  expect(extended.seed).not.toBe(active.seed);
  await db.cards.bulkDelete(active.items.map(({ key }) => key));
  await db.reviews.where('cardId').anyOf(active.items.map(({ key }) => key)).delete();
});

it('revisa o mesmo parágrafo do exercício de ordenar incisos', async () => {
  const key = 'O:cf.14:cf.14.p3';
  const { updated } = await recordAnswer({ cardId: key, base: { articleId: 'cf.14', dim: 'literal', type: 'order' },
    correct: true, ms: 1000, expectedMs: 30_000, mode: config.mode, type: 'order' });
  const ex = await exerciseForCard(updated, 'memorizar', 'teste');
  expect(ex).toMatchObject({ key, kind: 'order' });
  expect(ex?.orderItems?.every(({ id }) => id.startsWith('cf.14.p3.'))).toBe(true);
  await expect(exerciseForCard({ ...updated, id: 'O:cf.14:cf.14.desconhecido' }, 'memorizar', 'teste')).resolves.toBeNull();
  await db.cards.delete(key);
  await db.reviews.where('cardId').equals(key).delete();
});

it('sugere cada erro uma vez e retira da revisão os acertos na repetição', async () => {
  const active = await buildSession(config, false);
  const [corrected, missed] = active.items;
  const items = [corrected, missed, corrected, missed, missed];
  const results = items.slice(0, -1).map(({ key }, index) => ({ key, ms: 1000, correct: index === 2 }));
  expect(pendingSessionErrors({ items, results })).toEqual([missed]);
});

it('prioriza a lacuna do percentual no treino, no diário e na prova da Resolução 850', async () => {
  const cfg: SessionConfig = { ...config, focus: 'law:res850', articleIds: ['res850.9'] };
  const itemAtLimit = (state: Awaited<ReturnType<typeof buildSession>>) => state.items.find(
    (item) => item.unitId === 'res850.9.i2' && item.dim === 'literal',
  );
  const normal = await buildSession(cfg, false);
  const daily = await buildSession({ ...cfg, activity: 'daily' }, false);
  const typed = await buildSession({ ...cfg, mode: 'provar', mix: 'literal' }, false);
  expect(itemAtLimit(normal)).toMatchObject({ kind: 'cloze-mc', answer: '70% (setenta por cento)' });
  expect(itemAtLimit(daily)).toMatchObject({ kind: 'cloze-mc', answer: '70% (setenta por cento)' });
  expect(itemAtLimit(typed)).toMatchObject({ kind: 'cloze-type', answer: '70% (setenta por cento)' });
  const exam = await gerarSimulado(cfg, 'leiseca', 3, null);
  const percentItem = exam.questoes.find((question) => question.unitId === 'res850.9.i2');
  expect(percentItem).toMatchObject({ target: '70% (setenta por cento)' });
  expect(percentItem?.options).toHaveLength(5);
  expect(percentItem?.texto).toContain('até ________ do quadro');
});

it('abre Jogar → Memorizar com dois pontos independentes no Regimento Interno', async () => {
  const plan = {
    scope: { kind: 'curso', area: 'tjsp', topico: '6. Legislação Interna', law: 'ritjsp' },
    mode: 'memorizar', minutes: 10,
  } as const;
  const state = await buildSession(planToConfig(plan), false);
  const selected = state.items.filter(({ unitId }) => unitId === 'ritjsp.10.p1');
  expect(selected.map(({ answer }) => answer)).toEqual(['quinze dias', 'vinte dias']);
  expect(new Set(selected.map(({ key }) => key)).size).toBe(2);
  expect(selected.every(({ kind, options, memoryPoint }) => kind === 'cloze-mc' && options?.length === 4 && memoryPoint)).toBe(true);
  const [invitation, announcement] = selected;
  expect(invitation.prompt).toContain('convocar eleição');
  expect(announcement.prompt).toContain('antecedência');
  const { updated } = await recordAnswer({
    cardId: announcement.key, base: { articleId: announcement.articleId, unitId: announcement.unitId, dim: announcement.dim, type: announcement.kind },
    correct: false, ms: 1000, expectedMs: 15_000, mode: 'memorizar', type: announcement.kind,
  });
  try {
    expect(await exerciseForCard(updated, 'memorizar', 'revisao')).toMatchObject({ key: announcement.key, answer: announcement.answer });
  } finally {
    await db.cards.delete(announcement.key);
    await db.reviews.where('cardId').equals(announcement.key).delete();
  }
});

it('atualiza uma lacuna pendente da Memorização salva sem alterar a resposta já registrada', async () => {
  const state = await buildSession({ ...config, focus: 'law:res850', articleIds: ['res850.9'] }, false);
  const current = state.items.find(({ answer }) => answer === '70% (setenta por cento)')!;
  const answered = { ...current, memoryPoint: undefined, answer: 'poderá' };
  const legacy = { ...current, memoryPoint: undefined, answer: 'superior', priority: 2 };
  const results = [{ key: answered.key, correct: true, ms: 2000 }];
  const previous = await loadSession();
  try {
    await saveSession({ ...state, items: [answered, legacy], results, index: 1 });
    const resumed = await resumeSession();
    expect(resumed?.items[0]).toEqual(answered);
    expect(resumed?.results).toEqual(results);
    expect(resumed?.items[1]).toMatchObject({ memoryPoint: current.memoryPoint, answer: current.answer });
  } finally { await saveSession(previous); }
});

it('refaz cada alvo efetivamente errado, mesmo quando o cartão também teve outro acerto', async () => {
  const active = await buildSession({ ...config, focus: 'law:res850', articleIds: ['res850.9'] }, false);
  const options = active.items.find((item) => item.answer === '70% (setenta por cento)')!;
  const typed = { ...options, kind: 'cloze-type' as const, options: undefined };
  const anotherTarget = { ...options, answer: 'imediatamente superior' };
  const wrong = pendingSessionErrors({
    items: [options, anotherTarget, typed],
    results: [{ key: options.key, correct: false, ms: 1 }, { key: options.key, correct: true, ms: 1 }],
  });
  expect(wrong).toEqual([options]);
  const retry = await buildSession({ ...config, activity: 'retry', minutes: 0 }, false, [...wrong, typed]);
  expect(retry.items.map(({ kind, answer }) => ({ kind, answer }))).toEqual([
    { kind: 'cloze-mc', answer: options.answer }, { kind: 'cloze-type', answer: options.answer },
  ]);
  expect(retry.items[0].options).not.toEqual(options.options);
  expect(retry.items[0].options).toEqual(expect.arrayContaining(options.options!));
  expect(retry.config.timed).toBe(false);
  const previous = await loadSession();
  try {
    await saveSession({ ...retry, pausedAt: Date.now() });
    expect((await resumeSession())?.items).toEqual(retry.items);
  } finally { await saveSession(previous); }
});

it('reapresenta somente as questões respondidas incorretamente no simulado', async () => {
  const cfg: SessionConfig = { ...config, focus: 'law:res850', articleIds: ['res850.9'] };
  const exam = await gerarSimulado(cfg, 'leiseca', 3, null);
  expect(exam.questoes).toHaveLength(3);
  const [wrong, right] = exam.questoes;
  const retry = simuladoErrors({
    ...exam, respostas: { [wrong.id]: wrong.options!.find((o) => !o.correct)!.id, [right.id]: right.options!.find((o) => o.correct)!.id },
  });
  expect(retry).toHaveLength(1);
  expect(retry[0]).toMatchObject({ key: wrong.id, answer: wrong.target, options: wrong.options });
  expect(retry[0].stem.filter(({ blank }) => blank)).toEqual([{ t: wrong.target, blank: true }]);
});

describe('retomada da sequência de artigos', () => {
  it('grava uma resposta só uma vez e mantém o novo treino ao rejeitar uma gravação atrasada', async () => {
    const active = await buildSession(config);
    const first = active.items[0];
    const answered = { ...active, results: [{ key: first.key, correct: true, ms: 1000 }] };
    const saveAnswer = () => db.transaction('rw', db.kv, db.cards, db.reviews, async () => {
      await requireCurrentSession(active);
      await recordAnswer({
        cardId: first.key, base: { articleId: first.articleId, unitId: first.unitId, dim: first.dim, type: first.kind },
        correct: true, ms: 1000, expectedMs: first.expectedMs, mode: 'memorizar', type: first.kind,
      });
      await saveSession(answered);
    });
    const attempts = await Promise.allSettled([saveAnswer(), saveAnswer()]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find((result) => result.status === 'rejected')).toMatchObject({ reason: expect.any(SessionConflict) });
    expect(await db.reviews.where('cardId').equals(first.key).count()).toBe(1);

    const replacement = await buildSession({ ...config, focus: 'law:cf' }, false);
    await finishSession(answered, false, { expected: answered, replacement });
    await expect(saveSession({ ...answered, pausedAt: Date.now() }, answered)).rejects.toBeInstanceOf(SessionConflict);
    expect((await loadSession())?.id).toBe(replacement.id);
    expect((await loadSequence(config))?.articleId).toBe(active.items[1].articleId);
  });

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
    await saveSession({ ...s, keepsClockOnReload: undefined, startedAt: s.startedAt - 700_000, results: [{ key: s.items[0].key, correct: true, ms: 8000 }] });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(s.startedAt);
    const resumed = await resumeSession();
    clock.mockRestore();
    expect(resumed?.startedAt).toBe(s.startedAt - 8000);
  });

  it('mantém o relógio de um treino ativo após recarregar a página', async () => {
    const s = await buildSession(config);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(s.startedAt + 60_000);
    try {
      expect((await resumeSession())?.startedAt).toBe(s.startedAt);
      clock.mockReturnValue(s.startedAt + config.minutes * 60_000);
      expect(await resumeSession()).toMatchObject({ timedOut: true, index: s.items.length });
    } finally { clock.mockRestore(); }
  });
});

it('usa alternativas distintas, desfaz embaralhamentos em ordem e protege a revisão de textos sinalizados', async () => {
  const locate = getArticle('cc.1619')!;
  const which = buildWhich(locate.law, locate.art, 1)!;
  expect(which.options).toHaveLength(4);
  expect(new Set(which.options!.map(({ text }) => normAnswer(text))).size).toBe(4);

  const enumeration = getArticle('cc.67')!;
  const order = buildOrder(enumeration.law, enumeration.art, 1)!;
  const shuffled = shuffledOrderItems(order).map(({ id }) => id);
  expect(shuffled.join('|')).not.toBe(order.answer);
  expect(new Set(shuffled)).toEqual(new Set(order.orderItems!.map(({ id }) => id)));

  const flagged = getArticle('cp.171')!;
  expect(flagged.art.outdated?.length).toBeGreaterThan(0);
  for (const build of [buildWhich, buildOrder, buildRubric]) expect(build(flagged.law, flagged.art, 1)).toBeNull();
  const legacy = await buildSession(config, false);
  await saveSession({ ...legacy, items: [{ ...which, options: [which.options![0], which.options![0]] }] });
  const restored = await resumeSession();
  expect(restored?.items[0].options).toEqual(which.options);
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
  it('recusa um treino com atividade inválida e permite recuperar uma sessão válida', async () => {
    const session = await buildSession(config, false);
    const broken = { ...session, items: [null] };
    const restore = (value: unknown) => importBackup({ text: async () => JSON.stringify({ app: 'LEX', version: 3, kv: [{ key: 'session', value }] }) });
    await expect(restore(broken)).rejects.toThrow('Treino inválido');
    await db.kv.put({ key: 'session', value: broken });
    expect(await loadSession()).toBeNull();
    await restore(session);
    expect(await loadSession()).toMatchObject({ id: session.id, index: 0 });
  });

  it('junta respostas de um backup e mantém o simulado encerrado ao restaurar uma cópia antiga', async () => {
    const sim: Simulado = {
      id: 'sim-restore-overlap', estilo: 'cebraspe', n: 3, tempoMin: null, createdAt: 1, startedAt: 1, title: '',
      position: 1, questoes: ['a', 'b', 'c'].map((id) => ({ id, estilo: 'cebraspe', enunciado: 'Julgue o item.', ce: 'C' })),
      respostas: { a: 'E', b: '' },
    };
    const key = `sim:${sim.id}`;
    const restore = (value: unknown) => importBackup({ text: async () => JSON.stringify({ app: 'LEX', version: 3, kv: [{ key, value }] }) });
    await saveSimulado(sim);
    const other = { ...sim, respostas: { a: 'C', b: 'C', c: 'C', desconhecida: 'C' }, position: 2 };
    await restore(other);
    expect(await loadSimulado(sim.id)).toMatchObject({ position: 1, respostas: { a: 'E', b: '', c: 'C' } });
    expect((await loadSimulado(sim.id))?.respostas).not.toHaveProperty('desconhecida');
    await restore({ ...other, finishedAt: 2 });
    await restore(other);
    const reviews = await db.reviews.count();
    expect(await finishSimulado(sim.id)).toMatchObject({ finishedAt: 2 });
    expect(await db.reviews.count()).toBe(reviews);
  });

  it('ignora entradas já corrompidas no histórico e rejeita um simulado inválido no backup', async () => {
    const key = 'sim:sim-corrompido';
    const value = { id: 'sim-corrompido', startedAt: 1, questoes: [null], respostas: {} };
    const backup = { app: 'LEX', version: 3, kv: [{ key, value }, { key: 'audit-atomic', value: 1 }] };
    await expect(importBackup({ text: async () => JSON.stringify(backup) })).rejects.toThrow('Simulado inválido');
    expect(await db.kv.get('audit-atomic')).toBeUndefined();
    await db.kv.put({ key, value });
    expect(await loadSimulado(value.id)).toBeNull();
    const history = (await db.kv.get('simulados'))?.value;
    await db.kv.put({ key: 'simulados', value: { broken: true } });
    expect(await listSimulados()).toEqual([]);
    await db.kv.put({ key: 'simulados', value: history ?? [] });
    await db.kv.delete(key);
  });

  it('mantém o primeiro ponto do dia e combina presenças de dois aparelhos', async () => {
    const first = { day: '2024-03-10', at: Date.UTC(2024, 2, 10, 16), min: 8 };
    const another = { day: '2024-03-11', at: Date.UTC(2024, 2, 11, 16), min: 11 };
    await db.kv.put({ key: 'pontos', value: [first] });
    await Promise.all([baterPonto(19), baterPonto(20)]);
    const today = (await pontoHoje())!;
    expect(today.min).toBe(19);
    const backup = { app: 'LEX', version: 3, kv: [{ key: 'pontos', value: [first, another] }] };
    await importBackup({ text: async () => JSON.stringify(backup) });
    expect(await getPontos()).toEqual([first, another, today]);
  });

  it('mantém a posição e registra uma finalização apenas uma vez', async () => {
    const sim: Simulado = {
      id: 'sim-audit', estilo: 'leiseca', n: 2, tempoMin: null, createdAt: 1, startedAt: 1, title: 'Teste',
      position: 0, questoes: [{ id: 'S:cpp.10.cpt:B:prazos', articleId: 'cpp.10', unitId: 'cpp.10.cpt',
        estilo: 'leiseca', enunciado: 'Qual é o prazo?', options: [{ id: 'ok', text: '10 dias', correct: true }] },
      { id: 'S:cpp.10.cpt:CE', estilo: 'cebraspe', enunciado: 'Julgue o item.', ce: 'C' }],
      respostas: {},
    };
    await saveSimulado(sim);
    const [q1, q2] = sim.questoes;
    await Promise.all([
      updateSimulado(sim.id, { questionId: q1.id, optionId: 'ok' }),
      updateSimulado(sim.id, { position: 1 }),
      updateSimulado(sim.id, { questionId: q2.id, optionId: 'C' }),
    ]);
    const expected = { [q1.id]: 'ok', [q2.id]: 'C' };
    expect(await loadSimulado(sim.id)).toMatchObject({ position: 1, respostas: expected });
    const [first, second] = await Promise.all([finishSimulado(sim.id), finishSimulado(sim.id)]);
    expect(first.finishedAt).toBe(second.finishedAt);
    expect(first.respostas).toEqual(expected);
    await updateSimulado(sim.id, { questionId: q1.id, optionId: 'ok' });
    expect((await loadSimulado(sim.id))?.respostas).toEqual(expected);
    const rows = await db.reviews.where('cardId').equals(q1.id).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dim: 'prazos', correct: true, given: '10 dias' });
  });

  it('grava escolhas válidas feitas antes do prazo do simulado', async () => {
    const startedAt = Date.now();
    const q = { id: 'teste-ce', estilo: 'cebraspe', enunciado: 'Julgue o item.', ce: 'C' } as const;
    const sim: Simulado = { id: 'sim-deadline', estilo: 'cebraspe', n: 1, tempoMin: 1, startedAt,
      createdAt: startedAt, title: '', questoes: [q], respostas: {} };
    await saveSimulado(sim);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(startedAt + 59_999);
    try {
      await updateSimulado(sim.id, { questionId: q.id, optionId: 'C' });
      await updateSimulado(sim.id, { questionId: q.id, optionId: 'inexistente' });
      clock.mockReturnValue(startedAt + 60_000);
      await updateSimulado(sim.id, { questionId: q.id, optionId: 'E' });
      expect((await finishSimulado(sim.id)).respostas).toEqual({ [q.id]: 'C' });
    } finally { clock.mockRestore(); }
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

  it('exporta e restaura o treino pausado, as marcações e o registro de um chute', async () => {
    const session = await buildSession(config);
    const paused = { ...session, pausedAt: Date.now() };
    await saveSession(paused);
    const mark = { id: 'note:cf.5.test-restore', kind: 'note' as const, target: 'cf.5', text: 'Rever no próximo treino', at: 100 };
    await db.marks.put(mark);
    const cardId = 'backup-roundtrip-test';
    const { reviewId, previous } = await recordAnswer({
      cardId, base: { dim: 'literal', type: 'cloze-mc' },
      correct: true, ms: 8000, expectedMs: 20_000, mode: 'memorizar', type: 'cloze-mc',
    });
    const initial = (await db.reviews.get(reviewId))!;
    await regradeAsGuess(previous, cardId, reviewId);
    const backup = await createBackupBlob();
    await db.reviews.put(initial);
    await db.marks.delete(mark.id);
    await db.cards.delete(cardId);
    await saveSession({ ...session, index: session.items.length, finishedAt: Date.now() });

    await importBackup(backup);
    await importBackup(backup);
    expect(await db.reviews.where('cardId').equals(cardId).toArray()).toEqual([expect.objectContaining({ id: reviewId, guessed: true })]);
    expect(await db.marks.get(mark.id)).toEqual(mark);
    expect((await db.cards.get(cardId))?.fsrs.due).toBeInstanceOf(Date);
    expect(await loadSession()).toMatchObject({ id: session.id, pausedAt: paused.pausedAt });

    const current = await buildSession({ ...config, focus: 'law:cp' });
    await importBackup(backup);
    expect((await loadSession())?.id).toBe(current.id);
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
