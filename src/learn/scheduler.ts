// Repetição espaçada com FSRS (ts-fsrs) + calibração individual da retenção-alvo.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { db, kvGet, type CardRow, type Dim } from '../data/db';

export interface Calib { retention: number; n: number; predicted: number; actual: number }
const DEFAULT_CALIB: Calib = { retention: 0.9, n: 0, predicted: 0, actual: 0 };
let calib: Calib = DEFAULT_CALIB;
let engine = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true, maximum_interval: 365 }));

export async function loadCalibration() {
  calib = await kvGet<Calib>('calib', DEFAULT_CALIB);
  engine = fsrs(generatorParameters({ request_retention: calib.retention, enable_fuzz: true, maximum_interval: 365 }));
}
export const getCalibration = () => calib;

/** Retenção estimada agora (0..1). Cartão novo = 0. */
export function retrievability(card: Card, now = new Date()): number {
  if (card.state === State.New) return 0;
  const r = engine.get_retrievability(card, now, false) as unknown as number;
  return Number.isFinite(r) ? r : 0;
}

export function newCard(now = new Date()): Card { return createEmptyCard(now); }

/** Converte o resultado do exercício em nota FSRS. */
export function gradeFor(correct: boolean, ms: number, expectedMs: number, stage: number): Grade {
  if (!correct) return Rating.Again;
  if (ms > expectedMs * 1.8) return Rating.Hard;
  if (ms < expectedMs * 0.6 && stage >= 3) return Rating.Easy;
  return Rating.Good;
}

export async function ensureCard(id: string, base: Omit<CardRow, 'id' | 'fsrs' | 'createdAt' | 'correct' | 'wrong' | 'stage'>): Promise<CardRow> {
  const have = await db.cards.get(id);
  if (have) return have;
  const row: CardRow = { id, ...base, fsrs: newCard(), createdAt: Date.now(), correct: 0, wrong: 0, stage: 0 };
  await db.cards.put(row);
  return row;
}

/** Registra resposta: atualiza FSRS, degrau de progressão, histórico e calibração. */
export async function recordAnswer(opts: { cardId: string; base: Omit<CardRow, 'id' | 'fsrs' | 'createdAt' | 'correct' | 'wrong' | 'stage'>; correct: boolean; ms: number; expectedMs: number; mode: string; type: string; given?: string; expected?: string; target?: string; stageDelta?: number }) {
  return db.transaction('rw', db.cards, db.reviews, db.kv, async () => {
    const now = new Date();
    const row = await ensureCard(opts.cardId, opts.base);
    const predicted = retrievability(row.fsrs, now);
    const grade = gradeFor(opts.correct, opts.ms, opts.expectedMs, row.stage);
    const next = engine.next(row.fsrs, now, grade);
    const stage = Math.max(0, Math.min(4, row.stage + (opts.stageDelta ?? (opts.correct ? 1 : -1))));
    const updated: CardRow = { ...row, fsrs: next.card, stage, correct: row.correct + (opts.correct ? 1 : 0), wrong: row.wrong + (opts.correct ? 0 : 1) };
    await db.cards.put(updated);
    const reviewId = await db.reviews.add({ cardId: row.id, articleId: row.articleId, unitId: row.unitId, dim: row.dim, type: opts.type, correct: opts.correct, rating: grade, at: now.getTime(), ms: opts.ms, mode: opts.mode, given: opts.given, expected: opts.expected, target: opts.target });
    // calibração: compara retenção prevista e acerto real nas revisões
    if (row.fsrs.state !== State.New) {
      const previous = (await db.kv.get('calib'))?.value as Calib | undefined ?? DEFAULT_CALIB;
      calib = { ...previous, n: previous.n + 1, predicted: previous.predicted + predicted, actual: previous.actual + (opts.correct ? 1 : 0) };
      if (calib.n >= 30 && calib.n % 10 === 0) {
        const gap = calib.actual / calib.n - calib.predicted / calib.n;
        // acertando menos do que o previsto -> revisões mais frequentes; acertando mais -> mais espaçadas
        calib.retention = Math.max(0.85, Math.min(0.95, calib.retention + (gap < -0.05 ? 0.01 : gap > 0.05 ? -0.01 : 0)));
        engine = fsrs(generatorParameters({ request_retention: calib.retention, enable_fuzz: true, maximum_interval: 365 }));
      }
      await db.kv.put({ key: 'calib', value: calib });
    }
    return { updated, grade, predicted, reviewId, previous: row.fsrs.reps ? row : undefined };
  });
}

export async function markSeen(id: string, base: Omit<CardRow, 'id' | 'fsrs' | 'createdAt' | 'correct' | 'wrong' | 'stage'>) {
  await ensureCard(id, base);
}

export function isDue(card: Card, now = new Date()) { return card.state !== State.New && new Date(card.due).getTime() <= now.getTime(); }
export { State };
export type { Dim };

/** "Chutei": refaz a nota do último acerto como difícil (Hard), sem subir de degrau. */
export async function regradeAsGuess(prev: CardRow | undefined, cardId: string, reviewId?: number) {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    const current = await db.cards.get(cardId);
    const last = await db.reviews.where('cardId').equals(cardId).last();
    if (!current || !last?.id || !last.correct || last.guessed || (reviewId !== undefined && last.id !== reviewId)) return;
    const next = engine.next(prev?.fsrs ?? newCard(), new Date(), Rating.Hard);
    await db.cards.put({ ...current, fsrs: next.card, stage: prev?.stage ?? Math.max(0, current.stage - 1) });
    await db.reviews.update(last.id, { rating: Rating.Hard, guessed: true });
  });
}
