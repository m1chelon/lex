// Parser estrutural de legislação brasileira.
// Entrada: blocos (linhas lógicas) vindos de HTML ou PDF. Saída: LawDoc.
// Princípio: o texto oficial nunca é reescrito — apenas segmentado. Rótulos
// (Art., §, incisos), notas de alteração e rubricas são separados em campos
// próprios e tudo é contabilizado na checagem de cobertura.
import type { Article, Block, Heading, HeadingKind, LawDoc, Provenance, Unit, UnitKind } from './types';
import { ordinalKey, romanToInt } from './roman';

export const PARSER_VERSION = '1.0.0';

const ROMAN = '(?=[MDCLXVI])M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})';
const RE_ART = /^(?:Art(?:igo)?|ARTIGO|ART)\s*\.?\s*(\d{1,2}(?:\.\d{3})|\d{1,4})\s*(?:[º°ªo](?![a-zà-ú]))?\s*(?:\s?[-–]([A-Z](?:[-–][A-Z])?)(?![\wà-úÀ-Ú])|\s?[-–]\s([A-Z])(?=\s*[.:])|\s?([A-Z])(?=\.\s))?\s*(?:[.\-–—:]+\s*)?/;
const RE_ARTS_RANGE = /^Arts?\.\s*(\d{1,2}(?:\.\d{3})|\d{1,4})\s*[º°]?\s*(?:a|e|até)\s*(\d{1,2}(?:\.\d{3})|\d{1,4})\s*[º°]?\s*[.\-–—:]?\s*/;
const RE_ART_BARE = /^(\d{1,2}(?:\.\d{3})|\d{1,4})\s*[-–]\s*([A-Z])\.\s+(?=[A-ZÀ-Ú])/;
const RE_PAR = /^§\s*(\d{1,3})\s*[º°o]?(?:\s?[-–]([A-Z])(?![\wà-úÀ-Ú]))?\s*(?:[.\-–—:]+\s*)?/;
const RE_PU = /^Par[áa]grafo\s+[úu]nico\s*(?:[.\-–—:]+\s*)?/i;
const RE_INC = new RegExp(`^(${ROMAN})(?:-([A-Z]))?\\s*[-–—.]\\s*(?=\\S)`);
const RE_ALI = /^([a-z])(?:-([A-Z]))?\)\s*/;
const RE_ITEM = /^(\d{1,2})(?:[.)]|\s+[-–])\s+(?=\S)/;
const RE_PENA = /^Pena\s*[-–—:]\s*/;
const RE_HEAD = new RegExp(`^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SUBSE[ÇC][ÃA]O|SE[ÇC][ÃA]O)\\s+(${ROMAN}|[ÚU]NIC[OA]|\\d{1,2}|ESPECIAL|GERAL)(?:-([A-Z]))?(?![\\wÀ-ú])\\s*[-–—.:]?\\s*(.*)$`, 'i');

const NOTE_WORDS = 'Nome jur[íi]dico|Primitiv[oa]s?|Artigos?|Caput|Pena|Inciso|Al[íi]nea|Item|Preâmbulo|Anexo|Ementa|Express[ãa]o|Denomina[çc][ãa]o|Par[áa]grafo [úu]nico|Dispositivo|Cap[íi]tulo|Se[çc][ãa]o|T[íi]tulo|Reda[çc][ãa]o dada|Reda[çc][ãa]o alterada|Inclu[íi]d[oa]|Acrescentad[oa]|Acrescid[oa]|Acr[ée]scimo|Revogad[oa]|Vide|Vig[êe]ncia|Renumerad[oa]|Alterad[oa]|Suprimid[oa]|Revigorad[oa]|Regulamento|Regulamentad[oa]|Produ[çc][ãa]o de efeito|Mantid[oa]|Restabelecid[oa]|Transformad[oa]|Convertid[oa]|Efic[áa]cia|Execu[çc][ãa]o suspensa|Retificad[oa]|Express[ãa]o|NR|Promulga[çc][ãa]o|Declarad[oa]|Ver |Nova reda[çc][ãa]o|Com reda[çc][ãa]o|Artigo inclu[íi]do|Par[áa]grafo|Inciso|Al[íi]nea|Texto';
const RE_NOTE_INLINE = new RegExp(`\\s*\\((?:\\s|\\*|[“”"'‘’])*(?:${NOTE_WORDS})s?[“”"'‘’]?\\b(?:[^()]|\\([^()]*\\))*\\)`, 'gi');

