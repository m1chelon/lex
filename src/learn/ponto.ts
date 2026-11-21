// "Bater o ponto": registro diário de presença (estilo check-in de academia) e ligas semanais
// por instâncias do Judiciário. Tudo local; ranking online e câmaras dependem de servidor (em breve).
import { db, kvGet, kvSet } from '../data/db';
import { dayKey } from './mood';
import { xpFor } from './career';

export interface Ponto { day: string; at: number; min: number }
export const getPontos = () => kvGet<Ponto[]>('pontos', []);
export async function pontoHoje() { return (await getPontos()).find((p) => p.day === dayKey()); }
export async function baterPonto(min: number) {
  const list = (await getPontos()).filter((p) => p.day !== dayKey());
  list.push({ day: dayKey(), at: Date.now(), min });
  await kvSet('pontos', list.slice(-400));
}
/** Dias seguidos com ponto batido (hoje conta; se ainda não bateu hoje, conta a partir de ontem). */
export function pontoStreak(list: Ponto[]) {
  const days = new Set(list.map((p) => p.day));
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const k = dayKey(new Date(Date.now() - i * 86400000));
    if (days.has(k)) n++; else if (i > 0) break;
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
  await db.reviews.where('at').above(from).each((r) => { if (r.correct) pts += xpFor(r.type, r.rating === 2); }).catch(() => {});
  let i = 0;
  LIGAS.forEach((l, k) => { if (pts >= l.min) i = k; });
  const next = LIGAS[i + 1];
  return { pts, liga: LIGAS[i], idx: i, next, pct: next ? (pts - LIGAS[i].min) / (next.min - LIGAS[i].min) : 1, daysLeft: 7 - ((new Date().getDay() + 6) % 7) };
}
