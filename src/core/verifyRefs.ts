// Conferência de referência legal contra o texto oficial (Node e navegador).
import type { LawDoc } from './types';
export type RefStatus = 'verificado' | 'pendente' | 'divergente';
export interface RefLike { law: string; art: string; quote?: string }
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[“”"'‘’]/g, '').replace(/\s+/g, ' ').trim();
const normNum = (s: string) => s.replace(/[º°]/g, '').replace(/\./g, '').toUpperCase();

export function checkRefAgainst(ref: RefLike, law: LawDoc | undefined): { status: RefStatus; detail?: string; articleId?: string } {
  if (!law) return { status: 'pendente', detail: `Lei "${ref.law}" ainda não importada — referência será conferida após a importação.` };
  const art = law.articles.find((a) => normNum(a.n) === normNum(ref.art));
  if (!art) return { status: 'divergente', detail: `Art. ${ref.art} não encontrado em ${law.short}.` };
  if (ref.quote) {
    const cur = fold(art.units.map((u) => u.t).join(' '));
    const q = fold(ref.quote);
    if (!cur.includes(q)) {
      const any = fold(art.units.map((u) => [u.t, ...(u.old || []).map((o) => o.t)].join(' ')).join(' '));
      return { status: 'divergente', articleId: art.id, detail: any.includes(q) ? `Trecho consta apenas de redação ANTERIOR do art. ${ref.art}.` : `Trecho não encontrado no texto oficial do art. ${ref.art}: "${ref.quote.slice(0, 80)}"` };
    }
  }
  return { status: 'verificado', articleId: art.id };
}