const HEAD_RANK: Record<HeadingKind, number> = { parte: 0, livro: 1, titulo: 2, capitulo: 3, secao: 4, subsecao: 5 };

export interface ParseOptions {
  lawId: string;
  title: string;
  short: string;
  provenance: Provenance;
  pdf?: boolean; // linhas quebradas de PDF -> juntar
  startAt?: RegExp; // primeiro bloco do texto normativo
  endAt?: RegExp; // primeiro bloco após o texto normativo (exclusivo)
  tailStart?: RegExp;
  noteLine?: (b: Block) => boolean; // bloco inteiro é nota
}

const alnum = (s: string) => (s.match(/[\p{L}\p{N}]/gu) || []).length;

function headKind(w: string): HeadingKind {
  const u = w.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (u.startsWith('PARTE')) return 'parte';
  if (u.startsWith('LIVRO')) return 'livro';
  if (u.startsWith('TITULO')) return 'titulo';
  if (u.startsWith('CAPITULO')) return 'capitulo';
  if (u.startsWith('SUBSE')) return 'subsecao';
  return 'secao';
}

/** Título estrutural válido: "CAPÍTULO III DOS OFÍCIOS…" sim; "Capítulo III destas Normas…" (remissão quebrada) não. */
export function headMatch(t: string): RegExpMatchArray | null {
  const m = t.match(RE_HEAD);
  if (!m) return null;
  const rest = m[4].replace(/^[-–—.:]\s*/, '');
  if (rest && !/^[A-ZÀ-Ú"“(]/.test(rest)) return null;
  if (/\.{5,}/.test(t)) return null; // linha de sumário
  return m;
}

export function isStart(t: string): boolean {
  return RE_ART.test(t) || RE_ART_BARE.test(t) || RE_PAR.test(t) || RE_PU.test(t) || RE_INC.test(t) || RE_ALI.test(t) || RE_PENA.test(t) || !!headMatch(t);
}

const RE_NOTE_PARAG = /\s*\(\s*(?:§\s*\d+[^()]*?|Art\.\s*\d+[º°]?(?:-[A-Z])?\s+)(?:renumerad|acrescid|acrescentad|alterad|inclu[íi]d|revogad|reda[çc][ãa]o)[^()]*\)/gi;
const RE_NOTE_UNCLOSED = new RegExp(`\\s*\\((?:\\s|\\*)*(?:Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Acrescid[oa]|Acrescentad[oa]|Revogad[oa]|Renumerad[oa])[^()]*$`, 'i');

/** Extrai notas de alteração entre parênteses ("(Redação dada pela Lei nº ...)"). */
export function splitNotes(t: string): { text: string; notes: string[] } {
  const notes: string[] = [];
  // só é nota se falar de alteração/vigência; "(artigo 57-B, § 3º, da Lei ...)" ou "("Título Net" ...)" é texto legal
  const ALTER = /reda[çc][ãa]o|inclu[íi]d|acrescid|acrescentad|acr[ée]scimo|revogad|\bvide\b|vig[êe]ncia|renumerad|alterad|suprimid|revigorad|regulament|efeito|mantid|restabelecid|transformad|convertid|efic[áa]cia|suspens|retificad|vetad|nome jur|primitiv|ementa|express[ãa]o|denomina[çc]|^\s*\(\s*NR\s*\)\s*$|inconstitucional|\b(?:ADI|ADIN|ADIn|ADC|ADPF)\b|^\s*\(\s*ver\b|republicad|declarad|vigor|adotad/i;
  const take = (m: string) => { if (!ALTER.test(m)) return m; notes.push(m.trim().replace(/^\(\s*\**\s*|\s*\)$/g, '')); return ' '; };
  let text = t.replace(RE_NOTE_INLINE, take).replace(RE_NOTE_PARAG, take);
  // nota com parêntese não fechado na própria fonte (ex.: PDF do Regimento Interno)
  text = text.replace(RE_NOTE_UNCLOSED, (m) => { notes.push(m.trim().replace(/^\(\s*/, '')); return ''; });
  text = text.replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  return { text, notes };
}

export function artSort(n: string): number {
  const k = ordinalKey(n);
  return Number.isNaN(k) ? 0 : k;
}

export function normArtNum(num: string, suf?: string): string {
  return num.replace(/\./g, '') + (suf ? `-${suf.toUpperCase().replace(/[-–]/g, '-')}` : '');
}

interface LineInfo { kind: UnitKind | 'art' | 'head' | 'none'; lab: string; key: string; rest: string; num?: string; suf?: string; headKind?: HeadingKind; bare?: boolean }

export function classify(t: string): LineInfo {
  let m: RegExpMatchArray | null;
  if ((m = headMatch(t))) {
    return { kind: 'head', lab: t.slice(0, t.length - m[4].length).trim().replace(/[-–—.:]\s*$/, '').trim(), key: '', rest: m[4].replace(/^[-–—.:]\s*/, ''), num: m[2].toUpperCase() + (m[3] ? `-${m[3].toUpperCase()}` : ''), headKind: headKind(m[1]) };
  }
  if ((m = t.match(RE_ART))) {
    const num = normArtNum(m[1], m[2] || m[3] || m[4]);
    return { kind: 'art', lab: m[0].trim().replace(/[.\-–—:]+$/, '').trim(), key: num, rest: t.slice(m[0].length), num };
  }
  if ((m = t.match(RE_ART_BARE))) {
    const num = normArtNum(m[1], m[2]);
    return { kind: 'art', lab: m[0].trim().replace(/[.\-–—:]+$/, '').trim(), key: num, rest: t.slice(m[0].length), num, bare: true };
  }
  if ((m = t.match(RE_PAR))) return { kind: 'par', lab: m[0].trim().replace(/[.\-–—:]+$/, '').trim(), key: `p${m[1]}${m[2] ? '-' + m[2] : ''}`, rest: t.slice(m[0].length) };
  if ((m = t.match(RE_PU))) return { kind: 'par', lab: 'Parágrafo único', key: 'pu', rest: t.slice(m[0].length) };
  if ((m = t.match(RE_PENA))) return { kind: 'pena', lab: 'Pena', key: 'pena', rest: t.slice(m[0].length) };
  if ((m = t.match(RE_INC))) return { kind: 'inc', lab: m[1] + (m[2] ? `-${m[2]}` : ''), key: `i${romanToInt(m[1])}${m[2] ? '-' + m[2] : ''}`, rest: t.slice(m[0].length) };
  if ((m = t.match(RE_ALI))) return { kind: 'ali', lab: `${m[1]}${m[2] ? '-' + m[2] : ''})`, key: m[1] + (m[2] ? '-' + m[2] : ''), rest: t.slice(m[0].length) };
  if ((m = t.match(RE_ITEM))) return { kind: 'item', lab: `${m[1]}.`, key: `n${m[1]}`, rest: t.slice(m[0].length) };
  return { kind: 'none', lab: '', key: '', rest: t };
}

const isRevokedText = (t: string) => /^\(?\s*vetad[oa]s?\b/i.test(t.trim()) || /^\(?\s*revogad[oa]s?\b[^)]*\)?\s*[.;]?$/i.test(t.trim()) || /^\(?\s*revogad[oa]s?\s*\)?[.;]?$/i.test(t.trim());

/** Junta linhas de PDF em blocos lógicos. */
export function joinPdfLines(lines: (Block & { gap?: number; center?: boolean })[]): Block[] {
  const gaps = lines.map((l) => l.gap ?? 0).filter((g) => g > 0).sort((a, b) => a - b);
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 2;
  const threshold = Math.max(median * 3, 6);
  const out: (Block & { center?: boolean })[] = [];
  for (const l of lines) {
    const t = l.t.trim();
    if (!t) continue;
    if (/^\d{1,3}$/.test(t)) continue; // número de página isolado
    const prev = out[out.length - 1];
    const bigGap = (l.gap ?? 0) > threshold;
    const prevTerminal = !!prev && (/\((?:Reda[çc][ãa]o|Inclu[íi]d|Acrescid|Acrescentad|Revogad|Renumerad)[^()]*$/i.test(prev.t) ||/[.;:!?)\]”"]$/.test(prev.t) || /;\s*(?:e|ou)$/.test(prev.t) || /[—–-]$/.test(prev.t));
    const pageTop = !!prev && prev.pg !== l.pg && (l.gap ?? 0) === 0;
    const startsNew = !prev || bigGap || !!l.center || !!prev.center || (isStart(t) && (prevTerminal || !!headMatch(t) || !!headMatch(prev.t) || (pageTop && RE_ART.test(t))));
    if (startsNew) {
      out.push({ t, fn: l.fn?.length ? [...l.fn] : undefined, pg: l.pg, center: l.center, brk: bigGap || undefined });
    } else {
      // hifenização no fim da linha: mantém o hífen (pode ser palavra composta) — só junta sem espaço se terminar com "-" e a próxima começar minúscula
      prev.t = /[A-Za-zÀ-ú]-$/.test(prev.t) && /^[a-zà-ú]/.test(t) && !/\s-$/.test(prev.t) ? prev.t + t : `${prev.t} ${t}`;
      if (l.fn?.length) prev.fn = [...(prev.fn || []), ...l.fn];
    }
  }
  return out.map(({ center, ...b }) => b);
}

export function parseLaw(input: Block[], opt: ParseOptions): LawDoc {
  const warnings: string[] = [];
  let blocks = opt.pdf ? input : input.map((b) => ({ ...b, t: b.t.replace(/\s+/g, ' ').trim() })).filter((b) => b.t);
  // recorte início/fim
  if (opt.startAt) {
    const i = blocks.findIndex((b) => opt.startAt!.test(b.t));
    if (i < 0) warnings.push(`Marcador de início não encontrado: ${opt.startAt}`);
    else blocks = blocks.slice(i);
  }
  if (opt.endAt) {
    const i = blocks.findIndex((b, idx) => idx > 0 && opt.endAt!.test(b.t));
    if (i > 0) blocks = blocks.slice(0, i);
  }
  const sourceChars = blocks.reduce((s, b) => s + alnum(b.t) + (b.fn || []).reduce((a, f) => a + alnum(f), 0), 0);

  const tailRe = opt.tailStart ?? /^(Bras[íi]lia,|Rio de Janeiro,|Pal[áa]cio dos Bandeirantes|S[ãa]o Paulo, \d|Registre-se|Este texto n[ãa]o substitui|Assembleia Legislativa do Estado de S[ãa]o Paulo, aos)/i;
  const noteLine = opt.noteLine ?? ((b: Block) => (!!b.em && /^[-–]\s/.test(b.t)) || /^\*\s*\S/.test(b.t) || /^\((?:\s|\*)*(?:Reda[çc][ãa]o dada|Inclu[íi]d|Acrescentad|Acrescid|Revogad|Vide|Renumerad|Alterad|Vig[êe]ncia|Regulamento|Express[ãa]o|Retificad)[^]*\)\.?$/i.test(b.t));

  const headings: Heading[] = [];
  const articles: Article[] = [];
  const preamble: string[] = [];
  const tail: string[] = [];
  const unplaced: string[] = []; // texto riscado fora de qualquer artigo (ex.: títulos antigos)
  const rangeClones = new Set<string>(); // artigos 2..n de "Arts. X a Y (Revogados)": mesma linha da fonte
  const headStack: Heading[] = [];
  let art: Article | null = null;
  let lastUnit: Unit | null = null;
  let lastPar: Unit | null = null, lastInc: Unit | null = null, lastAli: Unit | null = null;
  let pendingRub: string | null = null;
  const pendingRubNotes: string[] = []; // notas da rubrica (ex.: "Nome jurídico acrescido pela Lei ...")
  let pendingTitleFor: Heading | null = null;
  let inTail = false;
  let segment = '';
  let lastSort = -1;
  let outChars = 0;
  // pista de texto riscado (redações anteriores)
  type Old = { artNum: string; key: string; lab: string; t: string; notes: string[]; kind: UnitKind | 'art' };
  let struckArt: string | null = null;
  let olds: Old[] = [];
  const usedIds = new Set<string>();

  const uid = (base: string) => {
    let id = base, k = 2;
    while (usedIds.has(id)) id = `${base}_${k++}`;
    if (id !== base) warnings.push(`Identificador duplicado ${base} (rótulo repetido na fonte) — mantido como ${id}`);
    usedIds.add(id);
    return id;
  };
  const curHeadingId = () => headStack[headStack.length - 1]?.id;

  const attachOlds = (a: Article) => {
    const mine = olds.filter((o) => o.artNum === a.n);
    olds = olds.filter((o) => o.artNum !== a.n);
    for (const o of mine) {
      const target = o.kind === 'art' ? a.units.find((u) => u.k === 'caput') : [...a.units].reverse().find((u) => u.id.endsWith('.' + o.key) || (u.lab === o.lab && u.k === o.kind));
      if (target) (target.old ||= []).push({ lab: o.lab || undefined, t: o.t, notes: o.notes.length ? o.notes : undefined });
      else a.units.push({ id: uid(`${a.id}.${o.kind === 'art' ? 'cpt' : o.key}~old`), k: o.kind === 'art' ? 'caput' : o.kind, lab: o.lab, t: '', rev: true, old: [{ t: o.t, notes: o.notes.length ? o.notes : undefined }] });
    }
  };

  const closeArticle = () => {
    if (!art) return;
    attachOlds(art);
    const real = art.units.filter((u) => !(u.t === '' && u.old));
    if (real.length && real.every((u) => u.rev || u.t === '')) art.rev = true;
    articles.push(art);
    art = null;
    lastUnit = lastPar = lastInc = lastAli = null;
  };

  const addNote = (note: string) => {
    outChars += alnum(note);
    if (lastUnit) (lastUnit.notes ||= []).push(note);
    else if (art && art.units.length) (art.units[0].notes ||= []).push(note);
    else if (headStack.length) preamble.push(note);
    else preamble.push(note);
  };

  let fnAttached = false;
  const orphanFn = (fns: string[]) => {
    // nota de rodapé de título, rubrica ou nota de alteração: vai para o dispositivo/título mais próximo
    if (lastUnit) (lastUnit.fn ||= []).push(...fns);
    else if (headings.length) (headings[headings.length - 1].fn ||= []).push(...fns);
    else preamble.push(...fns);
  };
  const step = (bi: number): void => {
    const b = blocks[bi];
    let t = b.t;
    if (opt.pdf) t = t.replace(/\s+([,.;:])/g, '$1');

    // --- notas de rodapé (PDF) ---
    const fns = b.fn && b.fn.length ? b.fn : undefined;
    if (fns) outChars += fns.reduce((a, f) => a + alnum(f), 0);

    // --- texto riscado: redação anterior ---
    if (b.struck) {
      outChars += alnum(t);
      const info = classify(t);
      const { text, notes } = splitNotes(info.rest);
      if (info.kind === 'art') { struckArt = info.num!; olds.push({ artNum: struckArt, key: 'cpt', lab: info.lab, t: text, notes, kind: 'art' }); }
      else {
        const artNum = struckArt ?? art?.n ?? '?';
        olds.push({ artNum, key: info.kind === 'none' ? 'txt' : info.key, lab: info.lab, t: text, notes, kind: info.kind === 'none' || info.kind === 'head' ? 'txt' : info.kind });
      }
      return;
    }

    if (inTail) { tail.push(t); outChars += alnum(t); return; }
    if (art && tailRe.test(t)) { closeArticle(); inTail = true; tail.push(t); outChars += alnum(t); return; }

    // --- nota de alteração em linha própria ---
    if (noteLine(b)) { addNote(t.replace(/^[-–*]\s*/, '').replace(/^\(\s*|\s*\)\.?$/g, '')); return; }

    // intervalo revogado em uma linha: "Arts. 632 a 636. (Revogados pela Lei nº ...)"
    const rg = t.match(RE_ARTS_RANGE);
    if (rg && !b.struck && /revogad|vetad/i.test(t.slice(rg[0].length))) {
      const lo = parseInt(rg[1].replace(/\./g, ''), 10), hi = parseInt(rg[2].replace(/\./g, ''), 10);
      if (hi > lo && hi - lo < 200) {
        closeArticle();
        const { text, notes } = splitNotes(t.slice(rg[0].length));
        const lab = rg[0].trim().replace(/[.\-–—:]+$/, '').trim();
        for (let n = lo; n <= hi; n++) {
          const id = uid(`${opt.lawId}.${segment ? segment + '-' : ''}${n}`);
          if (n > lo) rangeClones.add(id);
          const a: Article = { id, n: (segment ? segment + '-' : '') + String(n), sort: n, lab, h: curHeadingId(), units: [{ id: uid(`${id}.cpt`), k: 'caput', lab, t: text, notes: notes.length ? notes : undefined, rev: true }], rev: true };
          articles.push(a);
        }
        lastSort = hi;
        outChars += alnum(lab) + alnum(text) + notes.reduce((x, n) => x + alnum(n), 0);
        if (pendingRub) { tail.unshift(pendingRub); pendingRub = null; }
        return;
      }
    }

    const info = classify(t);

    // título de heading pendente
    if (pendingTitleFor && info.kind === 'none' && t.length < 220) {
      pendingTitleFor.title = pendingTitleFor.title ? `${pendingTitleFor.title} ${t}` : t;
      outChars += alnum(t);
      // títulos em duas linhas (ex.: "DOS CRIMES..." + continuação) só para headings de HTML <h>
      if (!(b.heading && blocks[bi + 1]?.heading && classify(blocks[bi + 1].t).kind === 'none')) pendingTitleFor = null;
      return;
    }
    pendingTitleFor = null;

    if (info.kind === 'head') {
      if (art) closeArticle();
      const kind = info.headKind!;
      while (headStack.length && HEAD_RANK[headStack[headStack.length - 1].kind] >= HEAD_RANK[kind]) headStack.pop();
      const parent = headStack[headStack.length - 1];
      const h: Heading = { id: `${opt.lawId}.h${headings.length + 1}`, kind, label: info.lab, num: info.num!, title: info.rest.trim(), parent: parent?.id };
      headings.push(h);
      headStack.push(h);
      outChars += alnum(t);
      if (!h.title) pendingTitleFor = h;
      return;
    }

    if (info.kind === 'art' && info.bare && !(opt.pdf && art && Math.floor(artSort(info.num!)) === Math.floor(lastSort) && artSort(info.num!) > lastSort)) {
      info.kind = 'none'; info.rest = t; info.lab = '';
    }
    if (info.kind === 'art') {
      const num = info.num!;
      const sort = artSort(num);
      if (info.bare) warnings.push(`Art. ${num}: na fonte oficial o rótulo aparece sem "Art." ("${info.lab}") — mantido como na fonte.`);
      const cur = art as Article | null;
      const seen = articles.some((x) => x.n === num) || cur?.n === num;
      if (opt.pdf && art && sort <= lastSort && !(b.brk && !seen && /-[A-Z]$/.test(num))) {
        // falso início (ex.: remissão "Art. 5º" quebrada no começo da linha) -> continuação
        warnings.push(`Possível falso início de artigo tratado como continuação: "${t.slice(0, 60)}"`);
      } else {
        if (!opt.pdf && articles.length && sort <= lastSort && !cur?.n.startsWith(num)) {
          const h = headStack.map((x) => x.title + ' ' + x.label).join(' ').toUpperCase();
          segment = /TRANSIT/.test(h) ? (/CONSTITUC/.test(h) ? 'adct' : 'dt') : `s${articles.length}`;
          warnings.push(`Numeração reiniciada em "${t.slice(0, 40)}" — segmento "${segment}"`);
        }
        closeArticle();
        const { text, notes } = splitNotes(info.rest);
        const id = uid(`${opt.lawId}.${segment ? segment + '-' : ''}${num}`);
        art = { id, n: (segment ? segment + '-' : '') + num, sort, lab: info.lab, h: curHeadingId(), units: [], pg: b.pg };
        struckArt = null;
        if (pendingRub) { art.rub = pendingRub; pendingRub = null; }
        const caput: Unit = { id: uid(`${id}.cpt`), k: 'caput', lab: info.lab, t: text };
        if (notes.length) caput.notes = notes;
        if (pendingRubNotes.length) { (caput.notes ||= []).push(...pendingRubNotes.map((n) => `Rubrica: ${n}`)); pendingRubNotes.length = 0; }
        if (fns) { caput.fn = fns; fnAttached = true; }
        if (isRevokedText(text) || (!text && notes.some((n) => /revogad/i.test(n)))) caput.rev = true;
        art.units.push(caput);
        lastUnit = caput;
        if (opt.pdf && sort < lastSort) warnings.push(`Art. ${num} aparece fora da ordem numérica na fonte (após o art. ${articles[articles.length - 1]?.n}) — mantido na posição original.`);
        lastSort = opt.pdf ? Math.max(lastSort, sort) : sort;
        outChars += alnum(info.lab) + alnum(text) + notes.reduce((a, n) => a + alnum(n), 0);
        return;
      }
    }

    if (!art) {
      // fora de artigo: preâmbulo, rubrica antes do primeiro artigo
      const nextT = blocks[bi + 1]?.t || '';
      if (t.length <= 120 && !/[.;:,]$/.test(t) && RE_ART.test(nextT) && (articles.length > 0 || headings.length > 0)) pendingRub = pendingRub ? `${pendingRub} ${t}` : t;
      else preamble.push(t);
      outChars += alnum(t);
      return;
    }

    // rubrica (nomen iuris) antes de artigo ou parágrafo — notas ("Nome jurídico acrescido pela Lei...") são separadas
    const rubSplit = info.kind === 'none' ? splitNotes(t) : null;
    if (rubSplit && rubSplit.text.length <= 120 && !/[.;:,)]$/.test(rubSplit.text) && /^[A-ZÀ-Ú]/.test(rubSplit.text)) {
      let j = bi + 1;
      while (j < blocks.length && (blocks[j].struck || noteLine(blocks[j]))) j++;
      const nk = j < blocks.length ? classify(blocks[j].t).kind : 'none';
      if (nk === 'art' || nk === 'par' || nk === 'head') {
        if (pendingRub) warnings.push(`Rubrica em mais de uma linha unida: "${pendingRub.slice(0, 40)}" + "${rubSplit.text.slice(0, 40)}"`);
        pendingRub = pendingRub ? `${pendingRub} ${rubSplit.text}` : rubSplit.text; outChars += alnum(t);
        if (rubSplit.notes.length) pendingRubNotes.push(...rubSplit.notes);
        if (nk === 'art' || nk === 'head') closeArticle();
        return;
      }
    }

    const a: Article = art;
    let kind = info.kind as UnitKind | 'none';
    let rest = info.rest;
    let lab = info.lab;
    let key = info.key;
    // item numerado só faz sentido dentro de inciso/alínea
    if (kind === 'item' && !lastInc && !lastAli && !lastPar) { kind = 'none'; rest = t; lab = ''; }

    if (kind === 'none') {
      const { text, notes } = splitNotes(t);
      if (opt.pdf && lastUnit) {
        // em PDF, bloco sem rótulo após quebra de página/parágrafo: continuação de parágrafo próprio
      }
      const u: Unit = { id: uid(`${a.id}.t${a.units.length}`), k: 'txt', lab: '', t: text, parent: lastUnit?.id };
      if (notes.length) u.notes = notes;
      if (fns) { u.fn = fns; fnAttached = true; }
      a.units.push(u);
      outChars += alnum(text) + notes.reduce((x, n) => x + alnum(n), 0);
      return;
    }

    const { text, notes } = splitNotes(rest);
    let parent: Unit | null = null;
    if (kind === 'par') { lastInc = lastAli = null; }
    else if (kind === 'inc') { parent = lastPar; lastAli = null; }
    else if (kind === 'ali') { parent = lastInc ?? lastPar; }
    else if (kind === 'item') { parent = lastAli ?? lastInc ?? lastPar; }
    else if (kind === 'pena') { parent = lastPar; }
    const base = parent ? parent.id.replace(/_\d+$/, '') : a.id;
    const u: Unit = { id: uid(`${base}.${key}`), k: kind as UnitKind, lab, t: text };
    if (parent) u.parent = parent.id;
    if (notes.length) u.notes = notes;
    if (fns) { u.fn = fns; fnAttached = true; }
    if (pendingRub) { u.rub = pendingRub; pendingRub = null; if (pendingRubNotes.length) { (u.notes ||= []).push(...pendingRubNotes.map((n) => `Rubrica: ${n}`)); pendingRubNotes.length = 0; } }
    if (isRevokedText(text) || (!text && notes.some((n) => /revogad/i.test(n)))) u.rev = true;
    a.units.push(u);
    lastUnit = u;
    if (kind === 'par') lastPar = u;
    if (kind === 'inc') lastInc = u;
    if (kind === 'ali') lastAli = u;
    outChars += alnum(lab) + alnum(text) + notes.reduce((x, n) => x + alnum(n), 0);
    };
  for (let bi = 0; bi < blocks.length; bi++) {
    fnAttached = false;
    step(bi);
    const fb = blocks[bi].fn;
    if (fb && fb.length && !fnAttached && !blocks[bi].struck) orphanFn(fb);
  }
  closeArticle();
  if (olds.length) {
    const groups = new Map<string, Old[]>();
    for (const o of olds) groups.set(o.artNum, [...(groups.get(o.artNum) || []), o]);
    for (const [num, list] of groups) {
      const target = articles.find((x) => x.n === num);
      if (target) {
        for (const o of list) { const u = target.units.find((y) => y.lab === o.lab && y.k === o.kind) ?? target.units[0]; (u.old ||= []).push({ lab: o.lab || undefined, t: o.t, notes: o.notes.length ? o.notes : undefined }); }
        continue;
      }
      if (num === '?') { list.forEach((o) => unplaced.push(`${o.lab ? o.lab + ' ' : ''}${o.t}${o.notes.length ? ` (${o.notes.join('; ')})` : ''}`.trim())); continue; }
      const sort = artSort(num);
      let pos = articles.findIndex((x) => !/^[a-z]+\d*-/.test(x.n) && x.sort > sort);
      if (pos < 0) pos = articles.length;
      const head = list.find((o) => o.kind === 'art');
      const orphan: Article = { id: uid(`${opt.lawId}.${num}`), n: num, sort, lab: head?.lab || `Art. ${num}`, h: articles[pos - 1]?.h, units: [], noCurrent: true };
      art = orphan; attachOlds(orphan); art = null;
      articles.splice(pos, 0, orphan);
      warnings.push(`Art. ${num}: a fonte compilada apresenta apenas redação anterior (riscada) — sem redação vigente visível; conferir na fonte oficial.`);
    }
  }
  if (pendingRub) { tail.unshift(pendingRub); }

  // Recontagem sobre a estrutura final (cada trecho da fonte deve aparecer exatamente uma vez)
  {
    let c = 0;
    for (const h of headings) { c += alnum(h.label) + alnum(h.title); for (const f of h.fn || []) c += alnum(f); }
    for (const x of [...preamble, ...tail, ...unplaced]) c += alnum(x);
    for (const a of articles) {
      if (rangeClones.has(a.id)) continue;
      c += alnum(a.rub || '');
      for (const u of a.units) {
        c += alnum(u.lab) + alnum(u.t) + alnum(u.rub || '');
        for (const n of u.notes || []) c += alnum(n.replace(/^Rubrica: /, ''));
        for (const f of u.fn || []) c += alnum(f);
        for (const o of u.old || []) { c += alnum(o.lab || '') + alnum(o.t); for (const n of o.notes || []) c += alnum(n); }
      }
    }
    outChars = c;
  }
  const units = articles.reduce((s, x) => s + x.units.length, 0);
  const revoked = articles.filter((x) => x.rev).length;
  const diff = sourceChars - outChars;
  if (Math.abs(diff) > Math.max(20, sourceChars * 0.002)) warnings.push(`Cobertura: ${sourceChars} caracteres na fonte x ${outChars} na estrutura (diferença ${diff}).`);

  return {
    id: opt.lawId, title: opt.title, short: opt.short, provenance: opt.provenance,
    preamble, headings, articles, tail, unplaced: unplaced.length ? unplaced : undefined,
    stats: { sourceChars, outputChars: outChars, articles: articles.length, units, revoked, warnings },
  };
}
