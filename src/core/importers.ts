// Conversão de arquivos brutos das fontes oficiais em LawDoc (Node e navegador).
import type { Article, Block, Heading, LawDoc, Provenance } from './types';
import type { SourceDef } from './sources';
import { decodeHtmlBytes, htmlToBlocks } from './html';
import { classify, headMatch, isStart, joinPdfLines, parseLaw, PARSER_VERSION, splitNotes } from './parser';

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function prov(src: SourceDef, sha: string, versionLabel: string, method: 'automatico' | 'manual', retrievedAt = new Date().toISOString()): Provenance {
  return { sourceName: src.sourceName, sourceUrl: src.url, retrievedAt, sha256: sha, versionLabel, method, parserVersion: PARSER_VERSION };
}

/** Recorta blocos a partir do primeiro "Art. 1º <texto>", incluindo títulos imediatamente anteriores. */
export function startAtFirstArticle(blocks: Block[], re = /^Art(?:igo)?\.?\s*1(?![\d.])\s*[º°o]?\s*[-–.]?\s*\S/): Block[] {
  // candidato = "Art. 1º" seguido da maior sequência crescente de artigos (evita atos de aprovação/preâmbulos)
  const cands = blocks.map((b, idx) => (re.test(b.t) && !b.struck ? idx : -1)).filter((x) => x >= 0);
  if (!cands.length) return blocks;
  let i = cands[0], best = -1;
  for (const c of cands) {
    let last = 0, count = 0;
    for (let j = c; j < blocks.length; j++) {
      const k = classify(blocks[j].t);
      if (k.kind !== 'art' || blocks[j].struck) continue;
      const n = parseFloat(k.num!.replace(/-.*/, ''));
      if (n < last) break;
      last = n; count++;
    }
    if (count > best) { best = count; i = c; }
  }
  let k = 0;
  while (i > 0 && k < 8) {
    const prev = blocks[i - 1];
    const c = classify(prev.t);
    if (/\.{5,}/.test(prev.t)) break;
    if (c.kind === 'head' || (prev.t.length < 120 && !/[.;:,]$/.test(prev.t) && c.kind === 'none')) { i--; k++; } else break;
  }
  return blocks.slice(i);
}

export async function importHtmlSource(src: SourceDef, bytes: Uint8Array, method: 'automatico' | 'manual', retrievedAt?: string, versionOverride?: string): Promise<LawDoc> {
  const sha = await sha256Hex(bytes);
  const html = decodeHtmlBytes(bytes);
  let blocks = htmlToBlocks(html);
  let versionLabel = 'Texto compilado obtido na data da importação';
  if (src.kind === 'ms-legis') {
    versionLabel = 'Legislação Estadual de MS — texto compilado obtido na data da importação (alterações indicadas no próprio texto)';
    blocks = startAtFirstArticle(blocks);
  } else if (src.kind === 'manual') {
    versionLabel = 'Arquivo fornecido pelo usuário a partir da fonte oficial indicada';
    blocks = startAtFirstArticle(blocks);
  } else if (src.kind === 'alesp') {
    const m = html.match(/[ÚU]ltima atualiza[çc][ãa]o:\s*([^<)]+)/i) || html.match(/&Uacute;ltima atualiza&ccedil;&atilde;o:\s*([^<)]+)/i);
    if (m) versionLabel = `Compilação ALESP — última atualização: ${m[1].replace(/&#176;/g, 'º').trim()}`;
    blocks = startAtFirstArticle(blocks);
  } else if (src.kind === 'senado' || src.kind === 'planalto') {
    // Planalto: o texto vigente aparece sem tachado; redações anteriores vêm em <strike>
    const iniBlocks = blocks;
    blocks = startAtFirstArticle(blocks);
    // preserva preâmbulo (ementa) para exibição
    if (blocks.length === iniBlocks.length) versionLabel += ' (marcador de início não localizado)';
  }
  if (versionOverride) versionLabel = versionOverride;
  else if (method === 'manual' && /planalto|presid[êe]ncia da rep[úu]blica/i.test(html)) versionLabel = 'Texto compilado do Planalto, importado manualmente';
  const doc = parseLaw(blocks, { lawId: src.id, title: src.title, short: src.short, provenance: prov(src, sha, versionLabel, method, retrievedAt) });
  if (method === 'manual' && /planalto/i.test(html)) { doc.provenance.sourceName = 'Presidência da República — Portal da Legislação (Planalto)'; doc.provenance.sourceUrl = src.planaltoUrl ?? src.url; }
  if (src.kind === 'planalto' && !/planalto|presid[êe]ncia da rep[úu]blica/i.test(html)) doc.stats.warnings.push('O arquivo não parece ter sido salvo do portal do Planalto — confira a origem.');
  return doc;
}

