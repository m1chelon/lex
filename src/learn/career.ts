// Carreira da Capi: sobe-se de cargo com pontos de acerto, que valem mais nas perguntas difíceis.
import { db } from '../data/db';

export const RANKS = [
  { name: 'Estagiário', min: 0, desc: 'Primeiros passos na lei seca.' },
  { name: 'Assessor', min: 3000, desc: 'Já reconhece a redação dos principais artigos.' },
  { name: 'Advogado', min: 10000, desc: 'Domina a literalidade e começa a aplicar.' },
  { name: 'Juiz', min: 25000, desc: 'Decide com segurança entre redações parecidas.' },
  { name: 'Desembargador', min: 55000, desc: 'Revisa a lei inteira sem tropeçar nas pegadinhas.' },
  { name: 'Ministro', min: 110000, desc: 'Nível de tribunal superior.' },
];

/** Pontos por acerto, conforme a dificuldade do tipo de pergunta. */
const XP: Record<string, number> = { tf: 3, ce: 3, 'cloze-mc': 4, 'which-article': 5, rubric: 5, order: 6, mc5: 6, concept: 7, doctrine: 7, case: 8, spot: 8, 'cloze-multi': 9, 'cloze-type': 10 };
export const xpFor = (kind: string, slow = false) => Math.max(1, Math.round((XP[kind] ?? 4) * (slow ? 0.5 : 1)));

export interface Career { rank: number; name: string; sub: string; xp: number; next?: { name: string; min: number }; pct: number }

export function careerFor(xp: number): Career {
  let rank = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) rank = i;
  const next = RANKS[rank + 1];
  const span = next ? next.min - RANKS[rank].min : 1;
  const pct = next ? (xp - RANKS[rank].min) / span : 1;
  const sub = next ? ['I', 'II', 'III'][Math.min(2, Math.floor(pct * 3))] : '';
  return { rank, name: RANKS[rank].name, sub, xp, next: next ? { name: next.name, min: next.min } : undefined, pct };
}
export const careerLabel = (c: Career) => (c.sub ? `${c.name} ${c.sub}` : c.name);

export async function getCareer(): Promise<Career> {
  let xp = 0;
  // resposta certa mas lenta (nota "difícil" = 2) vale metade
  await db.reviews.each((r) => { if (r.correct) xp += xpFor(r.type, r.rating === 2); }).catch(() => {});
  return careerFor(xp);
}
