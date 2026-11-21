// Inteligência de aprendizagem: domínio por artigo em 6 dimensões.
// Um artigo NÃO é considerado dominado só pela literalidade: níveis altos
// exigem também as dimensões aplicáveis (conceitos, prazos, penas, exceções).
import { db, DIMS, type CardRow, type Dim } from '../data/db';
import { retrievability } from './scheduler';
import { getArticle } from '../data/corpus';
import { findTargets } from './generators';
import { CONCEPTS } from '../content/concepts';
import type { Article } from '../core/types';

export interface ArticleMastery {
  articleId: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  dims: Partial<Record<Dim, { score: number; cards: number; applicable: boolean }>>;
  due: number;
  seen: boolean;
  errors: number;
}

const stageWeight = [0.15, 0.45, 0.7, 0.9, 1];

/** Dimensões aplicáveis a um artigo (pelo texto e pelos exercícios conceituais vinculados). */
export function applicableDims(art: Article): Set<Dim> {
  const s = new Set<Dim>(['literal']);
  for (const u of art.units) for (const t of findTargets(u)) s.add(t.dim);
  const lawId = art.id.split('.')[0];
  for (const c of CONCEPTS) if (c.refs.some((r) => r.law === lawId && `${lawId}.${r.art}` === art.id)) c.dims.forEach((d) => s.add(d));
  return s;
}

export function computeMastery(articleId: string, cards: CardRow[], now = new Date()): ArticleMastery {
  const hit = getArticle(articleId);
  const appl = hit ? applicableDims(hit.art) : new Set<Dim>(['literal']);
  const dims: ArticleMastery['dims'] = {};
  let due = 0, errors = 0;
  for (const d of DIMS) {
    const cs = cards.filter((c) => c.dim === d.id);
    if (!cs.length) { dims[d.id] = { score: 0, cards: 0, applicable: appl.has(d.id) }; continue; }
    let sum = 0;
    for (const c of cs) {
      const r = c.fsrs.reps ? retrievability(c.fsrs, now) : 0;
      sum += Math.max(r * (stageWeight[c.stage] ?? 0), c.stage > 0 ? 0.08 : 0);
      if (c.fsrs.reps && new Date(c.fsrs.due) <= now) due++;
      errors += c.wrong;
    }
    dims[d.id] = { score: sum / cs.length, cards: cs.length, applicable: appl.has(d.id) };
  }
  const lit = dims.literal?.score ?? 0;
  const others = DIMS.filter((d) => d.id !== 'literal' && appl.has(d.id)).map((d) => dims[d.id]?.score ?? 0);
  const minOther = others.length ? Math.min(...others) : 1;
  const seen = cards.length > 0;
  const typedRecall = cards.some((c) => c.dim === 'literal' && c.stage >= 3);
  let level: ArticleMastery['level'] = 0;
  if (seen) level = 1;
  if (lit >= 0.25) level = 2;
  if (lit >= 0.55) level = 3;
  if (lit >= 0.7 && minOther >= 0.55) level = 4;
  if (lit >= 0.85 && minOther >= 0.8 && typedRecall) level = 5;
  return { articleId, level, dims, due, seen, errors };
}

export async function masteryFor(articleIds: string[]): Promise<Map<string, ArticleMastery>> {
  const out = new Map<string, ArticleMastery>();
  let all: CardRow[] = [];
  try { all = await db.cards.where('articleId').anyOf(articleIds).toArray(); } catch { all = []; }
  const by = new Map<string, CardRow[]>();
  for (const c of all) if (c.articleId) by.set(c.articleId, [...(by.get(c.articleId) || []), c]);
  // exercícios conceituais contam para todos os artigos referenciados
  let concept: CardRow[] = [];
  try { concept = await db.cards.where('dim').anyOf(['conceitual', 'aplicacao']).filter((c) => !!c.conceptId).toArray(); } catch { concept = []; }
  for (const c of concept) {
    const def = CONCEPTS.find((x) => x.id === c.conceptId);
    for (const r of def?.refs || []) {
      const id = `${r.law}.${r.art}`;
      if (articleIds.includes(id)) for (const d of def!.dims) by.set(id, [...(by.get(id) || []), { ...c, dim: d, articleId: id }]);
    }
  }
  for (const id of articleIds) out.set(id, computeMastery(id, by.get(id) || []));
  return out;
}

export const LEVEL_LABEL = ['Não iniciado', 'Lido', 'Em memorização', 'Literalidade firme', 'Compreendido', 'Dominado'];
