// Geração de exercícios de LITERALIDADE a partir do texto oficial importado.
// Distratores usam escolhas lexicais revisadas ou valores comparáveis da mesma lei.
import type { Article, LawDoc, Unit } from '../core/types';
import type { Dim } from '../data/db';
import { fold, normAnswer, rng, shuffle } from './text';
import { hasSynonyms, isTrapWord, synonymsOf } from './synonyms';

export type ExKind = 'read' | 'cloze-mc' | 'cloze-type' | 'tf' | 'order' | 'which-article' | 'rubric' | 'concept' | 'doctrine' | 'case' | 'lesson' | 'term' | 'mc5' | 'ce' | 'spot' | 'cloze-multi';

export interface Seg { t: string; blank?: boolean; altered?: boolean; strong?: boolean }
export interface Option { id: string; text: string; correct: boolean; why?: string }
export interface DoctrinePart { prompt: string; options: Option[] }

export interface Exercise {
  key: string; // id do cartão FSRS
  kind: ExKind;
  dim: Dim;
  family: 'literal' | 'interpretacao' | 'leitura' | 'microaula' | 'glossario';
  lawId?: string;
  articleId?: string;
  unitId?: string;
  conceptId?: string;
  doctrine?: { courseId: string; module: string; source: string; pages: string };
  doctrineParts?: DoctrinePart[];
  lessonId?: string;
  termId?: string;
  prompt: string;
  context?: Seg[]; // texto do caput/pai para contexto
  stem: Seg[];
  options?: Option[];
  answer?: string; // resposta esperada (lacuna, V/F, ordem)
  altered?: { from: string; to: string }; // V/F: alteração aplicada (se houver)
  orderItems?: { id: string; lab: string; t: string }[];
  expectedMs: number;
  stage: number;
  practice?: 'revisao' | 'revanche' | 'nova';
  where?: string; // localização do dispositivo: "EFP-SP · Artigo 241, inciso II"
  /** 'cloze-multi': lacunas na ordem do texto, cada uma com suas alternativas. */
  blanks?: { answer: string; options: string[] }[];
}

// ---------- extração de alvos ----------
export const RE_PRAZO = /\b\d{1,4}\s*\((?:[a-zà-ú]+(?:[\s-]e?[\s-]?[a-zà-ú]+)*)\)\s*(?:dias?|horas?|meses|m[eê]s|anos?|minutos|sess[õo]es)(?:\s+(?:úteis|corridos|consecutivos|ininterruptos))?|\b(?:(?:vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cento(?:\s+e\s+(?:vinte|oitenta))?)\s+e\s+)?(?:um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cento e vinte|cento e oitenta|cem|trezentos e sessenta e cinco)\s+(?:dias?|horas?|meses|m[eê]s|anos?)(?:\s+(?:úteis|corridos|consecutivos))?/gi;
const RE_EXC = /\b(salvo|exceto|ressalvad[oa]s?|excetuad[oa]s?|n[ãa]o se aplica(?:m)?|sem preju[íi]zo|independentemente|a menos que|desde que|ainda que)\b/gi;
const RE_PENA_CORE = /(reclus[ãa]o|deten[çc][ãa]o|multa)(?:(?<=\d)\.(?=\d)|[^.])*/i;

export const SWAPS: string[][] = [
  ['poderá', 'deverá'], ['poderão', 'deverão'], ['pode', 'deve'], ['podem', 'devem'],
  ['é vedado', 'é permitido'], ['é vedada', 'é permitida'], ['vedado', 'permitido'], ['vedada', 'permitida'],
  ['reclusão', 'detenção'], ['dolo', 'culpa'], ['dolosa', 'culposa'], ['doloso', 'culposo'],
  ['maioria absoluta', 'maioria simples', 'dois terços', 'três quintos'],
  ['dias úteis', 'dias corridos'], ['exclusivamente', 'preferencialmente'], ['obrigatoriamente', 'facultativamente'],
  ['anterior', 'posterior'], ['máximo', 'mínimo'], ['superior', 'inferior'], ['privativamente', 'concorrentemente'],
  ['imediatamente', 'oportunamente'], ['sempre', 'excepcionalmente'], ['Presidente do Tribunal', 'Corregedor Geral da Justiça'],
  ['escrivão judicial', 'oficial de justiça'], ['juiz', 'escrivão'], ['citação', 'intimação'], ['citado', 'intimado'],
  ['exoneração', 'demissão'], ['posse', 'exercício'], ['suspensão', 'repreensão'], ['advertência', 'repreensão'],
];

