import type { Article, LawDoc, Unit } from '../core/types';
import { canTrainArticle, type Target } from './generators';
import { legalContrastsOf } from './synonyms';
import { fold, normAnswer } from './text';
import { fitsTarget, isGenericTarget } from './blankQuality';

const removed = /^[\s()–—.,;:[\]]*(?:(?:revogad|vetad|suprimid)[oa]s?|sem efeito|vide)[\s()–—.,;:[\]]*$/iu;

export function hasProvisionText(unit: Unit) {
  return !unit.rev && /[\p{L}\d]/u.test(unit.t) && !removed.test(unit.t)
    && !(unit.k === 'txt' && (
      /^(?:"?[“"]?Art\.?\s*[\d.º°-]+)?[\s.…"”]+$/iu.test(unit.t)
      || (/^\p{Lu}/u.test(unit.t) && unit.t.length <= 120 && !/[.;:,)]$/u.test(unit.t))
    ));
}

export function provisionUnits(art: Article) {
  return canTrainArticle(art) ? art.units.filter(hasProvisionText) : [];
}

/** Lacunas curtas: de 1 a 3 palavras (o número por extenso entre parênteses não conta). */
export const shortAnswer = (value: string) =>
  value.length <= 40 && (value.replace(/\([^()]*\)/gu, '').trim().match(/\S+/g)?.length ?? 0) <= 3;

/** `strong`: quantas alternativas iniciais têm a mesma forma da resposta (as demais só completam o mínimo). */
export type QuestionTarget = { target: Target; choices: string[]; strong?: number };

const stop = new Set([
  'incorre', 'incorrem', 'equipara-se', 'aplica-se', 'considera-se',
  'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo', 'assim', 'bem', 'cada', 'caso',
  'com', 'como', 'cuja', 'cujas', 'cujo', 'cujos', 'da', 'das', 'de', 'dele', 'dela', 'desde', 'desse',
  'desta', 'deste', 'disso', 'do', 'dos', 'durante', 'ela', 'elas', 'ele', 'eles', 'em', 'entre',
  'essa', 'esse', 'esta', 'este', 'estes', 'estas', 'isso', 'isto', 'ja', 'lhe', 'lhes', 'lo',
  'na', 'nas', 'nele', 'nela', 'no', 'nos', 'num', 'numa', 'ou', 'para', 'pela', 'pelas', 'pelo',
  'pelos', 'por', 'porque', 'qual', 'quando', 'quanto', 'que', 'quem', 'se', 'ser', 'sera', 'serao',
  'seja', 'sejam', 'sendo', 'seu', 'seus', 'sob', 'sobre', 'sua', 'suas', 'tal', 'tais', 'ter',
  'toda', 'todas', 'todo', 'todos', 'um', 'uma', 'umas', 'uns', 'art', 'arts', 'nr',
  'artigo', 'artigos', 'inciso', 'incisos', 'paragrafo', 'paragrafos', 'alinea', 'alineas',
  'outrem', 'outro', 'outra', 'outros', 'outras',
]);

const PARTICLES = new Set(['mediante', 'alguem', 'ninguem', 'quem', 'quando', 'enquanto', 'senao', 'perante', 'nao', 'nem', 'ate', 'antes', 'depois', 'contra', 'sem', 'ou', 'e', 'mas', 'salvo', 'exceto', 'inclusive', 'apenas', 'somente']);
/** Substantivos, adjetivos e particípios: o que a banca troca e o jogador precisa memorizar. */
const CONTENT = /(?:ção|ções|são|sões|dade|dades|ncia|ncias|gem|gens|ura|uras|mento|mentos|ismo|tude|ante|antes|ente|entes|ivo|iva|ivos|ivas|ico|ica|icos|icas|oso|osa|osos|osas|vel|veis|al|ais|ário|ária|ários|árias|ório|ória|órios|órias)$/iu;

