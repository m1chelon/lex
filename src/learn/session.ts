// Montagem de sessões: escopo (área/edital/lei/ramo), ordem, modo e modo infinito.
import { db, kvGet, type CardRow, type Dim, type ReviewRow } from '../data/db';
import { coverage, ensureLaws, getArticle, getLaw, getUnit, lawIdOf } from '../data/corpus';
import { buildLiteral, buildOrder, buildRubric, buildWhich, canTrainArticle, findTargets, type Exercise } from './generators';
import { buildCaseForProvision, buildCaseIdentify, buildCasePena } from './cases';
import { buildGuidedRead, buildMemory, buildPenaltyQuestion, buildProvisionTyped } from './lawQuestions';
import { hasProvisionText, provisionUnits, shortAnswer } from './provisions';
import { CONCEPTS } from '../content/concepts';
import { CASE_BANK, findLawConcept } from '../content/lawCases';
import { getArea, lawsByRamo, areaLaws, type AreaId } from '../core/areas';
import { isDue, retrievability } from './scheduler';
import { fold, hashStr, normAnswer, rng, shuffle } from './text';
import { findTerms, getTerm } from './terms';
import type { Concept, Ref } from '../content/types';
import type { Ramo } from '../core/sources';
import { getSettings } from '../ui/settings';
import { buildPairDrill } from './pairDrills';
import { latestReviews, reviewQueue } from './reviewQueue';
import { buildDoctrineSession, doctrineExercise, doctrinePlannerGroups, isCurrentDoctrineQuestion, type DoctrineScope } from './doctrineCourses';
import { dayKey } from './mood';
import { getPlannerTask, isPlannedSession, plannerProgress, plannerTaskKey, type PlannerTask, type StudyGoal } from './planner';
import { scopeToFocus } from './plan';

export type Mode = 'aprender' | 'memorizar' | 'memorizar-guiada' | 'casos' | 'provar';
export const isMemoryMode = (mode: Mode) => mode === 'memorizar' || mode === 'memorizar-guiada';
export type Order = 'misturado' | 'linear';
export const DEFAULT_ARTICLE_ORDER: Order = 'linear';
export interface SessionConfig {
  minutes: number; mode: Mode; focus: string; area?: AreaId; order?: Order; startArticleId?: string;
  infinite?: boolean; timed?: boolean; articleIds?: string[]; title?: string; mix?: 'literal' | 'casos' | 'ambos';
  /** Relâmpago: 10 s por questão, com lacunas e alternativas curtas. */
  blitz?: boolean;
  practiceCardIds?: string[];
  activity?: 'daily' | 'pairs' | 'review' | 'retry' | 'doctrine' | 'planner';
  doctrine?: DoctrineScope;
  planner?: { day: string; goal: StudyGoal; quick?: boolean };
  revenge?: boolean;
  sequenceSkip?: string[];
  backfillThrough?: string;
}
export interface SessionState {
  id: string; config: SessionConfig; items: Exercise[]; index: number;
  results: { key: string; correct: boolean | null; ms: number }[];
  startedAt: number; pausedAt?: number; finishedAt?: number; timedOut?: boolean;
  keepsClockOnReload?: true;
  cursor?: number; seed?: number; // modo infinito / linear: posição no escopo
  provisionCoverage?: true;
  draft?: string[]; // escolhas parciais da questão de doutrina
}

export function sessionInProgress(state: SessionState | null | undefined): state is SessionState {
  return !!state && !state.finishedAt && Array.isArray(state.items) && state.index < state.items.length;
}

export function pendingSessionErrors({ items, results, config }: Pick<SessionState, 'items' | 'results'> & { config?: SessionConfig }): Exercise[] {
  const pending = new Map<string, Exercise>();
  results.forEach((result, index) => {
    const item = items[index];
    if (item?.key !== result.key) return;
    if (config && isMemoryMode(config.mode) && !config.blitz && !config.activity && item.kind !== 'cloze-multi') return;
    const key = item.kind.startsWith('cloze') ? JSON.stringify([item.key, item.answer]) : item.key;
    if (result.correct === false) pending.set(key, item);
    else if (result.correct === true) pending.delete(key);
  });
  return [...pending.values()];
}

function retryExercise(exercise: Exercise, seed: string): Exercise {
  const r = rng(seed);
  const reorder = <T,>(options: T[]) => {
    const shuffled = shuffle(options, r);
    return options.length > 1 && shuffled.every((option, index) => option === options[index])
      ? [...shuffled.slice(1), shuffled[0]] : shuffled;
  };
  return {
    ...exercise, practice: 'revanche',
    options: exercise.options && (exercise.kind === 'ce' ? exercise.options : reorder(exercise.options)),
    doctrineParts: exercise.doctrineParts?.map((part) => ({ ...part, options: reorder(part.options) })),
    blanks: exercise.blanks?.map((blank) => ({ ...blank, options: reorder(blank.options) })),
  };
}

export function sessionDeadline(state: SessionState) {
  return state.config.timed && !state.config.infinite && state.config.minutes > 0
    ? state.startedAt + state.config.minutes * 60_000 : null;
}

export class SessionConflict extends Error {
  constructor() { super('O treino foi atualizado em outra aba. Volte ao Início para retomar.'); }
}

export async function requireCurrentSession(expected: SessionState | null) {
  const current = await loadSession();
  if (expected === null) {
    if (sessionInProgress(current)) throw new SessionConflict();
    return;
  }
  if (!current || current.id !== expected.id || current.index !== expected.index
    || current.results.length !== expected.results.length || current.startedAt !== expected.startedAt
    || current.pausedAt !== expected.pausedAt || current.finishedAt !== expected.finishedAt) throw new SessionConflict();
}

export function isStudyQuestion({ kind }: Pick<Exercise, 'kind'>): boolean {
  return kind !== 'read' && kind !== 'term' && kind !== 'lesson';
}

export function canConsultStudySource(exercise: Pick<Exercise, 'kind'>, result?: boolean | null): boolean {
  return !isStudyQuestion(exercise) || typeof result === 'boolean';
}

const QUESTIONS_PER_BLOCK = 5;

export function questionCheckpoint(question: number, total: number | undefined, answered: boolean) {
  if (question < 1 || (total !== undefined && (total < 2 * QUESTIONS_PER_BLOCK || question > total))) return null;
  const block = Math.ceil(question / QUESTIONS_PER_BLOCK);
  const end = Math.min(block * QUESTIONS_PER_BLOCK, total ?? Infinity);
  return { block, remaining: end - question + Number(!answered) };
}