const KEY_WORDS = /\b(poder[áa]o?|dever[áa]o?|ser[áa]o?|n[ãa]o ser[áa]o?|vedad[oa]s?|compete|competir[áa]|cabe|caber[áa]|privativamente|exclusivamente|obrigatoriamente|preferencialmente|independentemente|maioria absoluta|maioria simples|dois ter[çc]os|tr[êe]s quintos|reclus[ãa]o|deten[çc][ãa]o|dolo|culpa|posse|exerc[íi]cio|exonera[çc][ãa]o|demiss[ãa]o|cita[çc][ãa]o|intima[çc][ãa]o)\b/gi;
const STOP = new Set(fold('para pelo pela pelos pelas como mais quando onde sobre entre desde contra durante mediante perante segundo conforme quanto qualquer quaisquer outro outra outros outras mesmo mesma seus suas este esta estes estas esse essa aquele aquela isso deste desta neste nesta dele dela sendo será serão tiver tenha forem houver respectivo respectiva artigo inciso alínea parágrafo pelo pela dos das nos nas aos com sem que sua seu não ser ter for são está esta este').split(' '));

export interface Target { text: string; start: number; dim: Dim }

export function findTargets(u: Unit): Target[] {
  const t = u.t;
  const out: Target[] = [];
  if (!t || u.rev) return out;
  if (u.k === 'pena') {
    const m = t.match(RE_PENA_CORE);
    if (m) out.push({ text: m[0].replace(/[.;\s]+$/, ''), start: m.index!, dim: 'penas' });
  }
  for (const m of t.matchAll(RE_PRAZO)) out.push({ text: m[0], start: m.index!, dim: 'prazos' });
  for (const m of t.matchAll(RE_EXC)) out.push({ text: m[0], start: m.index!, dim: 'excecoes' });
  // literalidade: todas as palavras com sinônimos jurídicos + palavras-chave; lacuna varia a cada revisão
  const lit = new Map<number, string>();
  for (const w of t.matchAll(/(?<![\p{L}])[a-zà-ú][\p{L}]{2,}(?![\p{L}-])/gu)) if (hasSynonyms(w[0]) && !STOP.has(fold(w[0]))) lit.set(w.index!, w[0]);
  for (const k of t.matchAll(KEY_WORDS)) if (!lit.has(k.index!)) lit.set(k.index!, k[0]);
  if (!lit.size) {
    // dispositivo curto ou sem palavra-chave: a palavra de conteúdo mais longa (garante cobertura integral)
    const words = [...t.matchAll(/(?<![\p{L}])[a-zà-ú][\p{L}]{3,}(?![\p{L}-])/gu)].filter((w) => !STOP.has(fold(w[0])));
    words.sort((a, b) => b[0].length - a[0].length);
    if (words[0]) lit.set(words[0].index!, words[0][0]);
  }
  for (const [start, text] of lit) out.push({ text, start, dim: 'literal' });
  return out;
}

export function unitDims(u: Unit): Dim[] {
  const dims = new Set<Dim>();
  for (const t of findTargets(u)) dims.add(t.dim);
  return [...dims];
}

// ---------- pools de distratores (por lei) ----------
const poolCache = new Map<string, { prazos: string[]; penas: string[] }>();
export function pools(law: LawDoc) {
  let p = poolCache.get(law.id);
  if (p) return p;
  const prazos = new Set<string>(), penas = new Set<string>();
  for (const a of law.articles) for (const u of a.units) {
    if (a.rev || a.noCurrent || a.outdated?.length || u.rev) continue;
    for (const tg of findTargets(u)) {
      if (tg.dim === 'prazos') prazos.add(tg.text);
      else if (tg.dim === 'penas') penas.add(tg.text);
    }
  }
  p = { prazos: [...prazos], penas: [...penas] };
  poolCache.set(law.id, p);
  return p;
}
export function clearPools(lawId?: string) { if (lawId) poolCache.delete(lawId); else poolCache.clear(); }