export async function importEsajJson(src: SourceDef, bytes: Uint8Array, method: 'automatico' | 'manual', retrievedAt?: string): Promise<LawDoc> {
  const sha = await sha256Hex(bytes);
  const data = JSON.parse(new TextDecoder('utf-8').decode(bytes));
  if (!data.deNormaHtml) throw new Error('JSON do e-SAJ sem o campo deNormaHtml');
  const all = htmlToBlocks(data.deNormaHtml);
  const iOrig = all.findIndex((b) => /^Original$/i.test(b.t));
  const iComp = all.findIndex((b) => /^Compilada$/i.test(b.t));
  const atual = all.find((b) => /^At\.\s*\d{2}\/\d{2}\/\d{4}$/.test(b.t))?.t.replace(/^At\.\s*/, '');
  const compiled = iComp >= 0 && iOrig > iComp ? all.slice(iComp + 1, iOrig) : all;
  const pub = data.fontes?.[0]?.dtPublicacaoFmt;
  const versionLabel = `${data.sgLegislacao || src.short}${iComp >= 0 ? ' — texto compilado' : ''}${atual ? `, atualizado em ${atual}` : ''}${pub ? ` (publicação original: DJE ${pub})` : ''}`;
  const doc = parseLaw(startAtFirstArticle(compiled), { lawId: src.id, title: src.title, short: src.short, provenance: prov(src, sha, versionLabel, method, retrievedAt) });
  if (iOrig >= 0) {
    const original = parseLaw(startAtFirstArticle(all.slice(iOrig + 1)), { lawId: src.id, title: src.title, short: src.short, provenance: doc.provenance });
    doc.versions = [{ label: `Texto original${pub ? ` (DJE ${pub})` : ''}`, articles: original.articles }];
  }
  return doc;
}

export interface PdfLines { bodySize: number; pages: number; blocks: (Block & { gap?: number; center?: boolean })[] }

export function importPdfLines(src: SourceDef, lines: PdfLines, sha: string, versionLabel: string, retrievedAt?: string): LawDoc {
  const joined = joinPdfLines(lines.blocks);
  return parseLaw(startAtFirstArticle(joined, /^Art\.\s*1\s*º\s+\S/), { lawId: src.id, title: src.title, short: src.short, pdf: true, tailStart: /^\uFFFF$/, provenance: prov(src, sha, versionLabel, 'automatico', retrievedAt) });
}

/** Linha extraída por scripts/extract_layout_pdf.py (texto do poppler + tachado detectado). */
export interface LayoutLine { t: string; pg: number; gap: number; indent?: boolean | null; struck?: boolean | null }

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX'];