const COST: Record<string, number> = { read: 30, 'cloze-mc': 20, 'cloze-multi': 32, tf: 18, 'cloze-type': 32, order: 38, 'which-article': 18, rubric: 18, concept: 45, case: 45, term: 30, lesson: 0, mc5: 40, ce: 25 };

export function conceptExercise(c: Concept, seed: string): Exercise {
  const r = rng(seed);
  const opts = shuffle(c.opcoes.map((o, i) => ({ id: `o${i}`, text: o.texto, correct: o.correta, why: o.porque })), r);
  return { key: `C:${c.id}`, kind: 'concept', dim: c.dims[0], family: 'interpretacao', conceptId: c.id, prompt: c.pergunta, stem: [], options: opts, expectedMs: 40000, stage: 1 };
}

const refLaw = (r: Ref) => r.law;

export function conceptInScope(concept: Concept, cfg: SessionConfig, laws: Set<string>, articles: Set<string>) {
  const exact = !!cfg.articleIds?.length || (cfg.area ?? getSettings().area) !== 'geral';
  return concept.refs.some((ref) => exact ? articles.has(`${ref.law}.${ref.art}`) : laws.has(refLaw(ref)));
}

/** Leis do escopo da sessão. */
export function scopeLaws(cfg: SessionConfig): string[] {
  const area = cfg.area ?? getSettings().area;
  if (cfg.articleIds?.length) return [...new Set(cfg.articleIds.map((a) => a.split('.')[0]))];
  if (cfg.focus.startsWith('ramo:')) return lawsByRamo(cfg.focus.slice(5) as Ramo);
  if (cfg.focus.startsWith('law:')) return [cfg.focus.slice(4)];
  if (cfg.focus.startsWith('topic-law:')) return [cfg.focus.split(':', 3)[1]];
  if (cfg.focus.startsWith('topico:')) { const t = cfg.focus.slice(7); return [...new Set(getArea(area === 'geral' ? 'tjsp' : area).requirements.filter((r) => r.topico === t).map((r) => r.law))]; }
  if (cfg.focus === 'auto') return areaLaws(area);
  const req = getArea(area === 'geral' ? 'tjsp' : area).requirements.find((r) => r.id === cfg.focus);
  return req ? [req.law] : areaLaws(area);
}

/** Artigos do escopo, na ordem pedida. */
export async function scopeArticles(cfg: SessionConfig, seed: number): Promise<string[]> {
  const laws = scopeLaws(cfg);
  await ensureLaws(laws);
  const order = cfg.order ?? DEFAULT_ARTICLE_ORDER;
  const area = cfg.area ?? getSettings().area;
  let ids: string[] = [];
  if (cfg.articleIds?.length) ids = cfg.articleIds;
  else if (cfg.focus.startsWith('ramo:') || area === 'geral' || (cfg.focus.startsWith('law:') && !coverage(area).items.some((i) => i.req.law === cfg.focus.slice(4)))) {
    for (const l of laws) ids.push(...(getLaw(l)?.articles.filter((a) => !a.rev).map((a) => a.id) ?? []));
  } else {
    const cov = coverage(area);
    // curso: só os artigos exigidos no edital (todo o edital, uma disciplina, uma lei ou um item)
    const f = cfg.focus;
    const [kind, law] = f.split(':', 2);
    const items = cov.items.filter(({ req }) => {
      if (f === 'auto') return true;
      if (kind === 'topico') return req.topico === f.slice(7);
      if (kind === 'law') return req.law === law;
      if (kind === 'topic-law') return req.law === law && req.topico === f.slice(kind.length + law.length + 2);
      return req.id === f;
    });
    const selected = new Set(items.flatMap((i) => i.articles));
    ids = order === 'linear'
      ? laws.flatMap((id) => getLaw(id)?.articles.filter((art) => selected.has(art.id)).map((art) => art.id) ?? [])
      : [...selected];
  }
  if (cfg.startArticleId) { const i = ids.indexOf(cfg.startArticleId); if (i > 0) ids = ids.slice(i); }
  return order === 'linear' ? ids : shuffle(ids, rng(seed));
}

function unitItems(artId: string, mode: Mode, byKey: Map<string, CardRow>, seed: string, linear: boolean, repeat = false): Exercise[] {
  const hit = getArticle(artId);
  if (!hit) return [];
  const { law, art } = hit;
  const units = provisionUnits(art).sort((a, b) => Number(a.k === 'pena') - Number(b.k === 'pena'));
  const eligible = (key: string) => {
    const card = byKey.get(key);
    return linear || repeat || !card?.fsrs.reps || isDue(card.fsrs);
  };
  if (isMemoryMode(mode)) {
    return units.flatMap((unit) => {
      const exercise = buildMemory(law, art, unit, 1, seed);
      return exercise && eligible(exercise.key)
        ? [{ ...exercise, stage: Math.max(1, byKey.get(exercise.key)?.stage ?? 1) }] : [];
    });
  }
  return units.flatMap((unit) => {
    const exercises = [...new Set(findTargets(unit).map((target) => target.dim))].flatMap((dim) => {
      const card = byKey.get(`L:${unit.id}:${dim}`);
      return buildLiteral(law, art, unit, dim, Math.max(3, card?.stage ?? 0), 'provar', seed + (card?.fsrs.reps ?? 0)) ?? [];
    });
    return (exercises.length ? exercises : [buildProvisionTyped(law, art, unit, 3)]).flatMap((ex) => ex && eligible(ex.key) ? [ex] : []);
  });
}

function caseItems(artId: string, seed: string): Exercise[] {
  const hit = getArticle(artId);
  if (!hit) return [];
  const { law, art } = hit;
  return provisionUnits(art).sort((a, b) => Number(a.k === 'pena') - Number(b.k === 'pena'))
    .flatMap((unit) => buildCaseForProvision(law, art, unit, seed) ?? []);
}

