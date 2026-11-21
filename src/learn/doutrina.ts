// Comentário doutrinário curto (acervo do usuário) para o dispositivo respondido.
import { getUnit, getArticle } from '../data/corpus';
import { fold } from './text';
import { loadDoutrinaLaw } from './doutrinaStore';

export interface DoutrinaEntry { o: number; p: number; t: string; topic?: string; sub?: string }
interface DoutrinaFile { law: string; obras: string[]; aviso: string; arts: Record<string, DoutrinaEntry[]> }
export interface DoutrinaNote { obra: string; pagina: number; trecho: string; topico?: string; artigo: string }

const load = (law: string) => loadDoutrinaLaw<DoutrinaFile>(law);

const normLab = (s: string) => fold(s).replace(/[º°o.\s]/g, '').replace(/^inc(iso)?/, '');
const words = (s: string) => new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 4));

/** Escolhe o trecho mais ligado ao inciso/parágrafo respondido; cai para o artigo. */
export async function doutrinaFor(articleId?: string, unitId?: string): Promise<DoutrinaNote | null> {
  if (!articleId) return null;
  const hit = getArticle(articleId);
  if (!hit) return null;
  const f = await load(hit.law.id);
  const list = f?.arts[hit.art.n];
  if (!f || !list?.length) return null;
  const u = unitId ? getUnit(unitId)?.unit : undefined;
  let best = list[0], bestScore = -1;
  const uw = u ? words(u.t) : new Set<string>();
  const ul = u && u.k !== 'caput' && u.lab ? normLab(u.lab) : '';
  list.forEach((e, i) => {
    let sc = -i * 0.01; // ordem original (comentários seguem a estrutura do artigo)
    if (ul && e.sub && normLab(e.sub) === ul) sc += 3;
    if (ul && u?.k === 'par' && fold(e.t).includes(fold(u.lab).replace(/\s+/g, ' '))) sc += 1.5;
    if (ul && u?.k === 'inc' && new RegExp(`\\b(inciso )?${u.lab}\\b`).test(e.t)) sc += 1.5;
    if (uw.size) { const ew = words((e.topic ?? '') + ' ' + e.t); let n = 0; uw.forEach((w) => { if (ew.has(w)) n++; }); sc += n / Math.max(4, uw.size); }
    if (sc > bestScore) { bestScore = sc; best = e; }
  });
  return { obra: f.obras[best.o], pagina: best.p, trecho: best.t, topico: best.topic, artigo: hit.art.lab };
}
