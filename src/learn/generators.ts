// Geração de exercícios de LITERALIDADE a partir do texto oficial importado.
// Distratores usam escolhas lexicais revisadas ou valores comparáveis da mesma lei.
import type { Article, LawDoc, Unit } from '../core/types';
import type { Dim } from '../data/db';
import { fold, normAnswer, rng, shuffle } from './text';
import { legalContrastsOf } from './synonyms';
import { amountAlternatives, findLegalAmounts, type LegalAmount } from './thresholds';

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
  companionUnitId?: string;
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
  priority?: number;
  where?: string; // localização do dispositivo: "EFP-SP · Artigo 241, inciso II"
  /** 'cloze-multi': lacunas na ordem do texto, cada uma com suas alternativas. */
  readingFocus?: { unitId: string; text: string }[];
  blanks?: { answer: string; options: string[] }[];
}

// ---------- extração de alvos ----------
const RE_PENA_CORE = /(?:reclusão|detenção|prisão simples|multa)[^;\n]*/iu;
const RE_EXC = /(?<![\p{L}-])(?:ainda que informalmente|exceção feita|com exceção|não se aplicam?|somente se|a menos que|desde que|ainda que|exceto|salvo|ressalvad[oa]s?|excetuad[oa]s?)(?![\p{L}-])/giu;

// Cada troca testa uma diferença jurídica identificável e conserva a função sintática.
const RULE_GROUPS = [
  ['poderá', 'deverá'], ['poderão', 'deverão'], ['pode', 'deve'], ['podem', 'devem'],
  ['vedado', 'permitido'], ['vedada', 'permitida'], ['vedados', 'permitidos'], ['vedadas', 'permitidas'],
  ['reclusão', 'detenção', 'prisão simples'],
  ['dolo', 'culpa'], ['dolosa', 'culposa', 'preterdolosa'], ['doloso', 'culposo', 'preterdoloso'],
  ['maioria absoluta', 'maioria simples', 'unanimidade'],
  ['dia útil', 'dia corrido'], ['dias úteis', 'dias corridos'],
  ['exclusivamente', 'preferencialmente'], ['obrigatoriamente', 'facultativamente'],
  ['anterior', 'posterior'], ['anteriores', 'posteriores'], ['máximo', 'mínimo'], ['máxima', 'mínima'],
  ['superior', 'inferior'], ['superiores', 'inferiores'], ['privativamente', 'concorrentemente'],
  ['cumulativamente', 'alternativamente'], ['incluindo', 'excluindo'], ['incluído', 'excluído'], ['incluída', 'excluída'],
  ['incluídos', 'excluídos'], ['imediatamente superior', 'imediatamente inferior'],
  ['Presidente do Tribunal de Justiça', 'Vice-Presidente do Tribunal de Justiça', 'Corregedor Geral da Justiça'],
  ['Presidência do Tribunal de Justiça', 'Corregedoria Geral da Justiça', 'Vice-Presidência do Tribunal de Justiça'],
  ['Órgão Especial', 'Tribunal Pleno', 'Conselho Superior da Magistratura'],
  ['escrivão judicial', 'oficial de justiça'],
  ['interpretação extensiva', 'interpretação restritiva', 'interpretação literal'],
  ['aplicação analógica', 'aplicação subsidiária', 'aplicação direta'],
  ['ação penal pública incondicionada', 'ação penal pública condicionada à representação', 'ação penal privada'],
  ['decisão interlocutória', 'sentença de mérito', 'decisão monocrática'],
  ['tutela antecipada', 'tutela cautelar', 'tutela da evidência'],
  ['tutelas provisórias', 'tutelas definitivas'],
  ['recurso ordinário', 'recurso especial', 'recurso extraordinário'],
  ['agravo de instrumento', 'agravo interno', 'recurso de apelação', 'recurso especial'],
  ['citação', 'intimação'], ['citado', 'intimado'], ['citada', 'intimada'], ['citados', 'intimados'],
  ['exoneração', 'demissão'], ['suspensão', 'repreensão', 'advertência'],
  ['trânsito em julgado', 'julgamento em primeira instância', 'julgamento em segunda instância'],
  ['dia do começo', 'dia do vencimento'],
  ['auxílio-alimentação', 'auxílio-transporte'],
  ['direta ou indiretamente', 'apenas diretamente', 'apenas indiretamente'],
  ['primeiro ano do estágio probatório', 'segundo ano do estágio probatório', 'terceiro ano do estágio probatório'],
  ['mensal', 'quinzenal', 'bimestral', 'trimestral', 'semestral'],
];
const SWAPS = new Map<string, string[]>();
for (const group of RULE_GROUPS) for (const term of group) {
  const key = fold(term);
  SWAPS.set(key, [...new Set([...(SWAPS.get(key) ?? []), ...group.filter((other) => fold(other) !== key)])]);
}