/** Gera o próximo lote a partir do cursor (usado no início, no modo infinito e no linear). */
async function nextBatch(state: SessionState, budgetSec: number, repeat = false): Promise<{ items: Exercise[]; cursor: number }> {
  const cfg = state.config;
  const articles = await scopeArticles(cfg, state.seed!);
  const linear = (cfg.order ?? DEFAULT_ARTICLE_ORDER) === 'linear';
  const mix = cfg.mode === 'provar' ? (cfg.mix ?? getSettings().provarMix) : cfg.mode === 'casos' ? 'casos' : 'literal';
  let all: CardRow[] = [];
  try { all = await db.cards.toArray(); } catch { all = []; }
  const byKey = new Map(all.map((c) => [c.id, c]));
  const seed = `${state.seed}:${state.cursor}`;
  const items: Exercise[] = [];
  const practiced = new Set(cfg.sequenceSkip);
  const backfillEnd = cfg.backfillThrough ? articles.indexOf(cfg.backfillThrough) : -1;
  const covered = backfillEnd >= 0 ? await practicedUnits(cfg.mode, articles.slice(0, backfillEnd + 1)) : new Set<string>();
  const excluded = new Set(state.items.slice(Math.max(0, state.index - (repeat ? 0 : 2))).map((item) => item.key));
  let spent = 0, cursor = state.cursor ?? 0;
  const push = (e: Exercise) => {
    if (e.articleId === cfg.startArticleId && practiced.has(e.key)) return;
    if (e.unitId && covered.has(e.unitId)) return;
    if (isMemoryMode(cfg.mode) && e.kind !== 'cloze-multi') return;
    if (excluded.has(e.key)) return;
    excluded.add(e.key);
    items.push(e);
    spent += e.kind === 'read' ? e.expectedMs / 1000 : COST[e.kind] ?? 25;
  };
  const lawsInScope = new Set(scopeLaws(cfg));
  const articlesInScope = new Set(articles);
  const conceptsInScope = cfg.mode === 'aprender' ? [] : (cfg.mode === 'casos' ? CASE_BANK : CONCEPTS).filter((c) => conceptInScope(c, cfg, lawsInScope, articlesInScope));
  const conceptIds = new Set(conceptsInScope.map((c) => c.id));
  const readArts = new Set(await kvGet<string[]>('readArticles', []));
  const termsSeen = new Set(await kvGet<string[]>('termsIntroduced', []));

  if (cursor === 0 && cfg.practiceCardIds?.length) {
    const latest = cfg.revenge ? await latestReviews() : null;
    for (const id of cfg.practiceCardIds) {
      const card = byKey.get(id);
      const review = latest?.get(id);
      const exercise = card && (review && !review.correct ? await revengeExercise(card, review, seed, isMemoryMode(cfg.mode)) : await exerciseForCard(card, cfg.mode, seed));
      if (exercise) push(exercise);
      if (spent >= budgetSec) break;
    }
  }

  // Revisões devidas no misturado.
  if (!linear && cursor === 0 && cfg.mode !== 'aprender') {
    const due = all.filter((c) => isDue(c.fsrs) && ((c.articleId && articlesInScope.has(c.articleId)) || (c.conceptId && conceptIds.has(c.conceptId))))
      .filter((c) => (mix === 'literal' ? c.id.startsWith('L:') : mix === 'casos' ? /^(?:C|CPR|CI|CP):/.test(c.id) : !/^[OW]:/.test(c.id)))
      .sort((a, b) => retrievability(a.fsrs) - retrievability(b.fsrs));
    for (const c of due.slice(0, 40)) { const ex = await exerciseForCard(c, cfg.mode, seed); if (ex) push(ex); if (spent > budgetSec * 0.6) break; }
  }

  // No modo sequencial, cada caso aparece junto ao primeiro artigo que fundamenta a questão.
  const conceptsByArticle = new Map<string, Concept[]>();
  if (mix === 'casos' || mix === 'ambos') {
    const pool = conceptsInScope.filter((c) => repeat || !byKey.get(`C:${c.id}`)?.fsrs.reps);
    const orderById = new Map(articles.map((id, index) => [id, index]));
    for (const concept of pool) {
      const first = Math.min(...concept.refs.map((r) => orderById.get(`${r.law}.${r.art}`) ?? articles.length));
      const id = articles[first];
      if (!id) continue;
      const at = conceptsByArticle.get(id) ?? [];
      at.push(concept);
      conceptsByArticle.set(id, at);
    }
  }

  while (cursor < articles.length && spent < budgetSec) {
    const artId = articles[cursor++];
    if (cfg.mode === 'aprender') {
      const hit = getArticle(artId);
      if (!hit || !provisionUnits(hit.art).length) continue;
      if (!readArts.has(artId)) push(buildGuidedRead(hit.law, hit.art));
      for (const u of provisionUnits(hit.art)) {
        const check = buildMemory(hit.law, hit.art, u, 1, seed, true);
        if (check) push({ ...check, expectedMs: 16_000 });
        for (const h of findTerms(u.t, hit.law.id)) {
          const term = getTerm(h.id);
          if (term && !termsSeen.has(term.id)) { termsSeen.add(term.id); push({ key: `T:${term.id}`, kind: 'term', dim: 'conceitual', family: 'glossario', termId: term.id, articleId: artId, prompt: 'Conheça o termo', stem: [], expectedMs: 30000, stage: 0 }); }
        }
      }
      continue;
    }
    if (mix === 'literal' || mix === 'ambos') for (const e of unitItems(artId, cfg.mode, byKey, seed, linear, repeat)) push(e);
    if (mix === 'casos' || mix === 'ambos') {
      for (const concept of conceptsByArticle.get(artId) ?? []) push({ ...conceptExercise(concept, seed), articleId: artId });
      for (const exercise of caseItems(artId, seed)) push(exercise);
    }
  }
  return { items: cfg.mode === 'provar' && !linear ? shuffle(items, rng(seed)) : items, cursor };
}