const EXT: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, sessenta: 60, noventa: 90, 'cento e vinte': 120, 'cento e oitenta': 180 };
/** Valor normalizado de um prazo ("2 (dois) anos" e "dois anos" -> "2 anos"). */
export function prazoKey(s: string): string {
  const f = fold(s);
  const unit = (f.match(/(dias?|horas?|meses|mes|anos?|minutos|sessoes)/)?.[1] || '').replace(/s$/, '').replace(/^mese$/, 'mes');
  const d = f.match(/^\s*(\d+)/)?.[1];
  const w = Object.keys(EXT).sort((a, b) => b.length - a.length).find((k) => f.startsWith(k + ' '));
  const extra = /uteis/.test(f) ? ' uteis' : /corridos/.test(f) ? ' corridos' : '';
  return `${d ?? (w ? EXT[w] : f)} ${unit}${extra}`;
}

export function swapGroup(tok: string): string[] | undefined {
  const f = fold(tok);
  return SWAPS.find((g) => g.some((x) => fold(x) === f));
}

export function matchCase(src: string, repl: string) {
  return /^[A-ZÀ-Ú]/.test(src) ? repl[0].toUpperCase() + repl.slice(1) : repl;
}

/** Trocas lexicais de mesma flexão ou pares jurídicos cadastrados. */
const gender: Record<string, 'f' | 'm'> = { dolo: 'm', culpa: 'f', posse: 'f', exercicio: 'm', detencao: 'f', propriedade: 'f', dominio: 'm' };

export function lexicalAlternatives(text: string, meaningOnly = false, before = ''): string[] {
  const from = fold(text);
  const pair = swapGroup(text) ?? [];
  const afterArticle = /\b(?:o|a|os|as|do|da|dos|das|no|na|nos|nas|ao|aos|uma?|pelo|pela)\s+$/i.test(fold(before));
  const synonyms = !meaningOnly || isTrapWord(text) ? synonymsOf(text) : [];
  return [...new Map([...pair, ...synonyms]
    .filter((choice) => fold(choice) !== from && (!afterArticle || !gender[from] || !gender[fold(choice)] || gender[from] === gender[fold(choice)]))
    .map((choice) => [fold(choice), matchCase(text, choice)])).values()];
}

// Expressões dos pares jurídicos vêm antes dos tokens isolados.
const swapPhrases = SWAPS.flat().filter((item) => item.includes(' ')).sort((a, b) => b.length - a.length);
const lexicalPattern = new RegExp(`(?<![\\p{L}-])(?:${swapPhrases.join('|')}|[\\p{L}]+)(?![\\p{L}-])`, 'giu');

export function lexicalChanges(text: string, meaningOnly = false) {
  const changes: { text: string; from: string; to: string }[] = [];
  for (const match of text.matchAll(lexicalPattern)) {
    const from = match[0];
    const start = match.index!;
    for (const to of lexicalAlternatives(from, meaningOnly, text.slice(0, start))) {
      changes.push({ from, to, text: text.slice(0, start) + to + text.slice(start + from.length) });
    }
  }
  return changes;
}

