import { db } from '../data/db';
import { isDue } from './scheduler';

export interface Stats { todayMs: number; todayCount: number; lastPracticeAt: number | null; streak: number; due: number; learned: number; total: number; accuracy7: number; days: { day: string; ms: number }[] }
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export async function getStats(): Promise<Stats> {
  const now = Date.now();
  let reviews: { at: number; ms: number; correct: boolean }[] = [];
  let cards: { fsrs: { reps: number; due: Date; state: number } }[] = [];
  let lastPracticeAt: number | null = null;
  try {
    reviews = await db.reviews.where('at').above(now - 60 * 86400000).toArray();
    lastPracticeAt = reviews.at(-1)?.at ?? (await db.reviews.orderBy('at').last())?.at ?? null;
    cards = await db.cards.toArray();
  } catch { /* sem dados */ }
  const today = dayKey(now);
  const byDay = new Map<string, number>();
  for (const r of reviews) byDay.set(dayKey(r.at), (byDay.get(dayKey(r.at)) || 0) + Math.min(r.ms, 120000));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const k = dayKey(now - i * 86400000);
    if (byDay.has(k)) streak++; else if (i > 0) break;
  }
  const last7 = reviews.filter((r) => r.at > now - 7 * 86400000);
  const days = Array.from({ length: 7 }, (_, i) => { const t = now - (6 - i) * 86400000; return { day: new Date(t).toLocaleDateString('pt-BR', { weekday: 'narrow' }), ms: byDay.get(dayKey(t)) || 0 }; });
  return {
    todayMs: byDay.get(today) || 0,
    todayCount: reviews.filter((r) => dayKey(r.at) === today).length,
    lastPracticeAt,
    streak, due: cards.filter((c) => isDue(c.fsrs as never)).length,
    learned: cards.filter((c) => c.fsrs.reps > 0).length, total: cards.length,
    accuracy7: last7.length ? last7.filter((r) => r.correct).length / last7.length : 0, days,
  };
}
