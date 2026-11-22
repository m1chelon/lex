import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { initCorpus } from '../src/data/corpus';
import { db } from '../src/data/db';
import { importBackup } from '../src/data/backup';
import {
  getPlanner, getPlannerTask, plannerConfig, plannerGoalOn, plannerProgress, plannerTaskKey,
  recordPlannerExercise, redistribution, savePlanner, type PlannerTask, type StudyGoal,
} from '../src/learn/planner';
import { buildSession } from '../src/learn/session';
import { parseArticleQuery, searchCatalog } from '../src/learn/search';

const civilLaw: StudyGoal = { kind: 'law', scope: { kind: 'geral', ramo: 'Constitucional', law: 'cf' }, target: 1 };

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus();
});

afterAll(() => vi.unstubAllGlobals());

it('conserva a meta e só contabiliza o artigo quando todas as atividades foram respondidas', async () => {
  const day = '2026-11-20';
  const taskId = plannerTaskKey(day, civilLaw);
  const config = plannerConfig(day, civilLaw, true);
  const fast = await buildSession(config, false);
  const task = (await getPlannerTask(taskId))!;
  const group = task.groups[0];
  expect(fast.config).toMatchObject({ minutes: 5, timed: true, order: 'linear' });
  expect(group.id).toBe('cf.1');
  expect(group.keys.length).toBeGreaterThan(1);
  expect(fast.items.every(({ articleId }) => articleId === group.id)).toBe(true);

  const record = (key: string) => db.transaction('rw', db.kv, () => recordPlannerExercise(taskId, key));
  await record(group.keys[0]);
  await record(group.keys[0]);
  let saved = (await getPlannerTask(taskId))!;
  expect(saved.done).toEqual([group.keys[0]]);
  expect(plannerProgress(saved).completed).toBe(0);
  const retry = await buildSession(plannerConfig(day, civilLaw), false);
  expect(retry.items.map(({ key }) => key)).toEqual(group.keys.slice(1));
  await Promise.all(group.keys.slice(1).map(record));
  saved = (await getPlannerTask(taskId))!;
  expect(plannerProgress(saved)).toMatchObject({ completed: 1, total: 1, remaining: [] });
  expect((await buildSession(config, false)).items).toEqual([]);
});

it('organiza as metas por dia e remaneja o saldo para a próxima meta da mesma matéria', async () => {
  const monday = '2026-11-16';
  const today = '2026-11-17';
  const mondayGoal = { ...civilLaw, target: 3 };
  const wednesdayGoal = { ...civilLaw, target: 1 };
  const doctrine: StudyGoal = { kind: 'doctrine', courseId: 'consumidor', unit: 'modules', target: 1 };
  const days = [mondayGoal, doctrine, wednesdayGoal, null, null, null, null];
  await savePlanner(days, monday);
  const plan = (await getPlanner())!;
  const task: PlannerTask = { day: monday, goal: mondayGoal,
    groups: [{ id: 'cf.1', keys: ['a', 'b'] }, { id: 'cf.2', keys: ['c'] }], done: ['a'] };
  const tasks = new Map([[plannerTaskKey(monday, mondayGoal), task]]);
  const result = redistribution(plan, tasks, today);
  expect(result.moves.map(({ day, count }) => [day, count])).toEqual([['2026-11-18', 1], ['2026-11-23', 2]]);
  expect(redistribution(result.next, tasks, today).moves).toEqual([]);
  await savePlanner([mondayGoal, null, wednesdayGoal, null, null, null, null], today);
  const edited = (await getPlanner())!;
  expect(plannerGoalOn(edited, monday)).toEqual(mondayGoal);
  expect(plannerGoalOn(edited, today)).toBeNull();
  expect(plannerGoalOn(edited, '2026-11-18')).toEqual(wednesdayGoal);
});

it('troca uma questão retirada sem zerar o que já foi feito na meta', async () => {
  const day = '2026-11-22';
  const goal: StudyGoal = { ...civilLaw, target: 2 };
  const taskId = plannerTaskKey(day, goal);
  const finished = { id: 'cf.1', keys: ['L:cf.1.cpt:literal'] };
  const retired = 'L:cf.2.revogado:literal';
  await db.kv.put({ key: taskId, value: {
    day, goal, groups: [finished, { id: 'cf.2', keys: [retired] }], done: finished.keys,
  } satisfies PlannerTask });
  const session = await buildSession(plannerConfig(day, goal), false);
  const task = (await getPlannerTask(taskId))!;
  expect(task.groups[0]).toEqual(finished);
  expect(task.groups.some(({ keys }) => keys.includes(retired))).toBe(false);
  expect(session.items.length).toBeGreaterThan(0);
  expect(plannerProgress(task).completed).toBe(1);
});

it('mantém a área e a disciplina do edital nas sessões do Planner', () => {
  const goal: StudyGoal = { kind: 'law', target: 10, scope: { kind: 'curso', area: 'tjsp', topico: '6. Legislação Interna' } };
  expect(plannerConfig('2026-11-22', goal)).toMatchObject({ area: 'tjsp', focus: 'topico:6. Legislação Interna' });
});

it('recusa a meta zero e permite restaurar uma semana válida sobre um Planner danificado', async () => {
  const saved = { since: '2026-11-22', days: [civilLaw, null, null, null, null, null, null], carry: {} };
  const invalid = { ...saved, days: [{ ...civilLaw, target: 0 }, ...saved.days.slice(1)] };
  const restore = (value: unknown) => importBackup({ text: async () => JSON.stringify({
    app: 'LEX', version: 3, kv: [{ key: 'studyPlanner', value }],
  }) });
  await expect(restore(invalid)).rejects.toThrow('Planner inválido');
  await db.kv.put({ key: 'studyPlanner', value: invalid });
  expect(await getPlanner()).toBeNull();
  await restore(saved);
  expect(await getPlanner()).toEqual(saved);
});

it('acompanha todos os itens do módulo de doutrina escolhido para a meta', async () => {
  const day = '2026-11-18';
  const goal: StudyGoal = { kind: 'doctrine', courseId: 'consumidor', unit: 'modules', target: 1 };
  const session = await buildSession(plannerConfig(day, goal), false);
  const task = (await getPlannerTask(plannerTaskKey(day, goal)))!;
  expect(task.groups).toHaveLength(1);
  expect(task.groups[0].keys.length).toBeGreaterThan(1);
  expect(session.items.every(({ key, doctrineParts }) => task.groups[0].keys.includes(key) && doctrineParts?.length === 3)).toBe(true);
});

it('busca pelo artigo com sigla, pelo tema de doutrina e pelo órgão com cargo', () => {
  expect(parseArticleQuery('art. 37 da CF/88')).toMatchObject({ number: '37', lawId: 'cf', unknownLaw: false });
  expect(parseArticleQuery('CDC artigo 1º-A')).toMatchObject({ number: '1-A', lawId: 'cdc', unknownLaw: false });
  expect(searchCatalog('superendividamento').topics.some(({ id }) => id === 'consumidor')).toBe(true);
  expect(searchCatalog('TJSP Escrevente').contestResults[0].id).toBe('tjsp');
});