// Substantivos do mesmo domínio cujo grupo do banco representa institutos diferentes.
const LEGAL_TERMS = new Set(fold('soberania impedimento suspeição penhora arresto guarda tutela curatela nulidade domicílio testamento legado testemunhas relator competência jurisdição definitivo provisório solidário subsidiário penal civil administrativo federal estadual municipal distrital').split(' '));
const gender = new Map([
  ['dolo', 'm'], ['culpa', 'f'], ['detenção', 'f'], ['reclusão', 'f'], ['prisão simples', 'f'],
  ['impedimento', 'm'], ['suspeição', 'f'], ['incompatibilidade', 'f'], ['incapacidade', 'f'], ['parcialidade', 'f'],
  ['penhora', 'f'], ['arresto', 'm'], ['sequestro', 'm'], ['depósito', 'm'], ['bloqueio', 'm'],
  ['testamento', 'm'], ['codicilo', 'm'], ['legado', 'm'], ['inventário', 'm'], ['herança', 'f'], ['espólio', 'm'], ['doação', 'f'],
  ['domicílio', 'm'], ['residência', 'f'], ['moradia', 'f'], ['endereço', 'm'],
  ['jurisdição', 'f'], ['competência', 'f'], ['atribuição', 'f'], ['alçada', 'f'],
].map(([term, value]) => [fold(term), value]));
const lexicalPhrases = RULE_GROUPS.flat().filter((term) => /[ -]/.test(term))
  .sort((a, b) => b.length - a.length).map((term) => term.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&'));
const lexicalPattern = new RegExp('(?<![\\p{L}-])(?:' + lexicalPhrases.join('|') + '|[\\p{L}]+)(?![\\p{L}-])', 'giu');

type TargetKind = 'regra' | 'excecao' | 'pena' | 'limite-pena' | 'idade';
export interface Target {
  text: string;
  start: number;
  dim: Dim;
  priority?: number;
  kind?: TargetKind;
  amount?: LegalAmount;
  choices?: string[];
}

export function canTrainArticle(art: Article) {
  return !art.rev && !art.noCurrent && !art.outdated?.length;
}

function matchCase(src: string, replacement: string) {
  return /^\p{Lu}/u.test(src) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
}

function ruleChoices(text: string, preceding: string) {
  const source = fold(text);
  const choices = SWAPS.get(source) ?? (LEGAL_TERMS.has(source) ? legalContrastsOf(text) : []);
  const hasArticle = /\b(?:o|a|os|as|do|da|dos|das|no|na|nos|nas|ao|aos|uma?|pelo|pela|pelos|pelas)\s+$/iu.test(preceding) || /à\s+$/iu.test(preceding);
  return choices.filter((choice) => {
    const targetGender = gender.get(fold(choice));
    return !hasArticle || !gender.has(source) || !targetGender || targetGender === gender.get(source);
  }).map((choice) => matchCase(text, choice));
}

function exceptionChoices(text: string, following: string) {
  const expression = fold(text);
  const plural = expression.endsWith('aplicam');
  const options = expression.startsWith('nao se aplica')
    ? ['também se ' + (plural ? 'aplicam' : 'aplica')]
    : expression === 'ainda que informalmente' ? ['desde que formalmente']
      : expression === 'excecao feita' ? ['inclusive quanto']
        : expression === 'com excecao' ? ['com inclusão']
          : /^(?:ressalvad|excetuad)/.test(expression) ? [text.replace(/^(?:ressalvad|excetuad)/i, 'incluíd')]
            : expression === 'ainda que' ? ['somente se']
              : ['desde que', 'somente se', 'a menos que'].includes(expression) ? ['ainda que']
                : /^\s+(?:quando|se|em|por|no|na|nos|nas|para)\b/iu.test(following) ? ['inclusive'] : ['inclusive', 'somente em caso de'];
  return options.map((choice) => matchCase(text, choice));
}

const targetsCache = new WeakMap<Unit, Target[]>();
export function findTargets(u: Unit): Target[] {
  const cached = targetsCache.get(u);
  if (cached) return cached;
  const out: Target[] = [];
  if (!u.t || u.rev) return out;

  if (u.k === 'pena') {
    const match = RE_PENA_CORE.exec(u.t);
    if (match) {
      const text = match[0].split(/,\s+sem prejuízo\b/iu)[0].replace(/[.;\s]+$/, '');
      out.push({ text, start: match.index, dim: 'penas', kind: 'pena', priority: 4 });
    }
  }
  for (const amount of findLegalAmounts(u.t)) {
    const prefix = fold(u.t.slice(Math.max(0, amount.start - 65), amount.start));
    const penaltyLimit = amount.kind === 'prazo' && /\bpenas? (?:maximas?|minimas?) [^,.;]+$/u.test(prefix);
    const age = amount.kind === 'prazo' && /\b(?:idade|etaria|etario|anos de idade)\b[^,.;]*$/u.test(prefix);
    const dim = penaltyLimit || u.k === 'pena' ? 'penas' : amount.kind === 'prazo' && !age ? 'prazos' : 'literal';
    if (u.k !== 'pena' || !out.length) {
      out.push({ text: amount.text, start: amount.start, amount, dim, kind: penaltyLimit ? 'limite-pena' : age ? 'idade' : undefined, priority: 4 });
    }
  }
  for (const match of u.t.matchAll(RE_EXC)) {
    const choices = exceptionChoices(match[0], u.t.slice(match.index + match[0].length));
    out.push({ text: match[0], start: match.index, dim: 'excecoes', kind: 'excecao', priority: 3, choices });
  }
  for (const match of u.t.matchAll(lexicalPattern)) {
    const choices = ruleChoices(match[0], u.t.slice(Math.max(0, match.index - 16), match.index));
    if (!choices.length || out.some((target) => match.index < target.start + target.text.length && target.start < match.index + match[0].length)) continue;
    out.push({ text: match[0], start: match.index, dim: 'literal', kind: 'regra', priority: 2, choices });
  }
  out.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.start - b.start);
  targetsCache.set(u, out);
  return out;
}