/** Junta linhas em parágrafos sem nunca misturar texto tachado (redação anterior) com o vigente. */
export function joinLayoutLines(input: LayoutLine[]): Block[] {
  // rótulo solto e vigente ("I -", "§ 2º") seguido de texto tachado: a fonte riscou só o texto.
  // Vira: [rótulo + texto tachado] (redação anterior) e [rótulo + texto vigente que vier a seguir].
  const lines: LayoutLine[] = [];
  const BARE = /^(?:[IVXLC]+\s*[-–]|[a-z]\)|§\s*\d+\s*[º°]?|Par[áa]grafo [úu]nico\.?|Art\.\s*\d+\s*[º°]?(?:-[A-Z])?\.?)$/;
  for (let i = 0; i < input.length; i++) {
    const l = input[i];
    if (!l.struck && BARE.test(l.t.trim()) && input[i + 1]?.struck) {
      let j = i + 1;
      while (j < input.length && input[j].struck) j++;
      lines.push({ ...input[i + 1], t: `${l.t.trim()} ${input[i + 1].t}`, gap: l.gap, pg: l.pg });
      for (let k = i + 2; k < j; k++) lines.push(input[k]);
      const nxt = input[j];
      if (nxt && !nxt.struck && !isStart(nxt.t.trim())) { lines.push({ ...nxt, t: `${l.t.trim()} ${nxt.t}`, gap: 99 }); i = j; }
      else { lines.push({ ...l, gap: 99 }); i = j - 1; }
      continue;
    }
    lines.push(l);
  }
  const small = lines.map((l) => l.gap).filter((g) => g > 0 && g < 40).sort((a, b) => a - b);
  const median = small.length ? small[Math.floor(small.length / 2)] : 1;
  const threshold = median + 4;
  // espaçamento informativo (página do TSE): parágrafos separados por espaço maior
  // (Word/LibreOffice do TJMS têm espaçamento uniforme ~0,5 pt; a página do TSE, 3,5 pt na linha e 9,5 pt entre parágrafos)
  // o espaçamento só decide quando quase toda linha que começa dispositivo (após fim de frase) vem com espaço maior
  let starts = 0, spaced = 0;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i], p = lines[i - 1];
    if (l.pg !== p.pg || l.struck !== p.struck || !isStart(l.t.trim()) || !/[.;:]$/.test(p.t.trim())) continue;
    starts++; if (l.gap > threshold) spaced++;
  }
  const informative = starts >= 5 && spaced / starts >= 0.85;
  const out: Block[] = [];
  let prevLine: LayoutLine | null = null;
  for (const l of lines) {
    const t = l.t.trim();
    if (!t) continue;
    const prev = out[out.length - 1];
    const struck = !!l.struck;
    const prevTerminal = !!prev && (/[.;:!?)\]”"]$/.test(prev.t) || /;\s*(?:e|ou)$/.test(prev.t));
    const pageTop = !!prevLine && prevLine.pg !== l.pg;
    let startsNew: boolean;
    if (!prev || !!prev.struck !== struck || l.gap === 99) startsNew = true;
    else if (pageTop) {
      const prevIsHead = !!headMatch(prev.t) || (out.length >= 2 && !!headMatch(out[out.length - 2].t) && prev.t.length < 160);
      startsNew = isStart(t) && (prevTerminal || !!headMatch(t) || prevIsHead);
    }
    else if (informative) startsNew = l.gap > threshold;
    else startsNew = l.gap > threshold || (isStart(t) && (prevTerminal || !!headMatch(t) || !!headMatch(prev.t)));
    if (startsNew) out.push({ t, pg: l.pg, struck: struck || undefined });
    else prev.t = /[A-Za-zÀ-ú]-$/.test(prev.t) && /^[a-zà-ú]/.test(t) && !/\s-$/.test(prev.t) ? prev.t + t : `${prev.t} ${t}`;
    prevLine = l;
  }
  // a página do TSE deixa espaços de links antes de pontuação e dentro de parênteses (só espaço; nenhum caractere muda)
  for (const b of out) b.t = b.t.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+([,.;:])(?=\s|$)/g, '$1');
  // incisos colados na mesma linha pela própria fonte ("...; III - aos juízos ...")
  const split: Block[] = [];
  for (const b of out) {
    let cur = b;
    for (;;) {
      const m = cur.t.match(/^([IVXL]+)\s+[-–]\s/);
      const next = m ? ROMAN[ROMAN.indexOf(m[1]) + 1] : undefined;
      const idx = next ? cur.t.search(new RegExp(`;\\s+(?:e\\s+)?${next}\\s+[-–]\\s+(?=\\p{Ll})`, 'u')) : -1;
      if (idx < 0) break;
      const cut = cur.t.indexOf(next!, idx);
      split.push({ ...cur, t: cur.t.slice(0, cut).trim() });
      cur = { ...cur, t: cur.t.slice(cut).trim() };
    }
    split.push(cur);
  }
  return split;
}