const contrasts: Record<string, string[]> = {
  nao: ['também', 'sempre', 'excepcionalmente', 'preferencialmente'],
  nem: ['ou', 'e', 'inclusive', 'bem como'],
  ate: ['a partir de', 'depois de', 'antes de', 'além de'],
  antes: ['depois', 'a partir', 'por ocasião', 'independentemente'],
  depois: ['antes', 'a partir', 'por ocasião', 'independentemente'],
  contra: ['em favor de', 'perante', 'a pedido de', 'na presença de'],
  sem: ['com', 'mediante', 'após', 'desde'],
  'de oficio': ['a requerimento', 'mediante representação', 'por provocação', 'a pedido'],
  'em vigor': ['revogada', 'suspensa', 'sem efeito', 'sob condição'],
  vigorar: ['produzir efeitos', 'ser regulamentada', 'ser publicada', 'perder eficácia'],
  vigor: ['aplicação', 'execução', 'eficácia', 'publicidade'],
  soberania: ['autonomia', 'cidadania', 'independência', 'supremacia'],
  cidadania: ['nacionalidade', 'soberania', 'autonomia', 'independência'],
  'dignidade da pessoa humana': ['cidadania', 'autonomia individual', 'igualdade formal', 'liberdade de iniciativa'],
  pronuncia: ['impronúncia', 'condenação', 'reincidência', 'absolvição'],
  litispendencia: ['conexão', 'continência', 'coisa julgada', 'prevenção'],
  reincidencia: ['reiteração', 'habitualidade', 'antecedência', 'culpabilidade'],
  desabastecimento: ['interrupção do fornecimento', 'risco de escassez', 'aumento de preços', 'restrição de acesso'],
  prender: ['conduzir', 'localizar', 'intimar', 'recapturar'],
  criminosos: ['indiciados', 'condenados', 'foragidos', 'investigados'],
  inquerito: ['procedimento investigatório', 'processo penal', 'auto de prisão', 'termo circunstanciado'],
  busca: ['revista', 'inspeção', 'vistoria', 'apreensão'],
};

// Alternativas de reserva só complementam o vocabulário colhido no mesmo diploma.
const vocabulary = {
  f: ['autorização', 'habilitação', 'notificação', 'deliberação', 'comunicação', 'representação', 'homologação', 'suspensão', 'revisão', 'fiscalização'],
  fs: ['autorizações', 'habilitações', 'notificações', 'deliberações', 'comunicações', 'representações', 'homologações', 'revisões'],
  m: ['requerimento', 'procedimento', 'pronunciamento', 'registro', 'ato', 'parecer', 'voto', 'relatório', 'processo', 'julgamento'],
  ms: ['requerimentos', 'procedimentos', 'registros', 'pareceres', 'relatórios', 'processos', 'atos', 'julgamentos'],
  verb: ['homologar', 'autorizar', 'deliberar', 'fiscalizar', 'comunicar', 'requerer', 'reconhecer', 'decidir'],
  infPl: ['autorizarem', 'justificarem', 'exigirem', 'limitarem', 'impedirem', 'recomendarem'],
  future: ['poderá', 'deverá', 'ficará', 'terá', 'será', 'responderá'],
  futurePl: ['poderão', 'deverão', 'ficarão', 'terão', 'serão', 'responderão'],
  amount: ['dois', 'três', 'quatro', 'cinco', 'seis', 'sete'],
  fraction: ['metade', 'um terço', 'dois terços', 'um quarto', 'três quartos'],
  fAdj: ['provisória', 'definitiva', 'subsidiária', 'prevista', 'necessária', 'facultativa'],
  fAdjs: ['provisórias', 'definitivas', 'subsidiárias', 'previstas', 'necessárias', 'facultativas'],
  mAdj: ['provisório', 'definitivo', 'subsidiário', 'previsto', 'necessário', 'facultativo'],
  mAdjs: ['provisórios', 'definitivos', 'subsidiários', 'previstos', 'necessários', 'facultativos'],
  ger: ['falsificando', 'adulterando', 'alterando', 'fabricando', 'reproduzindo', 'imitando', 'suprimindo', 'ocultando', 'destruindo', 'utilizando', 'emitindo', 'expedindo'],
  adv: ['exclusivamente', 'preferencialmente', 'imediatamente', 'subsidiariamente', 'obrigatoriamente', 'facultativamente'],
};
type Form = keyof typeof vocabulary;
type Fragment = { text: string; start: number; form: Form; score: number; contrast: readonly string[] };

const articles = /(?:^|[^\p{L}])(?:(?<f>a|uma|da|na|pela|à)|(?<fs>as|umas|das|nas|pelas|às)|(?<m>o|um|do|no|pelo|ao)|(?<ms>os|uns|dos|nos|pelos|aos))\s*$/iu;
const endings = /(?:ção|são|dade|ncia|tude|gem|ez|ura|ia)$/iu;
const words = /[\p{L}][\p{L}\d]*(?:-[\p{L}\d]+)*|\d+(?:[.,/:]\d+)*(?:[%ºª])?/gu;
const phrase = /(?:dignidade da pessoa humana|valores sociais do trabalho|livre iniciativa|direitos humanos|estado de defesa|ordem pública|coisa julgada|de ofício|em vigor)/giu;