export async function exerciseForCard(card: CardRow, mode: Mode, seed: string): Promise<Exercise | null> {
  if (card.id.startsWith('D:')) return doctrineExercise(card.id, seed);
  if (card.id.startsWith('P:')) return (await buildPairDrill(seed)).find((item) => item.key === card.id) ?? null;
  if (card.conceptId) { const c = findLawConcept(card.conceptId); return c ? conceptExercise(c, seed) : null; }
  const [kind, , parent] = card.id.split(':');
  const artId = card.articleId || card.unitId?.split('.').slice(0, 2).join('.');
  if (artId) await ensureLaws([artId.split('.')[0]]);
  const a = artId ? getArticle(artId) : null;
  if (!a) return null;
  if (isMemoryMode(mode) && (kind === 'L' || kind === 'S' || kind === 'R')) {
    const unit = a.art.units.find((item) => item.id === (card.unitId ?? (kind === 'L' ? card.id.split(':')[1] : undefined)));
    const ex = unit && (unit.k === 'pena' ? buildPenaltyQuestion(a.law, a.art, unit, seed) : buildMemory(a.law, a.art, unit, Math.max(1, card.stage), seed));
    return ex ? { ...ex, key: card.id } : null;
  }
  if (kind === 'L') {
    const unit = a.art.units.find((item) => item.id === card.unitId);
    if (!unit || !hasProvisionText(unit)) return null;
    const stage = Math.max(1, card.stage);
    const exercise = buildLiteral(a.law, a.art, unit, card.dim, stage, mode === 'provar' ? 'provar' : 'memorizar', seed)
      ?? (mode === 'provar' ? buildProvisionTyped(a.law, a.art, unit, stage) : buildMemory(a.law, a.art, unit, stage, seed, true));
    return exercise ? { ...exercise, key: card.id } : null;
  }
  if (kind === 'O') return parent ? buildOrder(a.law, a.art, card.stage, parent) : null;
  if (kind === 'W') return buildWhich(a.law, a.art, card.stage);
  if (kind === 'R') return buildRubric(a.law, a.art, card.stage);
  if (kind === 'S') {
    const simulatedKind = card.id.split(':', 3)[1];
    if (simulatedKind === 'CPR') {
      const unit = a.art.units.find((item) => item.id === card.unitId);
      const exercise = unit && buildCaseForProvision(a.law, a.art, unit, seed);
      return exercise ? { ...exercise, key: card.id } : null;
    }
    if (simulatedKind === 'CI' || simulatedKind === 'CP') {
      const exercise = simulatedKind === 'CI' ? buildCaseIdentify(a.law, a.art, seed) : buildCasePena(a.law, a.art, seed);
      return exercise && { ...exercise, key: card.id };
    }
    const unit = a.art.units.find((item) => item.id === card.unitId);
    const exercise = unit && (buildLiteral(a.law, a.art, unit, card.dim, Math.max(1, card.stage), 'memorizar', seed)
      ?? buildMemory(a.law, a.art, unit, Math.max(1, card.stage), seed, true));
    return exercise ? { ...exercise, key: card.id } : null;
  }
  if (kind === 'CI') return buildCaseIdentify(a.law, a.art, seed);
  if (kind === 'CP') return buildCasePena(a.law, a.art, seed);
  if (kind === 'CPR') {
    const unit = a.art.units.find((item) => item.id === card.unitId);
    return unit ? buildCaseForProvision(a.law, a.art, unit, seed) : null;
  }
  return null;
}

async function revengeExercise(card: CardRow, last: ReviewRow, seed: string, memory = false): Promise<Exercise | null> {
  if (memory) {
    const exercise = await exerciseForCard(card, 'memorizar', seed);
    return exercise && { ...exercise, practice: 'revanche' };
  }
  const hit = card.articleId && getArticle(card.articleId);
  const unit = hit && hit.art.units.find((item) => item.id === card.unitId);
  if (hit && unit && ['L', 'S'].includes(card.id.split(':')[0])) {
    const targets = findTargets(unit);
    const remembered = (last.target ?? last.expected)?.split(' | ') ?? [];
    const target = targets.find((item) => remembered.some((word) => fold(word) === fold(item.text))) ?? targets.find((item) => item.dim === card.dim);
    if (target) {
      const choices = buildLiteral(hit.law, hit.art, unit, target.dim, 1, 'memorizar', seed, undefined, target.text);
      if (choices) return { ...choices, key: card.id, practice: 'revanche' };
    }
  }
  const exercise = await exerciseForCard(card, 'memorizar', seed);
  return exercise && { ...exercise, practice: 'revanche' };
}

export async function buildDaily(cfg: SessionConfig, now = new Date()): Promise<Exercise[]> {
  const seed = `${dayKey(now)}:${cfg.area}:${cfg.focus}`;
  const ids = await scopeArticles(cfg, hashStr(seed));
  const scoped = new Set(ids);
  const [cards, reviews] = await Promise.all([db.cards.toArray(), latestReviews()]);
  const eligible = cards.filter((card) => card.articleId && scoped.has(card.articleId) && ['L', 'O', 'W', 'S', 'P'].includes(card.id.split(':')[0]));
  const wrong = eligible.filter((card) => reviews.get(card.id)?.correct === false)
    .sort((a, b) => reviews.get(b.id)!.at - reviews.get(a.id)!.at);
  const due = eligible.filter((card) => isDue(card.fsrs, now) && reviews.get(card.id)?.correct !== false)
    .sort((a, b) => retrievability(a.fsrs, now) - retrievability(b.fsrs, now));
  const used = new Set<string>();
  const result: Exercise[] = [];
  const add = (ex: Exercise | null, practice: Exercise['practice']) => {
    if (!ex || used.has(ex.key)) return false;
    used.add(ex.key);
    result.push({ ...ex, practice: ex.practice ?? practice });
    return true;
  };
  let revisions = 0;
  for (const card of due) {
    if (add(await exerciseForCard(card, 'memorizar', seed), 'revisao') && ++revisions >= 3) break;
  }
  let errors = 0;
  for (const card of wrong) {
    if (add(await revengeExercise(card, reviews.get(card.id)!, seed, true), 'revanche') && ++errors >= 2) break;
  }
  const seen = new Set(eligible.filter((card) => card.fsrs.reps).map((card) => card.id));
  const newLimit = result.length ? Math.min(result.length + 2, 7) : 7;
  const additional: Exercise[] = [];
  for (const id of ids) {
    if (result.length >= newLimit) break;
    const firstAndOthers = unitItems(id, 'memorizar', new Map(), seed, true).filter(({ key }) => !seen.has(key) && !used.has(key));
    const [first, ...others] = firstAndOthers;
    if (first) add(first, 'nova');
    if (others.length) additional.push(...others.slice(0, newLimit));
  }
  for (const exercise of additional.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
    if (result.length >= newLimit) break;
    add(exercise, 'nova');
  }
  return result;
}

export const BLITZ_SECONDS = 10;
export const BLITZ_COUNT = 20;
export const blitzDeadline = (shownAt: number) => shownAt + BLITZ_SECONDS * 1000;