/** PDF salvo da página oficial (TSE compilada, TJMS): começa no primeiro "Art. 1º", vigente ou tachado. */
export function importLayoutPdf(src: SourceDef, lines: LayoutLine[], sha: string, versionLabel: string, retrievedAt?: string): LawDoc {
  const blocks = joinLayoutLines(lines);
  let i = blocks.findIndex((b) => /^Art\.?\s*1\s*[º°o]?\s*[-–.]?\s+\S/.test(b.t));
  if (i < 0) i = 0;
  let k = 0;
  while (i > 0 && k < 6) { const c = classify(blocks[i - 1].t); if (c.kind === 'head' || (blocks[i - 1].t.length < 90 && !/[.;:,]$/.test(blocks[i - 1].t) && c.kind === 'none' && /^[A-ZÀ-Ú\s]+$/.test(blocks[i - 1].t))) { i--; k++; } else break; }
  return parseLaw(blocks.slice(i), { lawId: src.id, title: src.title, short: src.short, tailStart: /^(Bras[íi]lia,|Campo Grande,|Desembargador [A-ZÀ-Ú]{3,}|MINISTR[OA] [A-ZÀ-Ú]|Este texto n[ãa]o substitui|DJMS n\.?º)/, provenance: prov(src, sha, versionLabel, 'manual', retrievedAt) });
}

/** Linha com coordenada x (para anexos em formato de manual, com recuo de primeira linha). */
export interface LayoutLineX extends LayoutLine { x: number }

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(–-])([a-zà-ú])/g, (_m, a: string, b: string) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E|Em|Ao|Aos|À|Às)\b/g, (w) => w.toLowerCase());

/**
 * Anexo em formato de manual (ex.: Manual de Atribuições da Portaria TJMS 2.100/2021):
 * TÍTULO / CAPÍTULO / unidades numeradas ("3.1. ASSESSORIA ...") com finalidade e atribuições em romanos.
 * Cada unidade vira um "artigo" com rótulo "Anexo, <capítulo>, <número>"; texto copiado sem alteração.
 */