const amountPools = new WeakMap<LawDoc, Map<string, Set<number>>>();
function amountPool(law: LawDoc, group: string) {
  let pool = amountPools.get(law);
  if (!pool) {
    pool = new Map();
    for (const article of law.articles) {
      if (!canTrainArticle(article)) continue;
      for (const unit of article.units) for (const { amount } of findTargets(unit)) {
        if (!amount) continue;
        const numbers = pool.get(amount.group) ?? new Set<number>();
        numbers.add(amount.value);
        pool.set(amount.group, numbers);
      }
    }
    amountPools.set(law, pool);
  }
  return [...pool.get(group) ?? []];
}

function penaltyAlternatives(law: LawDoc, text: string) {
  const out: string[] = [];
  const species = /^(?:reclusão|detenção|prisão simples)\b/iu.exec(text)?.[0];
  const speciesChanges = species ? ruleChoices(species, '').map((choice) => choice + text.slice(species.length)) : [];
  if (speciesChanges[0]) out.push(speciesChanges[0]);
  const quantityChanges = findLegalAmounts(text).map((amount) => {
    const prefix = text.slice(0, amount.start);
    const suffix = text.slice(amount.start + amount.text.length);
    return amountAlternatives(amount, amountPool(law, amount.group)).slice(0, 4).map((choice) => prefix + choice + suffix);
  });
  for (const [first] of quantityChanges) {
    if (first) out.push(first);
  }
  // A multa cumulativa e a alternativa são consequências distintas.
  if (species && /\be multa\b/iu.test(text)) out.push(text.replace(/\be multa\b/iu, 'ou multa'));
  if (species && /\bou multa\b/iu.test(text)) out.push(text.replace(/\bou multa\b/iu, 'e multa'));
  out.push(...quantityChanges.flatMap((changes) => changes.slice(1)), ...speciesChanges.slice(1));
  return out;
}