/** Relâmpago: 20 questões curtas de lei seca, sorteadas no escopo, com alternativas. */
async function buildBlitz(config: SessionConfig, state: SessionState) {
  const r = rng(String(state.seed));
  const ids = await scopeArticles({ ...config, order: 'misturado' }, state.seed ?? 1);
  const cards = await db.cards.toArray();
  const studied = new Set(cards.flatMap(({ unitId, fsrs }) => unitId && fsrs.reps ? [unitId] : []));
  const pool = ids.flatMap((id) => {
    const hit = getArticle(id);
    return hit ? provisionUnits(hit.art).filter((unit) => unit.k !== 'pena').map((unit) => ({ ...hit, unit })) : [];
  });
  for (const { law, art, unit } of shuffle(pool, r).sort((a, b) =>
    Number(studied.has(a.unit.id)) - Number(studied.has(b.unit.id)))) {
    if (state.items.length >= BLITZ_COUNT) break;
    const exercise = buildMemory(law, art, unit, 1, String(state.seed), true);
    if (exercise) state.items.push({ ...exercise, expectedMs: BLITZ_SECONDS * 1000 });
  }
}

/** A meta avança apenas depois de praticar todos os exercícios da unidade planejada. */
async function buildPlannedStudy(state: SessionState, planner: NonNullable<SessionConfig['planner']>) {
  const { day, goal, quick } = planner;
  const taskId = plannerTaskKey(day, goal);
  const saved = await getPlannerTask(taskId);
  const completed = new Set(saved?.done);
  const seed = String(state.seed);
  const cards = new Map((await db.cards.toArray()).map((card) => [card.id, card]));
  const getArticleItems = (id: string) => {
    const hit = getArticle(id);
    if (!hit || !canTrainArticle(hit.art) || !hit.art.units.some((unit) => unit.t && !unit.rev)) return [];
    const exercises = unitItems(id, 'memorizar', cards, day + ':' + id, true);
    return exercises.length ? exercises : [buildGuidedRead(hit.law, hit.art)];
  };
  let groups: PlannerTask['groups'] = saved?.groups ?? [];
  const refreshGroups = (available: (id: string) => Set<string> | undefined) => groups.flatMap((group) => {
    if (group.keys.every((key) => completed.has(key))) return [group];
    const current = available(group.id);
    if (!current) return [group];
    const keys = group.keys.filter((key) => current.has(key));
    return keys.some((key) => !completed.has(key)) ? [{ ...group, keys }] : [];
  });
  if (goal.kind === 'law') {
    const scope = scopeToFocus(goal.scope);
    const scopeConfig: SessionConfig = { ...scope, minutes: 15, mode: 'memorizar', order: 'linear' };
    const sequence = await loadSequence(scopeConfig);
    const ids = await scopeArticles(scopeConfig, 0);
    const articleIndex = ids.indexOf(sequence?.articleId ?? '');
    const articles = articleIndex > 0 ? ids.slice(articleIndex) : ids;
    const read = new Set(await kvGet<string[]>('readArticles', []));
    groups = refreshGroups((id) => getLaw(lawIdOf(id)) ? new Set(getArticleItems(id).map(({ key }) => key)) : undefined);
    const selected = new Set(groups.map(({ id }) => id));
    for (const id of articles) {
      if (groups.length >= goal.target) break;
      if (selected.has(id)) continue;
      const keys = getArticleItems(id).filter((ex) => ex.kind === 'read' ? !read.has(id)
        : !cards.get(ex.key)?.fsrs.reps && !sequence?.practiced.includes(ex.key)).map((ex) => ex.key);
      if (keys.length) groups.push({ id, keys });
    }
  } else {
    const review = goal.kind === 'review';
    const pool = review ? (await reviewQueue()).map(({ card }) => ({ id: card.id, keys: [card.id] }))
      : doctrinePlannerGroups(goal.courseId, goal.unit);
    if (!review) {
      const current = new Map(pool.map(({ id, keys }) => [id, new Set(keys)]));
      groups = refreshGroups((id) => current.get(id) ?? new Set());
    }
    const selected = new Set(groups.map(({ id }) => id));
    groups = [...groups];
    for (const group of pool) {
      if (groups.length >= goal.target) break;
      if (selected.has(group.id)) continue;
      const keys = review ? group.keys : group.keys.filter((key) => !cards.get(key)?.fsrs.reps);
      if (keys.length) groups.push({ ...group, keys });
    }
  }
  const task: PlannerTask = { day, goal, groups, done: saved?.done ?? [] };
  const { remaining, done } = plannerProgress(task);
  let spent = 0;
  const budget = quick ? 300 : 900;
  for (const group of remaining) {
    if (spent >= budget) break;
    const legal = goal.kind === 'law' ? new Map(getArticleItems(group.id).map((ex) => [ex.key, ex])) : null;
    for (const key of group.keys) {
      if (done.has(key)) continue;
      const card = cards.get(key);
      const exercise = legal ? legal.get(key)
        : goal.kind === 'doctrine' ? doctrineExercise(key, seed)
          : card ? await exerciseForCard(card, 'memorizar', seed) : null;
      if (!exercise) continue;
      state.items.push(exercise);
      spent += exercise.expectedMs / 1000;
      if (spent >= budget) break;
    }
  }
  // Outra aba pode ter registrado tentativas enquanto o lote era montado.
  await db.transaction('rw', db.kv, async () => {
    const latest = await getPlannerTask(taskId);
    await db.kv.put({ key: taskId, value: { ...task, done: [...new Set([...task.done, ...(latest?.done ?? [])])] } satisfies PlannerTask });
  });
  state.config.timed = !!quick;
  state.config.infinite = false;
}

