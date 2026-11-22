import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { PUBLISHED_DOCTRINE_COURSES } from '../content/doctrineCatalog';
import { db, kvGet } from '../data/db';
import { dayKey } from './mood';
import { scopeLabel, type PlanScope } from './plan';
import type { SessionConfig } from './session';

export type StudyGoal =
  | { kind: 'law'; scope: PlanScope; target: number }
  | { kind: 'doctrine'; courseId: string; unit: 'questions' | 'modules'; target: number }
  | { kind: 'review'; target: number };

export interface StudyPlanner {
  since: string;
  days: (StudyGoal | null)[];
  past?: { from: string; to: string; days: StudyPlanner['days'] }[];
  movedThrough?: string;
  carry: Record<string, number>;
}

export interface PlannerTask {
  day: string;
  goal: StudyGoal;
  groups: { id: string; keys: string[] }[];
  done: string[];
}

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;
const KEY = 'studyPlanner';
const TASK_PREFIX = 'plannerTask:';

export function plannerDate(day: string, offset = 0) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date + offset, 12);
}

export const weekday = (date: Date) => (date.getDay() + 6) % 7;
export const plannerDateKey = (day: string, offset: number) => dayKey(plannerDate(day, offset));
export const weekStart = (day: string) => plannerDateKey(day, -weekday(plannerDate(day)));
export const getPlanner = () => kvGet<StudyPlanner | null>(KEY, null);

export function plannerGoalOn(planner: StudyPlanner, day: string) {
  const days = day >= planner.since ? planner.days : planner.past?.find(({ from, to }) => from <= day && day <= to)?.days;
  return days?.[weekday(plannerDate(day))] ?? null;
}

export function plannerSubject(goal: StudyGoal) {
  if (goal.kind === 'law') return scopeLabel(goal.scope).title;
  if (goal.kind === 'doctrine') return PUBLISHED_DOCTRINE_COURSES.find(({ id }) => id === goal.courseId)?.title ?? 'Doutrina';
  return 'Revisão';
}

export function plannerQuantity(goal: StudyGoal, count = goal.target) {
  const labels = goal.kind === 'law' ? ['artigo', 'artigos']
    : goal.kind === 'doctrine' && goal.unit === 'modules' ? ['módulo', 'módulos'] : ['questão', 'questões'];
  return `${count} ${labels[count === 1 ? 0 : 1]}`;
}

function goalKey(goal: StudyGoal) {
  if (goal.kind === 'review') return 'review';
  if (goal.kind === 'doctrine') return JSON.stringify([goal.kind, goal.courseId, goal.unit]);
  const scope = goal.scope;
  return scope.kind === 'geral'
    ? JSON.stringify([goal.kind, scope.ramo, scope.law ?? ''])
    : JSON.stringify([goal.kind, scope.area, scope.topico ?? '', scope.law ?? '']);
}

export const plannerTaskKey = (day: string, goal: StudyGoal) => TASK_PREFIX + day + ':' + goalKey(goal);
export const getPlannerTask = (key: string) => kvGet<PlannerTask | null>(key, null);

export async function savePlanner(days: StudyPlanner['days'], today: string) {
  await db.transaction('rw', db.kv, async () => {
    const before = await getPlanner();
    if (JSON.stringify(before?.days) === JSON.stringify(days)) return;
    const past = [...before?.past ?? []];
    if (before && before.since < today) past.push({ from: before.since, to: plannerDateKey(today, -1), days: before.days });
    const carry: StudyPlanner['carry'] = {};
    for (const [day, count] of Object.entries(before?.carry ?? {})) {
      const old = before?.days[weekday(plannerDate(day))];
      const current = days[weekday(plannerDate(day))];
      if (day >= today && old && current && goalKey(old) === goalKey(current)) carry[day] = Math.min(current.target, count);
    }
    await db.kv.put({ key: KEY, value: { since: today, days, past, carry, movedThrough: before?.movedThrough } satisfies StudyPlanner });
  });
}

function taskCounts(task: PlannerTask, limit: number) {
  const done = new Set(task.done);
  const groups = task.groups.slice(0, limit);
  const remaining = groups.filter(({ keys }) => !keys.every((key) => done.has(key)));
  return { completed: groups.length - remaining.length, total: groups.length, next: remaining[0]?.id, remaining, done };
}

