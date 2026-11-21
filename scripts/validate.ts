// Validador de integridade do conteúdo didático.
// - Ref: lei importada? artigo existe? trecho (quote) consta do texto oficial?
// - DocRef: obra existe no acervo? página existe? trecho consta da página?
// Saída: public/data/verification.json (lido pelo app) e relatório no terminal.
// Falha (exit 1) se houver divergência em lei importada ou referência doutrinária inválida.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY } from '../src/content/glossary';
import { CONCEPTS } from '../src/content/concepts';
import { LESSONS } from '../src/content/lessons';
import { COMPARISONS } from '../src/content/comparisons';
import type { DocRef, Ref } from '../src/content/types';
import type { LawDoc } from '../src/core/types';
import { SOURCES } from '../src/core/sources';
import { checkRefAgainst } from '../src/core/verifyRefs';

const ROOT = new URL('..', import.meta.url).pathname;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[“”"'‘’]/g, '').replace(/\s+/g, ' ').trim();
const normNum = (s: string) => s.replace(/[º°]/g, '').replace(/\./g, '').toUpperCase();

const laws = new Map<string, LawDoc>();
for (const s of SOURCES) {
  const f = join(ROOT, 'public/data/laws', `${s.id}.json`);
  if (existsSync(f)) laws.set(s.id, JSON.parse(readFileSync(f, 'utf8')));
}

type Status = 'verificado' | 'pendente' | 'divergente';
interface RefResult { ref: Ref; status: Status; detail?: string; articleId?: string }
const checkRef = (ref: Ref): RefResult => ({ ref, ...checkRefAgainst(ref, laws.get(ref.law)) });

// ---- acervo doutrinário (opcional: só no ambiente de build que tem os arquivos) ----
const ACERVO = join(ROOT, 'acervo');
let catalog: { grupos: { arquivo: string; obras: { titulo: string }[] }[] } | null = null;
const pageCache = new Map<string, Map<number, string>>();
if (existsSync(join(ACERVO, 'catalogo_5md.json'))) catalog = JSON.parse(readFileSync(join(ACERVO, 'catalogo_5md.json'), 'utf8'));
function pagesOf(obra: string): Map<number, string> | null {
  if (!catalog) return null;
  if (pageCache.has(obra)) return pageCache.get(obra)!;
  for (const g of catalog.grupos) {
    const idx = g.obras.findIndex((o) => o.titulo === obra);
    if (idx < 0) continue;
    const s = readFileSync(join(ACERVO, g.arquivo), 'utf8');
    const borders = [...s.matchAll(/^<!-- ACERVO_OBRA_INICIO: (\d+) -->\s*$/gm)];
    const start = borders[idx].index! + borders[idx][0].length;
    const end = idx + 1 < borders.length ? borders[idx + 1].index! : s.length;
    const chapter = s.slice(start, end);
    const marks = [...chapter.matchAll(/^\[\[p\. (\d+)\]\]\s*$/gm)];
    const pages = new Map<number, string>();
    marks.forEach((m, j) => pages.set(+m[1], chapter.slice(m.index! + m[0].length, j + 1 < marks.length ? marks[j + 1].index! : chapter.length)));
    pageCache.set(obra, pages);
    return pages;
  }
  return null;
}
function checkDoc(d: DocRef): { doc: DocRef; status: Status | 'nao-verificavel'; detail?: string } {
  if (!catalog) return { doc: d, status: 'nao-verificavel', detail: 'Acervo indisponível neste ambiente.' };
  const pages = pagesOf(d.obra);
  if (!pages) return { doc: d, status: 'divergente', detail: `Obra não encontrada no catálogo: ${d.obra}` };
  const page = pages.get(d.pagina);
  if (!page) return { doc: d, status: 'divergente', detail: `Página ${d.pagina} inexistente em ${d.obra}` };
  const norm = (s: string) => fold(s).replace(/-\s+/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ');
  if (!norm(page).includes(norm(d.trecho))) return { doc: d, status: 'divergente', detail: `Trecho não encontrado na p. ${d.pagina} de ${d.obra}` };
  return { doc: d, status: 'verificado' };
}

const items: { kind: string; id: string; title: string; refs: RefResult[]; docs: ReturnType<typeof checkDoc>[] }[] = [];
for (const t of GLOSSARY) items.push({ kind: 'termo', id: t.id, title: t.termo, refs: t.fundamentacao.map(checkRef), docs: (t.doutrina || []).map(checkDoc) });
for (const c of CONCEPTS) items.push({ kind: 'exercicio', id: c.id, title: c.pergunta.slice(0, 60), refs: c.refs.map(checkRef), docs: [] });
for (const l of LESSONS) {
  const lref = l.slides.flatMap((s) => s.blocos.filter((b) => b.tipo === 'lei').map((b) => (b as { ref: Ref }).ref));
  items.push({ kind: 'microaula', id: l.id, title: l.titulo, refs: [...l.refs, ...lref].map(checkRef), docs: (l.doutrina || []).map(checkDoc) });
  for (const ch of l.checks) if (!CONCEPTS.some((c) => c.id === ch)) items.push({ kind: 'microaula', id: l.id, title: l.titulo, refs: [{ ref: { law: '-', art: '-' }, status: 'divergente', detail: `Exercício de compreensão inexistente: ${ch}` }], docs: [] });
}
for (const c of COMPARISONS) items.push({ kind: 'comparativo', id: c.id, title: c.titulo, refs: c.refs.map(checkRef), docs: [] });

// consistência interna
const termIds = new Set(GLOSSARY.map((t) => t.id));
const internal: string[] = [];
for (const t of GLOSSARY) for (const r of t.relacionados || []) if (!termIds.has(r)) internal.push(`Termo ${t.id}: relacionado inexistente "${r}"`);
for (const c of CONCEPTS) { const n = c.opcoes.filter((o) => o.correta).length; if (n !== 1) internal.push(`Exercício ${c.id}: ${n} alternativas corretas`); }
const ids = [...GLOSSARY.map((x) => x.id), ...CONCEPTS.map((x) => x.id), ...LESSONS.map((x) => x.id), ...COMPARISONS.map((x) => x.id)];
for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) internal.push(`Identificador duplicado: ${id}`);

const summary = (st: Status) => items.reduce((n, it) => n + it.refs.filter((r) => r.status === st).length, 0);
const out = {
  generatedAt: new Date().toISOString(),
  laws: [...laws.values()].map((l) => ({ id: l.id, sha256: l.provenance.sha256 })),
  totals: { verificado: summary('verificado'), pendente: summary('pendente'), divergente: summary('divergente'), doutrinaVerificada: items.reduce((n, it) => n + it.docs.filter((d) => d.status === 'verificado').length, 0) },
  internal,
  items: items.map((it) => ({ ...it, status: it.refs.some((r) => r.status === 'divergente') || it.docs.some((d) => d.status === 'divergente') ? 'divergente' : it.refs.some((r) => r.status === 'pendente') ? 'pendente' : 'verificado' })),
};
writeFileSync(join(ROOT, 'public/data/verification.json'), JSON.stringify(out));

console.log(`Referências legais: ${out.totals.verificado} verificadas · ${out.totals.pendente} aguardando importação · ${out.totals.divergente} divergentes`);
console.log(`Referências doutrinárias verificadas: ${out.totals.doutrinaVerificada}`);
for (const it of out.items) {
  for (const r of it.refs) if (r.status === 'divergente') console.log(`✗ [${it.kind}] ${it.id}: ${r.detail}`);
  for (const d of it.docs) if (d.status === 'divergente') console.log(`✗ [${it.kind}] ${it.id} (doutrina): ${d.detail}`);
}
for (const m of internal) console.log(`✗ ${m}`);
const bad = out.totals.divergente + internal.length + items.reduce((n, it) => n + it.docs.filter((d) => d.status === 'divergente').length, 0);
process.exit(bad ? 1 : 0);