export function parseManualAnexo(lawId: string, lines: LayoutLineX[], minIndent = 100): { headings: Heading[]; articles: Article[]; sourceChars: number; outChars: number; warnings: string[] } {
  // 1) parágrafos: começa novo quando a linha tem recuo de primeira linha
  const paras: { t: string; pg: number }[] = [];
  for (const l of lines) {
    const t = l.t.trim(); if (!t) continue;
    const prev = paras[paras.length - 1];
    if (!prev || l.x >= minIndent || /^(TÍTULO|CAPÍTULO)\s+[IVXLC]+$/.test(prev.t) || /^(TÍTULO|CAPÍTULO)\s+[IVXLC]+$/.test(t)) paras.push({ t, pg: l.pg });
    else prev.t = /[A-Za-zÀ-ú]-$/.test(prev.t) && /^[a-zà-ú]/.test(t) && !/\s-$/.test(prev.t) ? prev.t + t : `${prev.t} ${t}`;
  }
  const alnum = (s: string) => (s.match(/[\p{L}\p{N}]/gu) || []).length;
  const sourceChars = paras.reduce((s, p) => s + alnum(p.t), 0);
  const headings: Heading[] = [{ id: `${lawId}.h-anx`, kind: 'parte', label: 'ANEXO', num: 'ANEXO', title: 'Manual de Atribuições da Secretaria do Tribunal de Justiça do Estado de Mato Grosso do Sul' }];
  const articles: Article[] = [];
  const warnings: string[] = [];
  let tit: Heading | null = null, cap: Heading | null = null, capIdx = 0, art: Article | null = null, nInc = 0, nTxt = 0, order = 0;
  const NUM = /^(\d+(?:\.\d+)*)\.\s+(.+)$/;
  const ROM = /^([IVXLC]+)\s*[.\-–]\s+(.+)$/;
  const NOTE_ONLY = /^\((?:Item|Subitem|Itens|Subitens|alterad|acrescentad|revogad|inclu[íi]d|Reda[çc])/i;
  for (let i = 0; i < paras.length; i++) {
    const t = paras[i].t;
    const mh = t.match(/^(TÍTULO|CAPÍTULO)\s+([IVXLC]+)$/);
    if (mh) {
      // nome do título/capítulo: parágrafos seguintes em maiúsculas
      const names: string[] = [];
      while (i + 1 < paras.length && !NUM.test(paras[i + 1].t) && !/^(TÍTULO|CAPÍTULO)\s/.test(paras[i + 1].t) && paras[i + 1].t === paras[i + 1].t.toUpperCase()) names.push(paras[++i].t);
      const h: Heading = mh[1] === 'TÍTULO'
        ? { id: `${lawId}.h-anx-t${mh[2]}`, kind: 'titulo', label: t, num: mh[2], title: names.join(' '), parent: headings[0].id }
        : { id: `${lawId}.h-anx-t${tit?.num ?? 'I'}-c${mh[2]}`, kind: 'capitulo', label: t, num: mh[2], title: names.join(' '), parent: tit?.id ?? headings[0].id };
      headings.push(h);
      if (mh[1] === 'TÍTULO') { tit = h; cap = null; } else { cap = h; capIdx++; }
      art = null; continue;
    }
    const mn = t.match(NUM);
    if (mn && cap && (/^[A-ZÀ-Ú0-9“"]/.test(mn[2]) || /^revogad/i.test(mn[2]))) {
      const num = mn[1];
      const { text, notes } = splitNotes(mn[2]);
      const rev = /^revogad/i.test(mn[2]);
      const id = `${lawId}.anx${capIdx}-${num}`;
      art = { id, n: `anx${capIdx}-${num}`, sort: 100000 + ++order, lab: `Anexo, ${titleCase(cap.title)}, ${num}`, h: cap.id, rub: rev ? undefined : text, units: [{ id: `${id}.cpt`, k: 'caput', lab: '', t: '', notes: rev ? [mn[2]] : notes.length ? notes : undefined, rev: rev || undefined }], rev: rev || undefined };
      articles.push(art); nInc = 0; nTxt = 0; continue;
    }
    if (!art) { warnings.push(`Anexo: parágrafo fora de unidade: ${t.slice(0, 80)}`); continue; }
    const cpt = art.units[0];
    if (NOTE_ONLY.test(t) && /\)\.?$/.test(t)) { (cpt.notes ||= []).push(t.replace(/^\(\s*|\s*\)\.?$/g, '')); continue; }
    const mr = t.match(ROM);
    const { text, notes } = splitNotes(mr ? mr[2] : t);
    if (mr) {
      nInc++;
      const rv = /^revogad/i.test(mr[2]);
      art.units.push({ id: `${art.id}.i${nInc}`, k: 'inc', lab: mr[1], t: rv ? '' : text, parent: cpt.id, notes: rv ? [mr[2].replace(/[.;]$/, '')] : notes.length ? notes : undefined, rev: rv || undefined });
    } else if (!cpt.t && !nInc && !nTxt) { cpt.t = text; if (notes.length) cpt.notes = [...(cpt.notes || []), ...notes]; }
    else { nTxt++; art.units.push({ id: `${art.id}.t${nTxt}`, k: 'txt', lab: '', t: text, parent: cpt.id, notes: notes.length ? notes : undefined }); }
  }
  const outChars = articles.reduce((s, a) => s + alnum(a.lab.replace(/^Anexo, [^,]+, /, '')) * 0 + a.units.reduce((u, x) => u + alnum(x.lab) + alnum(x.t) + (x.notes || []).reduce((q, n) => q + alnum(n), 0), 0) + alnum(a.rev ? '' : a.rub ?? ''), 0)
    + articles.reduce((s, a) => s + alnum(a.n.replace(/^anx\d+-/, '')), 0)
    + headings.slice(1).reduce((s, h) => s + alnum(h.label) + alnum(h.title), 0);
  return { headings, articles, sourceChars, outChars, warnings };
}
