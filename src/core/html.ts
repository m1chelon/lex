// Conversor HTML -> blocos (sem dependência de DOM: roda no Node e no navegador).
import type { Block } from './types';

const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordm: 'º', ordf: 'ª', deg: '°', sect: '§',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  middot: '·', copy: '©', reg: '®', shy: '', para: '¶', sup1: '¹', sup2: '²', sup3: '³', frac12: '½', bull: '•',
  aacute: 'á', Aacute: 'Á', agrave: 'à', Agrave: 'À', acirc: 'â', Acirc: 'Â', atilde: 'ã', Atilde: 'Ã', auml: 'ä', Auml: 'Ä',
  eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È', ecirc: 'ê', Ecirc: 'Ê', euml: 'ë', Euml: 'Ë',
  iacute: 'í', Iacute: 'Í', igrave: 'ì', Igrave: 'Ì', icirc: 'î', Icirc: 'Î', iuml: 'ï', Iuml: 'Ï',
  oacute: 'ó', Oacute: 'Ó', ograve: 'ò', Ograve: 'Ò', ocirc: 'ô', Ocirc: 'Ô', otilde: 'õ', Otilde: 'Õ', ouml: 'ö', Ouml: 'Ö',
  uacute: 'ú', Uacute: 'Ú', ugrave: 'ù', Ugrave: 'Ù', ucirc: 'û', Ucirc: 'Û', uuml: 'ü', Uuml: 'Ü',
  ccedil: 'ç', Ccedil: 'Ç', ntilde: 'ñ', Ntilde: 'Ñ', szlig: 'ß',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);?/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      // windows-1252 nos códigos 128-159 (comum em páginas antigas)
      const cp1252: Record<number, string> = { 128: '€', 130: '‚', 132: '„', 133: '…', 145: '‘', 146: '’', 147: '“', 148: '”', 150: '–', 151: '—', 149: '•' };
      if (cp1252[code]) return cp1252[code];
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return e in NAMED ? NAMED[e] : m;
  });
}

/** Decodifica bytes respeitando o charset declarado (Planalto costuma usar windows-1252). */
export function decodeHtmlBytes(bytes: Uint8Array): string {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 4096));
  const m = head.match(/charset\s*=\s*["']?([\w-]+)/i);
  let cs = (m?.[1] || 'utf-8').toLowerCase();
  if (cs === 'iso-8859-1' || cs === 'latin1') cs = 'windows-1252';
  try {
    const utf = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (cs === 'utf-8' || cs === 'utf8') return utf;
    return utf; // arquivo é UTF-8 válido apesar do meta (comum após "salvar como")
  } catch {
    return new TextDecoder(cs === 'utf-8' ? 'windows-1252' : cs).decode(bytes);
  }
}

const BLOCK_TAGS = new Set(['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'table', 'blockquote', 'center', 'ul', 'ol', 'dd', 'dt', 'section', 'article', 'hr', 'td', 'th']);
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'col', 'area', 'base', 'wbr', 'param', 'source']);
const SKIP = new Set(['script', 'style', 'head', 'title', 'noscript', 'iframe', 'svg', 'object', 'select', 'button']);
const STRIKE = new Set(['s', 'strike', 'del']);
const EM = new Set(['em', 'i']);

interface Frame { name: string; strike: boolean; em: boolean; heading: boolean; skip: boolean }

export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const stack: Frame[] = [];
  let runs: { t: string; strike: boolean; em: boolean }[] = [];
  let heading = false;

  const state = () => {
    let strike = false, em = false, h = false, skip = false;
    for (const f of stack) { strike ||= f.strike; em ||= f.em; h ||= f.heading; skip ||= f.skip; }
    return { strike, em, h, skip };
  };

  const flush = () => {
    const norm = (s: string) => s.replace(/[\s ]+/g, ' ');
    const all = norm(runs.map((r) => r.t).join('')).trim();
    if (all) {
      const struckText = norm(runs.filter((r) => r.strike).map((r) => r.t).join('')).trim();
      const plainRuns = runs.filter((r) => !r.strike);
      const plainText = norm(plainRuns.map((r) => r.t).join('')).trim();
      const emChars = plainRuns.filter((r) => r.em).map((r) => r.t).join('').replace(/\s/g, '').length;
      const plainChars = plainText.replace(/\s/g, '').length;
      if (struckText) blocks.push({ t: struckText, struck: true, heading: heading || undefined });
      if (plainText) blocks.push({ t: plainText, em: plainChars > 0 && emChars / plainChars > 0.9 ? true : undefined, heading: heading || undefined });
    }
    runs = [];
    heading = false;
  };

  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+|<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [tok, rawName, attrs, text] = m;
    if (text !== undefined) {
      const st = state();
      if (st.skip) continue;
      if (st.h) heading = true;
      runs.push({ t: decodeEntities(text), strike: st.strike, em: st.em });
      continue;
    }
    if (!rawName) continue; // comentário/doctype
    const name = rawName.toLowerCase();
    const closing = tok.startsWith('</');
    if (closing) {
      if (BLOCK_TAGS.has(name)) flush();
      const idx = stack.map((f) => f.name).lastIndexOf(name);
      if (idx >= 0) stack.length = idx;
      continue;
    }
    if (BLOCK_TAGS.has(name)) flush();
    if (VOID.has(name) || tok.endsWith('/>')) continue;
    // <p>, <li>, <tr>, <td> fecham implicitamente o anterior do mesmo tipo (HTML legado do Planalto)
    if (name === 'p' || name === 'li' || name === 'tr' || name === 'td') {
      const idx = stack.map((f) => f.name).lastIndexOf(name);
      if (idx >= 0) stack.length = idx;
    }
    const style = (attrs || '').match(/style\s*=\s*("[^"]*"|'[^']*')/i)?.[1] || '';
    const cls = (attrs || '').match(/class\s*=\s*("[^"]*"|'[^']*')/i)?.[1] || '';
    stack.push({
      name,
      strike: STRIKE.has(name) || /line-through/i.test(style) || /\b(riscado|tachado|strike)\b/i.test(cls),
      em: EM.has(name) || /font-style\s*:\s*italic/i.test(style),
      heading: /^h[1-6]$/.test(name),
      skip: SKIP.has(name),
    });
  }
  flush();
  return blocks;
}
