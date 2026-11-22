import { db, type CardRow } from '../data/db';
import { dayKey } from './mood';
import { isDue } from './scheduler';

export interface Stats { todayMs: number; todayCount: number; lastPracticeAt: number | null; streak: number; due: number; learned: number; total: number; accuracy7: number; days: { day: string; ms: number }[] }
const calendarDate = (from: Date, offset: number) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);

export async function getStats(now = new Date()): Promise<Stats> {
  let reviews: { at: number; ms: number; correct: boolean }[] = [];
  let cards: CardRow[] = [];
  let lastPracticeAt: number | null = null;
  try {
    reviews = await db.reviews.where('at').between(+calendarDate(now, -60), +now, true, true).toArray();
    lastPracticeAt = reviews.at(-1)?.at ?? (await db.reviews.where('at').belowOrEqual(+now).last())?.at ?? null;
    cards = await db.cards.toArray();
  } catch { /* sem dados */ }
  const today = dayKey(now);
  const byDay = new Map<string, number>();
  for (const r of reviews) {
    const day = dayKey(new Date(r.at));
    byDay.set(day, (byDay.get(day) ?? 0) + Math.max(0, Math.min(r.ms, 120000)));
  }
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const k = dayKey(calendarDate(now, -i));
    if (byDay.has(k)) streak++; else if (i > 0) break;
  }
  const last7 = reviews.filter((r) => r.at >= +calendarDate(now, -6));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = calendarDate(now, i - 6);
    return { day: date.toLocaleDateString('pt-BR', { weekday: 'narrow' }), ms: byDay.get(dayKey(date)) ?? 0 };
  });
  return {
    todayMs: byDay.get(today) || 0,
    todayCount: reviews.filter((r) => r.at >= +calendarDate(now, 0)).length,
    lastPracticeAt,
    streak, due: cards.filter((c) => isDue(c.fsrs, now)).length,
    learned: cards.filter((c) => c.fsrs.reps > 0).length, total: cards.length,
    accuracy7: last7.length ? last7.filter((r) => r.correct).length / last7.length : 0, days,
  };
}