export async function buildSession(cfg: SessionConfig, persist = true, retryItems?: readonly Exercise[]): Promise<SessionState> {
  const area = cfg.area ?? getSettings().area;
  const config: SessionConfig = { ...cfg, area, order: cfg.order ?? DEFAULT_ARTICLE_ORDER, timed: !cfg.infinite && !cfg.blitz, infinite: cfg.blitz ? false : cfg.infinite };
  if (isMemoryMode(config.mode) && config.startArticleId && !config.backfillThrough) {
    const key = sequenceKey(config);
    const saved = key && await kvGet<SequencePosition | null>(key, null);
    if (saved && !saved.provisionCoverage && saved.articleId === config.startArticleId) {
      const repaired = await loadSequence(config);
      if (repaired) {
        config.startArticleId = repaired.articleId;
        config.sequenceSkip = repaired.practiced;
        config.backfillThrough = repaired.config?.backfillThrough;
      }
    }
  }
  const now = Date.now();
  const state: SessionState = {
    id: `s${now}-${Math.random().toString(36).slice(2, 8)}`, config, items: [], index: 0, results: [],
    startedAt: now, keepsClockOnReload: true, cursor: 0, seed: hashStr(`${now}:${cfg.focus}`), provisionCoverage: true,
  };
  if (cfg.activity) {
    if (cfg.activity === 'planner' && cfg.planner) {
      await buildPlannedStudy(state, cfg.planner);
    } else if (cfg.activity === 'doctrine' && cfg.doctrine) {
      state.items = await buildDoctrineSession(cfg.doctrine, String(state.seed));
    } else if (cfg.activity === 'retry') {
      state.items = (retryItems ?? []).filter(isStudyQuestion).map((item, index) => retryExercise(item, `${state.seed}:${index}`));
      state.config.infinite = false;
    } else if (cfg.activity === 'review') {
      const [cards, latest] = await Promise.all([db.cards.bulkGet(cfg.practiceCardIds ?? []), latestReviews()]);
      await ensureLaws([...new Set(cards.flatMap((card) => card?.articleId ? [card.articleId.split('.')[0]] : []))]);
      for (const card of cards) {
        if (!card) continue;
        const last = latest.get(card.id);
        const exercise = last && !last.correct
          ? await revengeExercise(card, last, String(state.seed), isMemoryMode(cfg.mode))
          : await exerciseForCard(card, cfg.mode, String(state.seed));
        if (exercise?.kind === 'cloze-multi' || (exercise && !isMemoryMode(cfg.mode))) state.items.push({ ...exercise, practice: exercise.practice ?? 'revisao' });
      }
    } else {
      state.items = cfg.activity === 'daily' ? await buildDaily(config) : await buildPairDrill(String(state.seed));
    }
    if (cfg.activity !== 'planner') state.config.timed = false;
    state.startedAt = Date.now();
    if (persist && state.items.length) await saveSession(state);
    return state;
  }
  if (cfg.blitz) {
    await buildBlitz(config, state);
    state.startedAt = Date.now();
    if (persist && state.items.length) await saveSession(state);
    return state;
  }
  const budget = cfg.infinite ? 6 * 60 : cfg.minutes * 60;
  const b = await nextBatch(state, budget);
  state.items.push(...b.items);
  state.cursor = b.cursor;
  state.startedAt = Date.now();
  if (persist && state.items.length) await saveSession(state);
  return state;
}

/** Modo infinito: acrescenta mais itens quando faltam poucos. Recomeça o escopo ao terminar. */
export async function extendSession(state: SessionState): Promise<SessionState> {
  const batch = await nextBatch(state, 6 * 60);
  if (batch.items.length) return { ...state, items: [...state.items, ...batch.items], cursor: batch.cursor };
  // Enquanto ainda houver perguntas na fila, preserva a ordem e tenta recomeçar ao chegar ao fim.
  if (state.index < state.items.length) return state;
  const restarted = {
    ...state, cursor: 0, seed: (state.seed ?? 1) + 1,
    config: { ...state.config, sequenceSkip: undefined, backfillThrough: undefined },
  };
  const repeated = await nextBatch(restarted, 6 * 60, true);
  return repeated.items.length
    ? { ...restarted, items: [...state.items, ...repeated.items], cursor: repeated.cursor }
    : state;
}

interface SequencePosition { articleId: string; practiced: string[]; config?: SessionConfig; updatedAt?: number; provisionCoverage?: true }

async function practicedUnits(mode: Mode, articles: string[]) {
  const practiced = new Set<string>();
  if (articles.length) await db.reviews.where('articleId').anyOf(articles).each((review) => {
    if (review.mode === mode && review.unitId) practiced.add(review.unitId);
  });
  return practiced;
}

async function firstUnpracticedArticle(mode: Mode, articles: string[]) {
  const covered = await practicedUnits(mode, articles);
  return articles.find((id) => {
    const hit = getArticle(id);
    return hit && provisionUnits(hit.art).some((unit) => !covered.has(unit.id));
  });
}

