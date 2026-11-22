// "Bater o ponto": registro diário de presença (estilo check-in de academia) e ligas semanais
// por instâncias do Judiciário. Tudo local; ranking online e câmaras dependem de servidor (em breve).
import { db, kvGet } from '../data/db';
import { dayKey } from './mood';
import { xpFor } from './career';

export interface Ponto { day: string; at: number; min: number }
export function mergePontos(...sources: unknown[]): Ponto[] {
  const days = new Map<string, Ponto>();
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const p of source) {
      if (!p || typeof p.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.day)
        || !Number.isFinite(p.at) || !Number.isFinite(p.min) || p.min < 0) continue;
      if ((days.get(p.day)?.at ?? -Infinity) < p.at) days.set(p.day, p);
    }
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-400);
}

export const getPontos = async () => mergePontos(await kvGet('pontos', []));
export async function pontoHoje() { return (await getPontos()).find((p) => p.day === dayKey()); }
export async function baterPonto(min: number) {
  if (!Number.isFinite(min) || min < 0) throw new Error('Tempo de estudo inválido');
  const now = new Date();
  const day = dayKey(now);
  await db.transaction('rw', db.kv, async () => {
    const list = mergePontos((await db.kv.get('pontos'))?.value);
    if (list.some((p) => p.day === day)) return;
    await db.kv.put({ key: 'pontos', value: mergePontos(list, [{ day, at: +now, min }]) });
  });
}
/** Dias seguidos com ponto batido (hoje conta; se ainda não bateu hoje, conta a partir de ontem). */
export function pontoStreak(list: Ponto[]) {
  const days = new Set(list.map((p) => p.day));
  let n = 0;
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    const k = dayKey(date);
    if (days.has(k)) n++; else if (i > 0) break;
    date.setDate(date.getDate() - 1);
  }
  return n;
}

export const LIGAS = [
  { id: 'vara', name: 'Vara', min: 0, desc: 'Primeira instância: todo mundo começa aqui.' },
  { id: 'comarca', name: 'Comarca', min: 250, desc: 'Ritmo constante durante a semana.' },
  { id: 'tribunal', name: 'Tribunal', min: 700, desc: 'Segunda instância: estudo de verdade.' },
  { id: 'superior', name: 'Tribunal Superior', min: 1500, desc: 'Poucos chegam: semana de aprovado.' },
  { id: 'supremo', name: 'Supremo', min: 2800, desc: 'A última palavra. Semana impecável.' },
] as const;

/** Início da semana (segunda-feira, 0h). */
export function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); }

/** Pontos da semana (mesma regra da carreira) e liga correspondente. */
export async function ligaDaSemana() {
  let pts = 0;
  const from = weekStart();
  await db.reviews.where('at').aboveOrEqual(from).each((r) => { if (r.correct) pts += xpFor(r.type, r.rating === 2); }).catch(() => {});
  let i = 0;
  LIGAS.forEach((l, k) => { if (pts >= l.min) i = k; });
  const next = LIGAS[i + 1];
  return { pts, liga: LIGAS[i], idx: i, next, pct: next ? (pts - LIGAS[i].min) / (next.min - LIGAS[i].min) : 1, daysLeft: 7 - ((new Date().getDay() + 6) % 7) };
}
