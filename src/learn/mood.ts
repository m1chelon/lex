// Bem-estar do jogador: check-in de humor (um por dia), guardado só no aparelho.
import { kvGet, kvSet } from '../data/db';

export type MoodId = 'otimo' | 'bem' | 'ok' | 'cansado' | 'triste' | 'ansioso';
export interface MoodEntry { day: string; mood: MoodId; note?: string; at: number }

export const MOODS: { id: MoodId; label: string; tint: string; reply: string }[] = [
  { id: 'otimo', label: 'Ótimo', tint: '135, 206, 96', reply: 'Que bom! Aproveita essa energia — mas lembra de pausar entre as sessões.' },
  { id: 'bem', label: 'Bem', tint: '64, 205, 190', reply: 'Boa! Dia bom é dia de constância. Bora manter o ritmo.' },
  { id: 'ok', label: 'Mais ou menos', tint: '142, 151, 253', reply: 'Tudo bem ter dias assim. Uma sessão curta já conta.' },
  { id: 'cansado', label: 'Cansado', tint: '255, 156, 70', reply: 'Descanso também é estudo. Que tal uma respiração de 1 minuto antes?' },
  { id: 'ansioso', label: 'Ansioso', tint: '255, 92, 138', reply: 'Respira comigo um minuto. A prova é uma etapa, não a sua medida.' },
  { id: 'triste', label: 'Triste', tint: '110, 160, 255', reply: 'Sinto muito que hoje esteja difícil. Seja gentil com você — o estudo pode esperar um pouco.' },
];

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getMoods = () => kvGet<MoodEntry[]>('moods', []);
export async function todayMood(): Promise<MoodEntry | undefined> { return (await getMoods()).find((m) => m.day === dayKey()); }
export async function saveMood(mood: MoodId, note?: string) {
  const list = (await getMoods()).filter((m) => m.day !== dayKey());
  list.push({ day: dayKey(), mood, note: note?.trim() || undefined, at: Date.now() });
  await kvSet('moods', list.slice(-120));
}
/** "Prefiro não responder hoje": não pergunta de novo até amanhã, sem registrar humor. */
export const skipToday = () => kvSet('moodSkip', dayKey());
export async function answeredToday() { return !!(await todayMood()) || (await kvGet('moodSkip', '')) === dayKey(); }

/** Dias difíceis seguidos (triste/ansioso) — para oferecer apoio humano (CVV 188). */
export async function hardStreak(): Promise<number> {
  const list = (await getMoods()).sort((a, b) => b.at - a.at);
  let n = 0;
  for (const m of list) { if (m.mood === 'triste' || m.mood === 'ansioso') n++; else break; }
  return n;
}
