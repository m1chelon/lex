// Anexo VIII do Edital TJSP nº 02/2026 (Escrevente Técnico Judiciário) — Bloco II e Bloco III.
// Transcrição estruturada do conteúdo programático de legislação, para cálculo de cobertura.
import type { Article, HeadingKind, LawDoc } from './types';
import { artSort } from './parser';
import { ordinalKey } from './roman';

export type Selector =
  | { range: [string, string] }
  | { art: string }
  | { all: true }
  | { path: { kind: HeadingKind; num: string }[] };

export interface Requirement {
  id: string;
  bloco: string;
  topico: string; // como no edital
  law: string;
  texto: string; // trecho literal do edital
  sel: Selector[];
  previstos?: string; // descrição dos artigos esperados, exibida enquanto a lei não é importada
}

const r = (a: string, b: string): Selector => ({ range: [a, b] });
const a = (n: string): Selector => ({ art: n });
const p = (...xs: [HeadingKind, string][]): Selector => ({ path: xs.map(([kind, num]) => ({ kind, num })) });

export const REQUIREMENTS: Requirement[] = [
  { id: 'penal-cp', bloco: 'II', topico: '1. Direito Penal', law: 'cp', texto: 'Código Penal – artigos 293 a 305; 307; 308; 311-A; 312 a 317; 319 a 333; 336 e 337; 339 a 347; 357 e 359.', sel: [r('293', '305'), a('307'), a('308'), a('311-A'), r('312', '317'), r('319', '333'), a('336'), a('337'), r('339', '347'), a('357'), a('359')] },
  { id: 'pp-cpp', bloco: 'II', topico: '2. Direito Processual Penal', law: 'cpp', texto: 'Código de Processo Penal – artigos 251 a 258; 261 a 267; 274; 351 a 372; 394 a 497; 531 a 538; 541 a 548; 574 a 667', sel: [r('251', '258'), r('261', '267'), a('274'), r('351', '372'), r('394', '497'), r('531', '538'), r('541', '548'), r('574', '667')] },
  { id: 'pp-9099', bloco: 'II', topico: '2. Direito Processual Penal', law: 'l9099', texto: 'Lei n.º 9.099 de 26.09.1995 (artigos 60 a 83; 88 e 89)', sel: [r('60', '83'), a('88'), a('89')] },
  { id: 'pc-cpc', bloco: 'II', topico: '3. Direito Processual Civil', law: 'cpc', texto: '3.1. Código de Processo Civil – artigos 144 a 155; 188 a 275; 294 a 311 e do 318 a 538; 994 a 1026', sel: [r('144', '155'), r('188', '275'), r('294', '311'), r('318', '538'), r('994', '1026')] },
  { id: 'pc-9099', bloco: 'II', topico: '3. Direito Processual Civil', law: 'l9099', texto: '3.2. Lei n.º 9.099 de 26.09.1995 (artigos 3º ao 19)', sel: [r('3', '19')] },
  { id: 'pc-12153', bloco: 'II', topico: '3. Direito Processual Civil', law: 'l12153', texto: '3.3. Lei n.º 12.153 de 22/12/2009.', sel: [{ all: true }], previstos: 'Íntegra da Lei nº 12.153/2009' },
  { id: 'const-cf', bloco: 'II', topico: '4. Direito Constitucional', law: 'cf', texto: 'Constituição Federal – Título II – Capítulos I, II e III; e Título III – Capítulo VII com Seções I e II; e também o artigo 92.', sel: [p(['titulo', 'II'], ['capitulo', 'I']), p(['titulo', 'II'], ['capitulo', 'II']), p(['titulo', 'II'], ['capitulo', 'III']), p(['titulo', 'III'], ['capitulo', 'VII'], ['secao', 'I']), p(['titulo', 'III'], ['capitulo', 'VII'], ['secao', 'II']), a('92')], previstos: 'Título II, Caps. I a III; Título III, Cap. VII, Seções I e II; art. 92' },
  { id: 'adm-efp', bloco: 'II', topico: '5. Direito Administrativo', law: 'efp', texto: '5.1. Estatuto dos Funcionários Públicos Civis do Estado de São Paulo (Lei n.º 10.261/68) – artigos 1º a 86; 171 a 175; 239 a 323', sel: [r('1', '86'), r('171', '175'), r('239', '323')] },
  { id: 'adm-lia', bloco: 'II', topico: '5. Direito Administrativo', law: 'l8429', texto: '5.2. Lei Federal n.º 8.429/92 (Lei de Improbidade Administrativa).', sel: [{ all: true }], previstos: 'Íntegra da Lei nº 8.429/1992' },
  { id: 'int-850', bloco: 'II', topico: '6. Legislação Interna', law: 'res850', texto: '6.1. Resolução TJSP nº 850/2021 (Regulamenta o teletrabalho no âmbito do Tribunal de Justiça do Estado de São Paulo e dá outras providências).', sel: [{ all: true }] },
  { id: 'int-963', bloco: 'II', topico: '6. Legislação Interna', law: 'res963', texto: '6.2. Resolução TJSP nº 963/2025 (Dispõe sobre a governança e utilização do sistema eproc nas unidades do Poder Judiciário do Estado de São Paulo e dá outras providências).', sel: [{ all: true }] },
  { id: 'int-1111', bloco: 'II', topico: '6. Legislação Interna', law: 'lc1111', texto: '6.2. Lei Complementar n° 1.111/2010 (Institui o Plano de Cargos e Carreiras dos servidores do Tribunal de Justiça do Estado de São Paulo e dá providências correlatas).', sel: [{ all: true }] },
  { id: 'int-ri', bloco: 'II', topico: '6. Legislação Interna', law: 'ritjsp', texto: '6.3. Regimento Interno do Tribunal de Justiça.', sel: [{ all: true }] },
  { id: 'int-nscgj', bloco: 'II', topico: '6. Legislação Interna', law: 'nscgj', texto: '6.4. Normas da Corregedoria Geral da Justiça: Tomo I – Capítulo II: Seção I – subseções I e II; Tomo I – Capítulo III: Seções I, II, V, VI, VII; Tomo I – Capítulo III: Seção VIII – subseções I, II e III; Tomo I – Capítulo III: Seções IX a XIX; Tomo I – Capítulo XI: Seção I a VII.', sel: [
    p(['capitulo', 'II'], ['secao', 'I'], ['subsecao', 'I']), p(['capitulo', 'II'], ['secao', 'I'], ['subsecao', 'II']),
    ...['I', 'II', 'V', 'VI', 'VII'].map((s) => p(['capitulo', 'III'], ['secao', s])),
    ...['I', 'II', 'III'].map((s) => p(['capitulo', 'III'], ['secao', 'VIII'], ['subsecao', s])),
    ...['IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX'].map((s) => p(['capitulo', 'III'], ['secao', s])),
    ...['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].map((s) => p(['capitulo', 'XI'], ['secao', s])),
  ] },
  { id: 'ger-epd', bloco: 'III', topico: 'Atualidades — item 2', law: 'l13146', texto: 'Artigos 1º ao 13; 34 ao 38 da Lei n.º 13.146/2015 – Estatuto da Pessoa com Deficiência, com as alterações vigentes até a publicação deste edital.', sel: [r('1', '13'), r('34', '38')] },
];

const numEq = (x: string, y: string) => {
  const kx = ordinalKey(x), ky = ordinalKey(y);
  return !Number.isNaN(kx) && kx === ky;
};

/** Caminho de headings (do mais geral ao mais específico) de um artigo. */
export function headingPath(doc: LawDoc, art: Article) {
  const byId = new Map(doc.headings.map((h) => [h.id, h]));
  const out = [];
  let h = art.h ? byId.get(art.h) : undefined;
  while (h) { out.unshift(h); h = h.parent ? byId.get(h.parent) : undefined; }
  return out;
}

function matches(doc: LawDoc, art: Article, sel: Selector): boolean {
  if ('all' in sel) return true; // íntegra inclui disposições transitórias
  if (/^[a-z]+\d*-/.test(art.n)) return false; // segmentos (ADCT etc.) só entram pela íntegra
  if ('art' in sel) return numEq(art.n, sel.art);
  if ('range' in sel) {
    const s = artSort(art.n);
    return s >= artSort(sel.range[0]) && s <= artSort(sel.range[1]);
  }
  const path = headingPath(doc, art);
  return sel.path.every((want) => path.some((h) => h.kind === want.kind && numEq(h.num, want.num)));
}

export interface CoverageItem {
  req: Requirement;
  articles: string[]; // ids
  missing: string[]; // descrições de seletores sem correspondência
  lettered: string[]; // artigos com letra incluídos por faixa (informativo)
}

export function resolveRequirement(doc: LawDoc | undefined, req: Requirement): CoverageItem {
  if (!doc) return { req, articles: [], missing: ['Lei não importada'], lettered: [] };
  const ids = new Set<string>();
  const missing: string[] = [];
  const lettered: string[] = [];
  for (const sel of req.sel) {
    const hit = doc.articles.filter((x) => matches(doc, x, sel));
    if (!hit.length) missing.push(describe(sel));
    if ('range' in sel) {
      // verificar números inteiros ausentes na faixa
      const lo = Math.floor(artSort(sel.range[0])), hi = Math.floor(artSort(sel.range[1]));
      const have = new Set(hit.map((x) => Math.floor(artSort(x.n))));
      for (let n = lo; n <= hi; n++) if (!have.has(n)) missing.push(`art. ${n} (não localizado na fonte)`);
      hit.filter((x) => /-[A-Z]$/.test(x.n)).forEach((x) => lettered.push(x.n));
    }
    hit.forEach((x) => ids.add(x.id));
  }
  return { req, articles: [...ids], missing, lettered };
}

export function describe(sel: Selector): string {
  if ('all' in sel) return 'íntegra';
  if ('art' in sel) return `art. ${sel.art}`;
  if ('range' in sel) return `arts. ${sel.range[0]} a ${sel.range[1]}`;
  return sel.path.map((x) => `${x.kind} ${x.num}`).join(' › ');
}

/** Números de artigos esperados (apenas seletores de faixa/artigo) — para exibir lacunas antes da importação. */
export function expectedNumbers(req: Requirement): string[] {
  const out: string[] = [];
  for (const s of req.sel) {
    if ('art' in s) out.push(s.art);
    else if ('range' in s) { const lo = Math.floor(artSort(s.range[0])), hi = Math.floor(artSort(s.range[1])); for (let n = lo; n <= hi; n++) out.push(String(n)); }
  }
  return out;
}