function formOf(text: string, before: string): Form {
  const key = fold(text);
  if (key.endsWith('mente')) return 'adv';
  if (/ndo(?:-(?:o|a|os|as|se|lhe|lhes))?$/u.test(key)) return 'ger';
  if (/^(?:dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|mil)$/u.test(key)) return 'amount';
  if (/^(?:metade|terco|tercos)$/u.test(key)) return 'fraction';
  if (/rão$/iu.test(text)) return 'futurePl';
  if (/rá$/iu.test(text)) return 'future';
  if (/(?:arem|erem|irem)$/u.test(key)) return 'infPl';
  const agreement = articles.exec(before)?.groups;
  if (agreement) return (Object.keys(agreement) as Form[]).find((form) => agreement[form]) ?? 'm';
  if (/(?:ções|sões|dades|ências|tudes|gens|ezes|uras|ias)$/iu.test(text)) return 'fs';
  if (endings.test(text)) return 'f';
  if (/(?:ad|id|iv|ori|ari)[oa]s?$/u.test(key)) {
    return key.endsWith('as') ? 'fAdjs' : key.endsWith('os') ? 'mAdjs' : key.endsWith('a') ? 'fAdj' : 'mAdj';
  }
  if (/(?:[ai]r|er)$/u.test(key) && !/\b(?:em|com|de|por)\s+$/u.test(before)) return 'verb';
  return key.endsWith('as') ? 'fs' : key.endsWith('s') ? 'ms' : key.endsWith('a') ? 'f' : 'm';
}

const fragmentsByUnit = new WeakMap<Unit, Fragment[]>();
function fragments(unit: Unit) {
  const saved = fragmentsByUnit.get(unit);
  if (saved) return saved;
  if (!hasProvisionText(unit)) return [];
  const parts = [...unit.t.matchAll(phrase), ...unit.t.matchAll(words)].flatMap((match): Fragment[] => {
    const text = match[0];
    const key = fold(text);
    const contrast = contrasts[key] ?? legalContrastsOf(text);
    const isNumber = /^\d/u.test(text);
    if (!shortAnswer(text) || (stop.has(key) && !contrast.length) || (!isNumber && key.length < 3 && !contrast.length)) return [];
    if (isGenericTarget(text) && (!contrast.length || key === 'nao')) return [];
    const before = unit.t.slice(Math.max(0, match.index - 20), match.index);
    const citation = isNumber && /(?:arts?\.|§|n[.°º]|lei)\s*$/iu.test(before);
    const form = formOf(text, before);
    // Partículas ("nem", "não", "sem", "até") só viram lacuna quando não há palavra de conteúdo:
    // o jogador deve lembrar o termo jurídico ("degradante"), não a conjunção.
    const particle = PARTICLES.has(key);
    const content = !particle && (CONTENT.test(text) || /(?:ad|id)[oa]s?$/u.test(key));
    const score = (particle ? -4 : contrast.length ? 9 : 0) + (citation ? -5 : isNumber ? 5 : 0) + (articles.test(before) ? 3 : 0)
      + (content ? 4 : 0) + (endings.test(text) || form === 'adv' ? 2 : 0) + Math.min(text.length, 14) / 10;
    return [{ text, start: match.index, form, score, contrast }];
  });
  // Fica disponível para rótulos curtos, siglas e inscrições alfanuméricas.
  if (!parts.length) {
    const all = unit.t.match(words) ?? [];
    const token = all.find((word) => !isGenericTarget(word) && !stop.has(fold(word))) ?? all.find((word) => !stop.has(fold(word))) ?? all[0];
    if (token) parts.push({ text: token, start: unit.t.indexOf(token), form: 'm', score: 0, contrast: [] });
  }
  parts.sort((a, b) => b.score - a.score || a.start - b.start);
  fragmentsByUnit.set(unit, parts);
  return parts;
}

const positions = new WeakMap<LawDoc, Map<string, number>>();
function articleIndex(law: LawDoc, art: Article) {
  let index = positions.get(law);
  if (!index) {
    index = new Map(law.articles.map(({ id }, i) => [id, i]));
    positions.set(law, index);
  }
  return index.get(art.id) ?? -1;
}