export async function recentSequences() {
  const rows = await db.kv.where('key').startsWith('["sequencia",').toArray();
  return rows.flatMap(({ value }) => {
    const saved = value as SequencePosition | null;
    return saved?.config && saved.updatedAt ? [{ ...saved, config: saved.config, updatedAt: saved.updatedAt }] : [];
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

function sequenceKey(cfg: SessionConfig) {
  if ((cfg.order ?? DEFAULT_ARTICLE_ORDER) !== 'linear' || cfg.activity || cfg.blitz || cfg.articleIds?.length || cfg.practiceCardIds?.length) return null;
  const mix = cfg.mode === 'provar' ? cfg.mix ?? getSettings().provarMix : '';
  return JSON.stringify(['sequencia', cfg.area ?? getSettings().area, cfg.focus, cfg.mode, mix]);
}

export async function loadSequence(cfg: SessionConfig): Promise<SequencePosition | null> {
  const key = sequenceKey(cfg);
  if (!key) return null;
  const saved = await kvGet<SequencePosition | null>(key, null);
  if (!saved) return null;
  const articles = await scopeArticles({ ...cfg, startArticleId: undefined }, 0);
  const end = articles.indexOf(saved.articleId);
  if (end < 0) return null;
  if (saved.provisionCoverage || !isMemoryMode(cfg.mode)) return saved;
  const first = await firstUnpracticedArticle(cfg.mode, articles.slice(0, end + 1));
  const articleId = first ?? saved.articleId;
  return {
    ...saved, articleId, practiced: articleId === saved.articleId ? saved.practiced : [],
    config: { ...(saved.config ?? cfg), backfillThrough: saved.articleId },
  };
}

export async function finishSession(s: SessionState, timedOut = false, options?: { expected: SessionState; replacement?: SessionState }): Promise<SessionState> {
  const next = { ...s, index: s.items.length, finishedAt: Date.now(), timedOut };
  const key = sequenceKey(s.config);
  let position: SequencePosition | null = null;
  if (key && s.results.length) {
    const pendingArticle = s.items.slice(Math.max(s.index, s.results.length)).find((item) => item.articleId)?.articleId;
    const currentScope = await scopeArticles(s.config, s.seed ?? 0);
    const articleId = pendingArticle ?? currentScope[s.cursor ?? 0];
    const practiced = articleId === s.config.startArticleId ? [...s.config.sequenceSkip ?? []] : [];
    if (pendingArticle) {
      for (const item of s.items.slice(0, s.results.length)) {
        if (item.articleId === pendingArticle) practiced.push(item.key);
      }
    }
    const { startArticleId, sequenceSkip, backfillThrough, ...config } = s.config;
    const stillBackfilling = articleId && backfillThrough && currentScope.indexOf(articleId) <= currentScope.indexOf(backfillThrough);
    position = articleId ? {
      articleId, practiced: [...new Set(practiced)], config: { ...config, backfillThrough: stillBackfilling ? backfillThrough : undefined },
      updatedAt: Date.now(), provisionCoverage: s.provisionCoverage,
    } : null;
    // A sessão em andamento pode ser anterior à cobertura integral, assim como seu ponto de partida.
    const old = isMemoryMode(s.config.mode) && startArticleId && !backfillThrough && await kvGet<SequencePosition | null>(key, null);
    if (old && !old.provisionCoverage) {
      const fullScope = await scopeArticles(config, s.seed ?? 0);
      const through = articleId ?? fullScope.at(-1);
      const first = await firstUnpracticedArticle(config.mode, fullScope.slice(0, fullScope.indexOf(through ?? '') + 1));
      if (first && first !== articleId) {
        position = { articleId: first, practiced: [], config: { ...config, backfillThrough: through }, updatedAt: Date.now(), provisionCoverage: true };
      }
    }
  }
  await db.transaction('rw', db.kv, async () => {
    if (options) await requireCurrentSession(options.expected);
    if (key && s.results.length) await db.kv.put({ key, value: position });
    await db.kv.put({ key: 'session', value: options?.replacement ?? next });
  });
  return next;
}

export async function saveSession(s: SessionState | null, expected?: SessionState | null) {
  if (expected === undefined) {
    await db.kv.put({ key: 'session', value: s });
    return;
  }
  await db.transaction('rw', db.kv, async () => {
    await requireCurrentSession(expected);
    await db.kv.put({ key: 'session', value: s });
  });
}

async function completeSavedMemory(saved: SessionState, pending: Exercise[], firstPending: number) {
  if (saved.provisionCoverage || saved.config.activity || saved.config.blitz || !isMemoryMode(saved.config.mode)) return pending;
  const answered = saved.items.slice(0, firstPending);
  const scheduled = new Set(answered.flatMap(({ unitId }) => unitId ? [unitId] : []));
  const byUnit = new Map<string, Exercise[]>();
  for (const exercise of pending) {
    if (!exercise.unitId) continue;
    const exercises = byUnit.get(exercise.unitId) ?? [];
    exercises.push(exercise);
    byUnit.set(exercise.unitId, exercises);
  }
  const articles = await scopeArticles(saved.config, saved.seed ?? 0);
  const ids = new Set<string>([
    ...articles.slice(0, saved.cursor ?? 0),
    ...[...answered, ...pending].flatMap(({ articleId }) => articleId ? [articleId] : []),
  ]);
  const queue = pending.filter(({ articleId }) => !articleId);
  for (const articleId of ids) {
    const hit = getArticle(articleId);
    if (!hit) continue;
    const { art, law } = hit;
    for (const unit of provisionUnits(art).sort((a, b) => Number(a.k === 'pena') - Number(b.k === 'pena'))) {
      const existing = byUnit.get(unit.id);
      if (existing) queue.push(...existing);
      else if (!scheduled.has(unit.id)) {
        const next = buildMemory(law, art, unit, 1, saved.id);
        if (next && !(articleId === saved.config.startArticleId && saved.config.sequenceSkip?.includes(next.key))) queue.push(next);
      }
    }
  }
  return queue;
}

export async function resumeSession(): Promise<SessionState | null> {
  const saved = await loadSession();
  if (!saved || saved.finishedAt) return saved;
  const firstPending = Math.max(saved.index, saved.results.length);
  const pendingLaws = new Set<string>();
  for (const exercise of saved.items.slice(firstPending)) {
    const reference = exercise.lawId ?? exercise.articleId ?? exercise.unitId;
    if (!reference) continue;
    const law = lawIdOf(reference);
    if (!getLaw(law)) pendingLaws.add(law);
  }
  if (pendingLaws.size) await ensureLaws([...pendingLaws]);
  const refreshMemory = isMemoryMode(saved.config.mode) && !saved.config.activity;
  let remaining = saved.items.slice(firstPending).flatMap((exercise) => {
    if (saved.config.mode === 'casos' && !saved.config.activity && exercise.kind === 'case'
      && exercise.key.startsWith('CI:')) {
      const replacement = CASE_BANK.find((entry) => entry.refs.some((ref) => `${ref.law}.${ref.art}` === exercise.articleId));
      return replacement ? [{ ...conceptExercise(replacement, saved.id), articleId: exercise.articleId }] : [];
    }
    if (saved.config.mode === 'aprender' && !saved.config.activity) {
      if (exercise.kind === 'lesson') return [];
      if (exercise.kind === 'read' && !exercise.readingFocus && exercise.articleId) {
        const hit = getArticle(exercise.articleId);
        if (hit) return [buildGuidedRead(hit.law, hit.art)];
      }
    }
    if (refreshMemory) {
      if (exercise.kind === 'rubric' && exercise.articleId && !saved.config.blitz) {
        const hit = getArticle(exercise.articleId);
        if (!hit) return [];
        return hit.art.units.flatMap((unit) => buildMemory(hit.law, hit.art, unit, 1, saved.id) ?? []).slice(0, 1);
      }
      if (exercise.kind === 'cloze-multi' && !saved.config.blitz && exercise.blanks && [2, 3].includes(exercise.blanks.length)
        && exercise.blanks.every(({ answer }) => shortAnswer(answer))
        && exercise.stem.filter(({ blank }) => blank).length === exercise.blanks.length) return [exercise];
      if (exercise.kind === 'cloze-mc' && saved.config.blitz && exercise.expectedMs === 10_000 && !exercise.context?.length) return [exercise];
      const unitId = exercise.unitId ?? (/^L:([^:]+):/.exec(exercise.key)?.[1]);
      const hit = unitId && getUnit(unitId);
      if (!hit) return [];
      const rebuilt = buildMemory(hit.law, hit.art, hit.unit, exercise.stage, saved.id, saved.config.blitz);
      return rebuilt ? [{ ...rebuilt, practice: exercise.practice }] : [];
    }
    if (exercise.articleId && ['literal', 'leitura'].includes(exercise.family)) {
      const hit = getArticle(exercise.articleId);
      if (hit && !canTrainArticle(hit.art)) return [];
      if (exercise.kind === 'which-article' && exercise.options &&
          new Set(exercise.options.map(({ text }) => normAnswer(text))).size < exercise.options.length) {
        const fixed = hit && buildWhich(hit.law, hit.art, exercise.stage);
        return fixed ? [{ ...fixed, practice: exercise.practice }] : [];
      }
    }
    // Sessões já respondidas mantêm seu histórico. As lacunas antigas ainda pendentes usam a seleção atual.
    if (saved.config.activity !== 'retry' && exercise.key.startsWith('L:') && exercise.kind.startsWith('cloze') && exercise.priority === undefined) {
      const unitId = exercise.unitId ?? exercise.key.split(':')[1];
      const hit = getUnit(unitId);
      if (hit) {
        const current = buildLiteral(hit.law, hit.art, hit.unit, exercise.dim, exercise.stage,
          saved.config.mode === 'provar' ? 'provar' : 'memorizar', saved.id);
        return current ? [{ ...current, practice: exercise.practice }] : [];
      }
    }
    if (!isCurrentDoctrineQuestion(exercise.key)) return [exercise];
    const current = doctrineExercise(exercise.key, String(saved.seed));
    if (!current) return [exercise];
    const sameOptions = current.options?.length === exercise.options?.length && current.options?.every((option, index) => {
      const savedOption = exercise.options?.[index];
      return savedOption?.id === option.id && savedOption.text === option.text
        && savedOption.correct === option.correct && savedOption.why === option.why;
    });
    const sameParts = JSON.stringify(current.doctrineParts) === JSON.stringify(exercise.doctrineParts);
    return [current.prompt === exercise.prompt && sameOptions && sameParts ? exercise : { ...current, practice: exercise.practice }];
  });
  if (refreshMemory) remaining = await completeSavedMemory(saved, remaining, firstPending);
  const used = new Set(saved.items.slice(0, firstPending).map((item) => item.key));
  if (refreshMemory) {
    for (let i = 0; i < remaining.length;) {
      const key = remaining[i].key;
      if (used.has(key)) remaining.splice(i, 1);
      else { used.add(key); i++; }
    }
  }
  const legacyTyped = saved.config.mode !== 'provar' && saved.config.activity !== 'retry' && remaining.some((exercise) => exercise.kind === 'cloze-type');
  const revised = remaining.length !== saved.items.length - firstPending
    || remaining.some((exercise, index) => exercise !== saved.items[firstPending + index]);
  if (!legacyTyped && !revised && !saved.pausedAt && !saved.config.timed) return saved;
  let items = revised ? [...saved.items.slice(0, firstPending), ...remaining] : saved.items;
  if (legacyTyped) {
    const unitIdOf = (exercise: Exercise) => exercise.unitId ?? (/^L:([^:]+):/.exec(exercise.key)?.[1]);
    const laws = remaining.filter((exercise) => exercise.kind === 'cloze-type').flatMap((exercise) => {
      const reference = exercise.lawId ?? exercise.articleId ?? unitIdOf(exercise);
      return reference ? [lawIdOf(reference)] : [];
    });
    await ensureLaws([...new Set(laws)]);
    const pairs = remaining.some((exercise) => exercise.key.startsWith('P:')) ? await buildPairDrill(saved.id) : [];
    items = [...saved.items.slice(0, firstPending), ...remaining.flatMap((exercise) => {
      if (exercise.kind !== 'cloze-type') return [exercise];
      const unitId = unitIdOf(exercise);
      const hit = unitId ? getUnit(unitId) : undefined;
      const choices = pairs.find((entry) => entry.key === exercise.key)
        ?? (hit ? buildLiteral(hit.law, hit.art, hit.unit, exercise.dim, exercise.stage, 'memorizar', saved.id, undefined, exercise.answer)
          ?? buildLiteral(hit.law, hit.art, hit.unit, exercise.dim, exercise.stage, 'memorizar', saved.id) : null);
      return choices ? [{ ...choices, key: exercise.key, practice: exercise.practice }] : [];
    })];
  }
  const now = Date.now();
  // Backups anteriores não guardavam o tempo de uma sessão fechada sem usar a pausa.
  const elapsed = saved.pausedAt !== undefined ? saved.pausedAt - saved.startedAt
    : saved.keepsClockOnReload ? now - saved.startedAt : saved.results.reduce((sum, result) => sum + result.ms, 0);
  const draft = items[saved.index] === saved.items[saved.index] ? saved.draft : undefined;
  const active = { ...saved, items, draft, startedAt: now - Math.max(0, elapsed), pausedAt: undefined, keepsClockOnReload: true, provisionCoverage: true } satisfies SessionState;
  if (firstPending >= items.length && saved.index === firstPending) return finishSession(active, false, { expected: saved });
  const deadline = sessionDeadline(active);
  if (firstPending < items.length && deadline !== null && now >= deadline) return finishSession(active, true, { expected: saved });
  await saveSession(active, saved);
  return active;
}

export function readSavedSession(value: unknown): SessionState | null {
  const saved = value as SessionState | null;
  if (!saved?.config || typeof saved.id !== 'string' || !Number.isFinite(saved.startedAt)
    || typeof saved.config.focus !== 'string' || !['aprender', 'memorizar', 'memorizar-guiada', 'casos', 'provar'].includes(saved.config.mode)
    || (saved.config.activity === 'planner' && !isPlannedSession(saved.config.planner))
    || !Array.isArray(saved.items) || !Array.isArray(saved.results)
    || !Number.isInteger(saved.index) || saved.index < 0 || saved.index > saved.items.length
    || (saved.draft != null && (!Array.isArray(saved.draft) || !saved.draft.every((id) => typeof id === 'string')))
    || saved.results.length > saved.items.length) return null;
  if (!saved.items.every((item) => item && typeof item.key === 'string' && typeof item.kind === 'string' && Array.isArray(item.stem))
    || !saved.results.every((result) => result && typeof result.key === 'string' && Number.isFinite(result.ms)
      && (result.correct === null || typeof result.correct === 'boolean'))) return null;
  if (saved.config.order) return saved;
  return { ...saved, config: { ...saved.config, order: 'misturado' } };
}

export async function loadSession(): Promise<SessionState | null> {
  return readSavedSession((await db.kv.get('session'))?.value);
}
export function lawShort(id: string) { return getLaw(id)?.short ?? id; }