export function contextualAlternatives(law: LawDoc, target: Target, source = ''): string[] {
  const choices = target.amount ? amountAlternatives(target.amount, amountPool(law, target.amount.group))
    : target.choices ?? (target.dim === 'penas' ? penaltyAlternatives(law, target.text) : ruleChoices(target.text, source.slice(0, target.start)));
  const seen = new Set([normAnswer(target.text)]);
  return choices.filter((choice) => {
    const key = normAnswer(choice);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((choice) => matchCase(target.text, choice));
}

export function literalPrompt(target: Target) {
  if (target.kind === 'limite-pena') return 'Qual é o limite de pena previsto neste dispositivo?';
  if (target.kind === 'idade') return 'Qual é a idade prevista neste dispositivo?';
  if (target.amount) {
    return {
      percentual: 'Qual é o percentual previsto neste dispositivo?',
      fracao: 'Qual é a fração prevista neste dispositivo?',
      quantidade: 'Qual é a quantidade prevista neste dispositivo?',
      prazo: 'Qual é o prazo previsto neste dispositivo?',
      valor: 'Qual é o valor previsto neste dispositivo?',
    }[target.amount.kind];
  }
  if (target.dim === 'penas') return 'Qual é a pena cominada?';
  if (target.dim === 'excecoes') return 'Como a lei estabelece a exceção ou condição?';
  return 'Complete o dispositivo com a regra prevista na lei';
}

// ---------- construção ----------
/** Dispositivos que introduzem o dispositivo dado (caput, parágrafo, inciso), do mais externo ao mais interno. */
export function contextChain(art: Article, u: Unit): Unit[] {
  if (u.k === 'caput') return [];
  const chain: Unit[] = [];
  let p = u.parent ? art.units.find((x) => x.id === u.parent) : undefined;
  while (p) { chain.unshift(p); p = p.parent ? art.units.find((x) => x.id === p!.parent) : undefined; }
  const caput = art.units.find((x) => x.k === 'caput');
  // Incisos, alíneas e itens ligados ao caput mostram também o caput, para a lacuna ter referência.
  const underCaput = u.k === 'inc' || u.k === 'pena' || ((u.k === 'ali' || u.k === 'item') && chain[0]?.k === 'inc');
  if (caput && caput !== u && !chain.includes(caput) && underCaput) chain.unshift(caput);
  return chain;
}

export function unitContext(art: Article, u: Unit): Seg[] {
  return contextChain(art, u).flatMap((c) => [{ t: `${c.lab} `, strong: true }, { t: c.t + '\n' }]);
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

export function clozeStem(art: Article, unit: Unit, targets: Target[]) {
  const stem: Seg[] = [{ t: labOf(art, unit), strong: true }];
  let offset = 0;
  for (const target of targets) {
    stem.push({ t: unit.t.slice(offset, target.start) }, { t: target.text, blank: true });
    offset = target.start + target.text.length;
  }
  stem.push({ t: unit.t.slice(offset) });
  return stem;
}

export function buildLiteral(law: LawDoc, art: Article, u: Unit, dim: Dim, stage: number, mode: 'aprender' | 'memorizar' | 'provar', seedExtra = '', choiceCount?: number, preferredTarget?: string): Exercise | null {
  if (!canTrainArticle(art)) return null;
  const targets = findTargets(u).filter((target) => target.dim === dim
    && (!preferredTarget || fold(target.text) === fold(preferredTarget)));
  const priority = targets[0]?.priority;
  const typed = mode === 'provar' && !choiceCount;
  const eligible = targets.filter((target) => target.priority === priority)
    .map((target) => ({ target, choices: typed ? [] : contextualAlternatives(law, target, u.t) }))
    .filter(({ choices }) => typed || choices.length >= (choiceCount ?? 2) - 1);
  if (!eligible.length) return null;
  const seed = `${u.id}:${dim}:${stage}:${seedExtra}`;
  const r = rng(seed);
  const { target, choices } = eligible[Math.floor(r() * eligible.length)];
  const prompt = literalPrompt(target);
  const base = {
    key: `L:${u.id}:${dim}`, dim, lawId: law.id, articleId: art.id, unitId: u.id, context: unitContext(art, u),
    stage, where: whereOf(law, art, u), priority, family: 'literal' as const,
  };
  const single = { ...base, stem: clozeStem(art, u, [target]), answer: target.text };
  if (typed) return { ...single, kind: 'cloze-type', prompt, expectedMs: 25000 };
  // A lacuna dupla só reúne quantidades distintas, ambas com alternativas plausíveis.
  if (stage >= 3 && !choiceCount && !preferredTarget && target.amount && choices.length >= 2) {
    const other = eligible.find((entry) => entry.target.amount && entry.target.amount.value !== target.amount!.value && entry.choices.length >= 2);
    if (other) {
      const pair = [{ target, choices }, other].sort((a, b) => a.target.start - b.target.start);
      const blanks = pair.map((entry) => ({ answer: entry.target.text, options: shuffle([entry.target.text, ...entry.choices.slice(0, 3)], r) }));
      return { ...base, kind: 'cloze-multi', prompt: 'Complete os dois limites previstos no dispositivo',
        stem: clozeStem(art, u, pair.map((entry) => entry.target)), blanks, answer: blanks.map((entry) => entry.answer).join(' | '), expectedMs: 32000 };
    }
  }
  const otherValues = target.amount && new Map(art.units.filter((part) => part !== u).flatMap((part) =>
    findTargets(part).flatMap(({ amount }) => amount?.group === target.amount!.group
      ? [[target.amount!.format(amount.value), unitPath(art, part)] as const] : [])));
  const options = shuffle([
    { id: 'ok', text: target.text, correct: true },
    ...choices.slice(0, (choiceCount ?? 5) - 1).map((text, index) => {
      const other = otherValues?.get(text);
      return { id: `d${index}`, text, correct: false, why: other ? `Esse valor aparece em outra hipótese do mesmo artigo (${other}).` : undefined };
    }),
  ], r);
  return { ...single, kind: 'cloze-mc', prompt, options, expectedMs: 15000 };
}

/** Ordenação de incisos de um mesmo dispositivo. */
export function buildOrder(law: LawDoc, art: Article, stage: number, requestedParent?: string): Exercise | null {
  if (!canTrainArticle(art)) return null;
  const groups = new Map<string, Unit[]>();
  for (const u of art.units) if (u.k === 'inc' && !u.rev && u.t) groups.set(u.parent || 'caput', [...(groups.get(u.parent || 'caput') || []), u]);
  const g = [...groups.entries()].find(([parent, us]) => (requestedParent === undefined || parent === requestedParent)
    && us.length >= 3 && us.length <= 7
    && new Set(us.map((unit) => normAnswer(unit.t))).size === us.length);
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

export function shuffledOrderItems(ex: Pick<Exercise, 'key' | 'orderItems'>) {
  const items = ex.orderItems ?? [];
  const shuffled = shuffle(items, rng(ex.key + 'o'));
  return shuffled.length > 1 && shuffled.every((item, index) => item.id === items[index].id)
    ? [...shuffled.slice(1), shuffled[0]] : shuffled;
}

/** Qual é o artigo? (localização do dispositivo) */
export function buildWhich(law: LawDoc, art: Article, stage: number): Exercise | null {
  if (!canTrainArticle(art)) return null;
  const caput = art.units.find((u) => u.k === 'caput' && u.t && !u.rev);
  if (!caput || caput.t.length < 40) return null;
  const idx = law.articles.indexOf(art);
  const r = rng(`W:${art.id}:${stage}`);
  const label = normAnswer(art.lab);
  const near = new Map<string, string>();
  for (const candidate of law.articles.slice(Math.max(0, idx - 8), idx + 9)) {
    const key = normAnswer(candidate.lab);
    if (key !== label && canTrainArticle(candidate) && !/^[a-z]+\d*-/.test(candidate.n)) near.set(key, candidate.lab);
  }
  const ds = shuffle([...near.values()], r).slice(0, 3);
  if (ds.length < 3) return null;
  const options = shuffle([{ id: 'ok', text: art.lab, correct: true }, ...ds.map((d, i) => ({ id: `d${i}`, text: d, correct: false }))], r);
  // sem "where": a localização é justamente o que se pergunta
  return { key: `W:${art.id}`, kind: 'which-article', dim: 'literal', family: 'literal', lawId: law.id, articleId: art.id, stage, prompt: `Em qual artigo (${law.short}) está este texto?`, stem: [{ t: caput.t }], options, answer: art.lab, expectedMs: 15000 };
}

/** Rubrica (nomen iuris) — associação entre conduta e crime/instituto. */
export function buildRubric(law: LawDoc, art: Article, stage: number): Exercise | null {
  if (!canTrainArticle(art)) return null;
  const caput = art.units.find((u) => u.k === 'caput' && u.t && !u.rev);
  if (!art.rub || !caput) return null;
  const r = rng(`R:${art.id}:${stage}`);
  const idx = law.articles.indexOf(art);
  const rubric = normAnswer(art.rub);
  const rubs = new Map<string, string>();
  for (const candidate of law.articles.slice(Math.max(0, idx - 25), idx + 26)) {
    if (!candidate.rub || !canTrainArticle(candidate)) continue;
    const key = normAnswer(candidate.rub);
    if (key !== rubric) rubs.set(key, candidate.rub);
  }
  const ds = shuffle([...rubs.values()], r).slice(0, 3);
  if (ds.length < 3) return null;
  const options = shuffle([{ id: 'ok', text: art.rub, correct: true }, ...ds.map((d, i) => ({ id: `d${i}`, text: d, correct: false }))], r);
  return { key: `R:${art.id}`, kind: 'rubric', dim: 'conceitual', family: 'literal', lawId: law.id, articleId: art.id, stage, where: whereOf(law, art), prompt: 'Qual é o nome (rubrica) deste dispositivo?', stem: [{ t: art.lab + ' ', strong: true }, { t: caput.t }], options, answer: art.rub, expectedMs: 15000 };
}

/** Leitura guiada do artigo inteiro (primeiro contato, modo Aprender). */
export function buildRead(law: LawDoc, art: Article): Exercise {
  return { key: `Rd:${art.id}`, kind: 'read', dim: 'literal', family: 'leitura', lawId: law.id, articleId: art.id, where: whereOf(law, art), prompt: 'Leia o artigo com calma. Toque nos termos sublinhados para entender o que significam.', stem: [], expectedMs: 30000, stage: 0 };
}