/** Primeiro o dispositivo pai e os irmãos próximos. Depois os artigos vizinhos. */
export function relatedProvisions(law: LawDoc, art: Article, unit: Unit) {
  const at = art.units.indexOf(unit);
  const parent = art.units.find(({ id }) => id === unit.parent);
  const local = art.units.slice(Math.max(0, at - 5), at + 6)
    .filter((part) => part !== unit && part !== parent && hasProvisionText(part));
  const nearby = local.sort((a, b) => Number(b.parent === unit.parent) - Number(a.parent === unit.parent));
  const i = articleIndex(law, art);
  const surrounding = i < 0 ? [] : law.articles.slice(Math.max(0, i - 2), i + 3)
    .filter((candidate) => candidate !== art)
    .sort((a, b) => Math.abs(a.sort - art.sort) - Math.abs(b.sort - art.sort));
  const within = parent && hasProvisionText(parent) ? [parent, ...nearby] : nearby;
  return [
    ...within.map((part) => ({ art, unit: part })),
    ...surrounding.flatMap((candidate) => provisionUnits(candidate).slice(0, 4).map((part) => ({ art: candidate, unit: part }))),
  ];
}

function closeNumbers(text: string) {
  const match = /^((?:\d+[.,/:])*)(\d+)([%ºª]?)$/.exec(text);
  if (!match) return [];
  const [, prefix, digits, suffix] = match;
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return [];
  return [value - 1, value + 1, value + 2, value - 2, value + 3, value + 5]
    .filter((n) => n > 0).map((n) => prefix + n.toString().padStart(digits.length, '0') + suffix);
}

/** Completa o banco por dispositivo com termos da mesma função e contexto próximo. */
export function contextualTargets(law: LawDoc, art: Article, unit: Unit): QuestionTarget[] {
  const strict = buildContextual(law, art, unit, true);
  // Dispositivos curtíssimos ("cruéis;", "termo;") podem não ter alternativa da mesma forma: aceita as demais.
  return strict.some(({ choices }) => choices.length >= 2) ? strict.filter(({ choices }) => choices.length >= 2)
    : buildContextual(law, art, unit, false).filter(({ choices }) => choices.length >= 1);
}

/** Termos com a mesma terminação (particípio com particípio, -ção com -ção) soam mais plausíveis. */
function suffixDistance(a: string, b: string) {
  const x = fold(a), y = fold(b);
  for (const n of [4, 3, 2]) if (x.slice(-n) === y.slice(-n)) return 4 - n;
  return 4;
}

function buildContextual(law: LawDoc, art: Article, unit: Unit, strictForm: boolean): QuestionTarget[] {
  const parts = fragments(unit);
  if (!parts.length) return [];
  const related = relatedProvisions(law, art, unit).flatMap(({ unit: other }) => fragments(other).slice(0, 4));
  return parts.slice(0, 12).map((part) => {
    const seen = new Set([normAnswer(part.text)]);
    const numbers = closeNumbers(part.text);
    const peerTerms = related.filter((peer) => peer.form === part.form && !/^\d/u.test(peer.text))
      .sort((a, b) => suffixDistance(a.text, part.text) - suffixDistance(b.text, part.text) || Math.abs(a.text.length - part.text.length) - Math.abs(b.text.length - part.text.length))
      .map(({ text }) => text);
    // Gerúndios mantêm o pronome do alvo ("fabricando-os" → "adulterando-os").
    const clitic = part.form === 'ger' ? /-\p{L}+$/u.exec(part.text)?.[0] ?? '' : '';
    const lexicon = part.form === 'ger' ? vocabulary.ger.map((verb) => verb + clitic) : vocabulary[part.form];
    const pool = [...part.contrast, ...numbers, ...peerTerms, ...lexicon];
    const choices: string[] = [];
    // Primeiro as alternativas da mesma forma; se faltarem para 5 opções, completa com as demais.
    let strong = 0;
    for (const relaxed of strictForm ? [false, true] : [true]) {
      for (const candidate of pool) {
        if (choices.length === 5) break;
        const key = normAnswer(candidate);
        if (!key || seen.has(key) || !shortAnswer(candidate)) continue;
        if (!relaxed && !fitsTarget(part.text, candidate, true, !part.contrast.includes(candidate))) continue;
        if (relaxed && strictForm && choices.length >= 4) break;
        seen.add(key);
        choices.push(/^\p{Lu}/u.test(part.text) ? candidate.charAt(0).toUpperCase() + candidate.slice(1) : candidate);
      }
      if (!relaxed) strong = choices.length;
      if (choices.length >= 4) break;
    }
    return { strong: strictForm ? strong : undefined, target: { text: part.text, start: part.start, dim: unit.k === 'pena' ? 'penas' as const : 'literal' as const, priority: 1 }, choices };
  });
}