export const plannerProgress = (task: PlannerTask, limit = task.goal.target) => taskCounts(task, limit);

export async function recordPlannerExercise(taskId: string, key: string) {
  const task = (await db.kv.get(taskId))?.value as PlannerTask | undefined;
  if (task && !task.done.includes(key)) {
    await db.kv.put({ key: taskId, value: { ...task, done: [...task.done, key] } satisfies PlannerTask });
  }
}

export function plannerConfig(day: string, goal: StudyGoal, quick = false): SessionConfig {
  return {
    minutes: quick ? 5 : 15, mode: 'memorizar', area: 'geral', focus: 'auto', order: 'linear',
    activity: 'planner', planner: { day, goal, quick }, title: plannerSubject(goal),
  };
}

export function redistribution(planner: StudyPlanner, tasks: Map<string, PlannerTask>, today: string) {
  const carry = Object.fromEntries(Object.entries(planner.carry).filter(([day]) => day >= today));
  const backlog = new Map<string, number>();
  const availableGoals = new Set(planner.days.flatMap((goal) => goal ? [goalKey(goal)] : []));
  const since = planner.movedThrough ? plannerDateKey(planner.movedThrough, 1) : planner.past?.[0]?.from ?? planner.since;
  for (let day = since; day < today; day = plannerDateKey(day, 1)) {
    const goal = plannerGoalOn(planner, day);
    if (!goal || goal.kind === 'review' || !availableGoals.has(goalKey(goal))) continue;
    const task = tasks.get(plannerTaskKey(day, goal));
    const count = goal.target - (task ? plannerProgress(task, goal.target).completed : 0);
    if (count) backlog.set(goalKey(goal), (backlog.get(goalKey(goal)) ?? 0) + count);
  }
  const moves: { day: string; goal: StudyGoal; count: number }[] = [];
  for (let day = today; backlog.size; day = plannerDateKey(day, 1)) {
    const goal = planner.days[weekday(plannerDate(day))];
    if (!goal) continue;
    const key = goalKey(goal);
    const pending = backlog.get(key);
    if (!pending) continue;
    const task = tasks.get(plannerTaskKey(day, goal));
    const progress = task ? plannerProgress(task, goal.target) : null;
    const available = Math.max(0, goal.target - (progress?.completed ?? 0) - (carry[day] ?? 0));
    const count = Math.min(pending, available);
    if (count) {
      carry[day] = (carry[day] ?? 0) + count;
      moves.push({ day, goal, count });
      if (count === pending) backlog.delete(key);
      else backlog.set(key, pending - count);
    }
  }
  return { moves, next: { ...planner, carry, movedThrough: plannerDateKey(today, -1) } };
}

export async function applyRedistribution(plan: StudyPlanner, today: string) {
  await db.transaction('rw', db.kv, async () => {
    const current = await getPlanner();
    if (JSON.stringify(current) !== JSON.stringify(plan)) throw new Error('O plano mudou');
    const tasks = await readPlannerTasks();
    await db.kv.put({ key: KEY, value: redistribution(plan, tasks, today).next });
  });
}

async function readPlannerTasks() {
  const rows = await db.kv.where('key').startsWith(TASK_PREFIX).toArray();
  return new Map(rows.map(({ key, value }) => [key, value as PlannerTask]));
}

export function usePlanner(today: string, history = false) {
  const [state, setState] = useState<{ plan: StudyPlanner | null; task: PlannerTask | null; tasks: Map<string, PlannerTask> }>();
  useEffect(() => {
    const sub = liveQuery(async () => {
      const plan = await getPlanner();
      const goal = plan && plannerGoalOn(plan, today);
      const tasks = history ? await readPlannerTasks() : new Map<string, PlannerTask>();
      const id = goal && plannerTaskKey(today, goal);
      const task = id ? (history ? tasks.get(id) ?? null : await getPlannerTask(id)) : null;
      return { plan, task, tasks };
    }).subscribe({ next: setState, error: () => setState({ plan: null, task: null, tasks: new Map() }) });
    return () => sub.unsubscribe();
  }, [today, history]);
  return state;
}