const prazoFormat = (text: string) => {
  const unit = fold(text).match(/\b(dias?|horas?|mes(?:es)?|anos?|minutos?|sessoes)\b.*$/)?.[0];
  const format = /^\d+\s*\(/.test(text) ? 'numero-e-extenso' : /^\d/.test(text) ? 'numero' : 'extenso';
  return unit ? `${format}:${unit}` : null;
};

// Mesma estrutura de pena: mantém unidade, fórmula e multa cumulativa/alternativa.
const penaFormat = (text: string) => fold(text)
  .replace(/\(\p{L}+(?:[\s-]+\p{L}+)*\)/gu, '(#)')
  .replace(/\b(?:\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta)\b/g, '#')
  .replace(/\s+/g, ' ').trim();

export function contextualAlternatives(law: LawDoc, target: Target, source = ''): string[] {
  const { text, dim } = target;
  if (dim === 'literal') return lexicalAlternatives(text, false, source.slice(0, target.start));
  if (dim === 'excecoes') {
    const expression = fold(text);
    const plural = expression.endsWith('aplicam');
    const options = expression.startsWith('nao se aplica')
      ? [`também se ${plural ? 'aplicam' : 'aplica'}`, `somente se ${plural ? 'aplicam' : 'aplica'}`]
      : expression === 'sem prejuizo' ? ['em substituição', 'em decorrência']
        : /^(?:ressalvad|excetuad)/.test(expression) ? [text.replace(/^(?:ressalvad|excetuad)/i, 'incluíd')]
          : expression === 'independentemente' ? ['exclusivamente', 'cumulativamente']
            : expression === 'ainda que' ? ['somente se', 'desde que']
              : expression === 'desde que' || expression === 'a menos que' ? ['ainda que', 'sempre que']
                : ['inclusive', 'somente'];
    return options.map((choice) => matchCase(text, choice));
  }
  if (dim === 'prazos') {
    const format = prazoFormat(text);
    if (!format) return [];
    const key = prazoKey(text);
    const alternatives = pools(law).prazos.filter((choice) => prazoFormat(choice) === format && prazoKey(choice) !== key);
    return [...new Map(alternatives.map((choice) => [prazoKey(choice), matchCase(text, choice)])).values()];
  }
  if (dim === 'penas') {
    const format = penaFormat(text);
    const alternatives = pools(law).penas.filter((choice) => penaFormat(choice) === format && normAnswer(choice) !== normAnswer(text));
    const kind = /^(reclusão|detenção)\b/i.exec(text)?.[0];
    if (kind) alternatives.push(...lexicalAlternatives(kind, true).filter((choice) => /^(reclusão|detenção)$/i.test(choice)).map((choice) => choice + text.slice(kind.length)));
    return [...new Map(alternatives.map((choice) => [normAnswer(choice), matchCase(text, choice)])).values()];
  }
  return [];
}

function distractors(law: LawDoc, target: Target, seed: string, n = 3, source = ''): string[] {
  return shuffle(contextualAlternatives(law, target, source), rng(seed)).slice(0, n);
}

// ---------- construção ----------
export function unitContext(art: Article, u: Unit): Seg[] {
  const ctx: Seg[] = [];
  if (u.k !== 'caput') {
    const chain: Unit[] = [];
    let p = u.parent ? art.units.find((x) => x.id === u.parent) : undefined;
    while (p) { chain.unshift(p); p = p.parent ? art.units.find((x) => x.id === p!.parent) : undefined; }
    const caput = art.units.find((x) => x.k === 'caput');
    if (caput && !chain.includes(caput) && (u.k === 'inc' || u.k === 'pena') && !u.parent) chain.unshift(caput);
    for (const c of chain) ctx.push({ t: `${c.lab} `, strong: true }, { t: c.t + '\n' });
  }
  return ctx;
}

const labOf = (art: Article, u: Unit) => (u.k === 'caput' ? art.lab : u.lab) + ' ';

export function unitPathParts(art: Article, u?: Unit): string[] {
  if (!u) return [art.lab];
  if (u.k === 'caput') return [art.lab, 'caput'];
  const chain: Unit[] = [];
  let p: Unit | undefined = u;
  while (p && p.k !== 'caput') { chain.unshift(p); p = p.parent ? art.units.find((x) => x.id === p!.parent) : undefined; }
  const name = (x: Unit) => x.k === 'inc' ? `inciso ${x.lab}` : x.k === 'ali' ? `alínea ${x.lab.replace(')', '')}` : x.k === 'item' ? `item ${x.lab.replace(/[.)]$/, '')}` : x.k === 'pena' ? 'preceito secundário (pena)' : x.k === 'txt' ? 'texto' : x.lab;
  return [art.lab, ...chain.map(name)];
}
/** Caminho legível do dispositivo: "Art. 52, § 1º, inciso II, alínea a". */
export const unitPath = (art: Article, u?: Unit) => unitPathParts(art, u?.k === 'caput' ? undefined : u).join(', ');
export const whereOf = (law: LawDoc, art: Article, u?: Unit) => `${law.short} · ${unitPath(art, u)}`;

export function buildLiteral(law: LawDoc, art: Article, u: Unit, dim: Dim, stage: number, mode: 'aprender' | 'memorizar' | 'provar', seedExtra = '', choiceCount?: number, preferredTarget?: string): Exercise | null {
  if (art.outdated?.length || art.noCurrent) return null; // redação possivelmente desatualizada: fora da literalidade
  const targets = findTargets(u).filter((x) => x.dim === dim);
  if (!targets.length) return null;
  const seed = `${u.id}:${dim}:${stage}:${seedExtra}`;
  const r = rng(seed);
  // peso: pegadinhas (sentido jurídico diferente) > sinônimos > palavras-chave > demais
  const weight = (x: Target) => (dim !== 'literal' ? 1 : isTrapWord(x.text) ? 3 : hasSynonyms(x.text) ? 2 : 1);
  const totalW = targets.reduce((a, x) => a + weight(x), 0);
  let pickW = r() * totalW, target = targets[0];
  for (const x of targets) { pickW -= weight(x); if (pickW <= 0) { target = x; break; } }
  const minDistractors = (choiceCount ?? 2) - 1;
  const preferred = preferredTarget && targets.find((candidate) => fold(candidate.text) === fold(preferredTarget));
  if (preferred) target = preferred;
  if (!preferred && (choiceCount || mode !== 'provar') && contextualAlternatives(law, target, u.t).length < minDistractors) {
    target = shuffle(targets, r).find((candidate) => contextualAlternatives(law, candidate, u.t).length >= minDistractors) ?? target;
  }
  const before = u.t.slice(0, target.start), after = u.t.slice(target.start + target.text.length);
  const base = { key: `L:${u.id}:${dim}`, dim, lawId: law.id, articleId: art.id, unitId: u.id, context: unitContext(art, u), stage, where: whereOf(law, art, u) };
  const prefix: Seg[] = [{ t: labOf(art, u), strong: true }];
  const dimPrompt: Record<Dim, string> = {
    literal: 'Complete com a palavra exata da lei', prazos: 'Qual é o prazo previsto?', penas: 'Qual é a pena cominada?',
    excecoes: 'Complete com a expressão exata que introduz a exceção ou condição', conceitual: '', aplicacao: '',
  };
  // Várias lacunas no mesmo dispositivo (degrau 1–2, memorizar): 2 ou 3 palavras com sinônimos
  if (!preferredTarget && !choiceCount && dim === 'literal' && stage <= 2 && mode !== 'provar' && r() < 0.35) {
    const cands = targets.filter((x) => lexicalAlternatives(x.text, false, u.t.slice(0, x.start)).length >= 2);
    const chosen: Target[] = [];
    for (const c of shuffle(cands, r)) { if (chosen.length >= 3) break; if (chosen.every((x) => x.start + x.text.length <= c.start || c.start + c.text.length <= x.start)) chosen.push(c); }
    chosen.sort((a, b) => a.start - b.start);
    if (chosen.length >= 2) {
      const stem: Seg[] = [...prefix]; let pos = 0;
      for (const c of chosen) { stem.push({ t: u.t.slice(pos, c.start) }, { t: c.text, blank: true }); pos = c.start + c.text.length; }
      stem.push({ t: u.t.slice(pos) });
      const blanks = chosen.map((c, i) => ({ answer: c.text, options: shuffle([c.text, ...distractors(law, c, `${seed}:m${i}`, 3, u.t)], rng(`${seed}:o${i}`)) }));
      return { ...base, kind: 'cloze-multi', family: 'literal', prompt: `Complete as ${chosen.length} lacunas com as palavras exatas da lei`, stem, blanks, answer: chosen.map((c) => c.text).join(' | '), expectedMs: 14000 * chosen.length };
    }
  }

  if (mode === 'provar' && !choiceCount) {
    return { ...base, kind: 'cloze-type', family: 'literal', prompt: dimPrompt[dim] + ' — digite', stem: [...prefix, { t: before }, { t: target.text, blank: true }, { t: after }], answer: target.text, expectedMs: 25000 };
  }
  const ds = distractors(law, target, seed, choiceCount ? choiceCount - 1 : dim === 'literal' ? 4 : 3, u.t);
  if (ds.length < minDistractors) return null;
  const options = shuffle([{ id: 'ok', text: target.text, correct: true }, ...ds.map((d, i) => ({ id: `d${i}`, text: d, correct: false }))], r);
  return { ...base, kind: 'cloze-mc', family: 'literal', prompt: dimPrompt[dim], stem: [...prefix, { t: before }, { t: target.text, blank: true }, { t: after }], options, answer: target.text, expectedMs: 15000 };
}

/** Ordenação de incisos de um mesmo dispositivo. */
export function buildOrder(law: LawDoc, art: Article, stage: number): Exercise | null {
  const groups = new Map<string, Unit[]>();
  for (const u of art.units) if (u.k === 'inc' && !u.rev && u.t) groups.set(u.parent || 'caput', [...(groups.get(u.parent || 'caput') || []), u]);
  const g = [...groups.entries()].find(([, us]) => us.length >= 3 && us.length <= 7);
  if (!g) return null;
  const [parentKey, us] = g;
  const parent = parentKey === 'caput' ? art.units.find((x) => x.k === 'caput') : art.units.find((x) => x.id === parentKey);
  return {
    key: `O:${art.id}:${parentKey}`, kind: 'order', dim: 'literal', family: 'literal', lawId: law.id, articleId: art.id, stage, where: whereOf(law, art, parent && parent.k !== 'caput' ? parent : undefined) + ' — incisos',
    prompt: 'Toque nos incisos na ordem em que aparecem na lei',
    context: parent ? [{ t: `${parent.lab} `, strong: true }, { t: parent.t }] : [],
    stem: [], orderItems: us.map((u) => ({ id: u.id, lab: u.lab, t: u.t })), answer: us.map((u) => u.id).join('|'), expectedMs: 30000,
  };
}

/** Qual é o artigo? (localização do dispositivo) */
export function buildWhich(law: LawDoc, art: Article, stage: number): Exercise | null {
  const caput = art.units.find((u) => u.k === 'caput' && u.t && !u.rev);
  if (!caput || caput.t.length < 40) return null;
  const idx = law.articles.indexOf(art);
  const r = rng(`W:${art.id}:${stage}`);
  const near = law.articles.filter((a, i) => a !== art && Math.abs(i - idx) <= 8 && !/^[a-z]+\d*-/.test(a.n));
  const ds = shuffle(near, r).slice(0, 3);
  if (ds.length < 3) return null;
  const options = shuffle([{ id: 'ok', text: art.lab, correct: true }, ...ds.map((d, i) => ({ id: `d${i}`, text: d.lab, correct: false }))], r);
  // sem "where": a localização é justamente o que se pergunta
  return { key: `W:${art.id}`, kind: 'which-article', dim: 'literal', family: 'literal', lawId: law.id, articleId: art.id, stage, prompt: `Em qual artigo (${law.short}) está este texto?`, stem: [{ t: caput.t }], options, answer: art.lab, expectedMs: 15000 };
}

/** Rubrica (nomen iuris) — associação entre conduta e crime/instituto. */
export function buildRubric(law: LawDoc, art: Article, stage: number): Exercise | null {
  const caput = art.units.find((u) => u.k === 'caput' && u.t && !u.rev);
  if (!art.rub || !caput) return null;
  const r = rng(`R:${art.id}:${stage}`);
  const idx = law.articles.indexOf(art);
  const rubs = [...new Set(law.articles.filter((a, i) => a.rub && a !== art && Math.abs(i - idx) <= 25).map((a) => a.rub!))].filter((x) => fold(x) !== fold(art.rub!));
  const ds = shuffle(rubs, r).slice(0, 3);
  if (ds.length < 3) return null;
  const options = shuffle([{ id: 'ok', text: art.rub, correct: true }, ...ds.map((d, i) => ({ id: `d${i}`, text: d, correct: false }))], r);
  return { key: `R:${art.id}`, kind: 'rubric', dim: 'conceitual', family: 'literal', lawId: law.id, articleId: art.id, stage, where: whereOf(law, art), prompt: 'Qual é o nome (rubrica) deste dispositivo?', stem: [{ t: art.lab + ' ', strong: true }, { t: caput.t }], options, answer: art.rub, expectedMs: 15000 };
}

/** Leitura guiada do artigo inteiro (primeiro contato, modo Aprender). */
export function buildRead(law: LawDoc, art: Article): Exercise {
  return { key: `Rd:${art.id}`, kind: 'read', dim: 'literal', family: 'leitura', lawId: law.id, articleId: art.id, where: whereOf(law, art), prompt: 'Leia o artigo com calma. Toque nos termos sublinhados para entender o que significam.', stem: [], expectedMs: 30000, stage: 0 };
}
