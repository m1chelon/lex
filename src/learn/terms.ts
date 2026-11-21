// Detecção automática de termos jurídicos no texto legal.
import { GLOSSARY } from '../content/glossary';
import type { GlossaryTerm } from '../content/types';
import { fold } from './text';

const byId = new Map(GLOSSARY.map((t) => [t.id, t]));
export const getTerm = (id: string) => byId.get(id);

// variantes -> termo, ordenadas da mais longa para a mais curta (expressões compostas primeiro)
const variants: { v: string; id: string }[] = [];
for (const t of GLOSSARY) for (const v of [t.termo, ...t.variantes]) variants.push({ v: fold(v), id: t.id });
variants.sort((a, b) => b.v.length - a.v.length);
const vmap = new Map(variants.map((x) => [x.v, x.id]));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = variants.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${variants.map((x) => escape(x.v)).join('|')})(?![\\p{L}\\p{N}])`, 'gu') : null;

export interface TermHit { start: number; end: number; id: string }

/** Encontra termos no texto (comparação sem acentos e sem caixa; posições preservadas). */
const ctxRe = new Map(GLOSSARY.filter((t) => t.contexto).map((t) => [t.id, new RegExp(t.contexto!)]));

export function findTerms(text: string, lawId?: string): TermHit[] {
  if (!RE) return [];
  const f = fold(text);
  // fold preserva o comprimento para o português (NFD+remoção de marcas recompõe 1:1 em caracteres latinos)
  if (f.length !== text.length) return [];
  const hits: TermHit[] = [];
  RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(f))) {
    const id = vmap.get(m[1]);
    if (!id) continue;
    const term = byId.get(id)!;
    if (term.leis && lawId && !term.leis.includes(lawId)) continue;
    const cre = ctxRe.get(id);
    if (cre && !cre.test(f.slice(Math.max(0, m.index - 40), m.index + m[1].length + 40))) continue;
    hits.push({ start: m.index, end: m.index + m[1].length, id });
  }
  return hits;
}

export function termsInArticleText(texts: string[]): GlossaryTerm[] {
  const ids = new Set<string>();
  for (const t of texts) for (const h of findTerms(t)) ids.add(h.id);
  return [...ids].map((id) => byId.get(id)!).filter(Boolean);
}
