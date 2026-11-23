// Qualidade das lacunas de lei seca.
// 1) Lacunas de 1 a 3 palavras com peso jurídico: expressões como "propriedade privada",
//    "fé pública" e "território nacional" viram lacuna única, com o adjetivo trocado nas alternativas.
// 2) Palavras genéricas ("lei", "crimes", "agente", "fato") deixam de ser lacuna.
// 3) As alternativas precisam ter a mesma "forma" da resposta: classe aparente, número e maiúscula.
import type { Unit } from '../core/types';
import type { Target } from './generators';
import { fold } from './text';

const GROUPS = [
  ['pública', 'privada', 'particular', 'estatal'],
  ['nacional', 'estrangeira', 'internacional', 'regional'],
  ['federal', 'estadual', 'municipal', 'distrital'],
  ['penal', 'civil', 'administrativa', 'eleitoral'],
  ['judicial', 'extrajudicial', 'administrativa', 'arbitral'],
  ['absoluta', 'relativa', 'parcial', 'qualificada'],
  ['culposa', 'dolosa', 'preterdolosa', 'tentada'],
  ['brasileira', 'estrangeira', 'internacional', 'nacional'],
  ['definitiva', 'provisória', 'cautelar', 'liminar'],
  ['ordinária', 'extraordinária', 'especial', 'sumária'],
  ['direta', 'indireta', 'reflexa', 'presumida'],
  ['efetiva', 'temporária', 'eventual', 'provisória'],
  ['originária', 'derivada', 'recursal', 'incidental'],
];

/** Flexões de um adjetivo do grupo (dado no feminino singular). */
function inflect(fem: string, plural: boolean, masculine: boolean) {
  let w = fem;
  if (masculine && w.endsWith('a')) w = w.slice(0, -1) + 'o';
  if (!plural) return w;
  if (w.endsWith('l')) return w.endsWith('il') ? w.slice(0, -2) + 'is' : w.slice(0, -1) + 'is';
  if (/[rz]$/u.test(w)) return w + 'es';
  return w + 's';
}

const forms = new Map<string, { group: string[]; plural: boolean; masculine: boolean }>();
for (const group of GROUPS) {
  for (const fem of group) {
    for (const plural of [false, true]) for (const masculine of [false, true]) {
      const key = fold(inflect(fem, plural, masculine));
      // O primeiro grupo prevalece ("administrativa" fica com penal/civil/eleitoral).
      if (!forms.has(key)) forms.set(key, { group, plural, masculine: masculine && fem.endsWith('a') });
    }
  }
}

const NOUN_ADJ = /(?<![\p{L}-])(\p{Ll}[\p{L}-]{2,})\s+(\p{Ll}+)(?![\p{L}-])/gu;
const SKIP_NOUNS = new Set(['contra', 'sobre', 'perante', 'ante', 'desde', 'segundo', 'conforme', 'mediante', 'durante', 'quando', 'onde', 'como', 'ainda', 'apenas', 'somente', 'mais', 'menos', 'muito', 'pouco', 'bem', 'que', 'qual', 'sua', 'seu', 'suas', 'seus', 'pela', 'pelo', 'pelas', 'pelos', 'esta', 'este', 'essa', 'esse', 'cada', 'toda', 'todo', 'outra', 'outro', 'mesma', 'mesmo', 'qualquer', 'nos', 'nas', 'dos', 'das', 'aos', 'por', 'com', 'sem', 'sob', 'para', 'entre', 'ser', 'for', 'forem', 'esteja']);

/** Expressões substantivo + adjetivo jurídico, com o adjetivo trocado nas alternativas. */
export function phraseTargets(unit: Unit): (Target & { choices: string[] })[] {
  const out: (Target & { choices: string[] })[] = [];
  const covered: [number, number][] = [];
  for (const match of unit.t.matchAll(NOUN_ADJ)) {
    const [whole, noun, adjective] = match;
    const form = forms.get(fold(adjective));
    if (!form || SKIP_NOUNS.has(fold(noun)) || noun.endsWith('mente') || /(?:ar|er|ir)$/u.test(noun)) continue;
    // O gênero vem do substantivo quando o adjetivo não varia (nacional, federal, penal...).
    const variable = /[oa]s?$/iu.test(adjective);
    const masculine = variable ? /os?$/iu.test(adjective)
      : /(?:os?|or|ores|ão|al|ais|ul|ema|emas)$/iu.test(noun) && !/(?:ção|ções|são|sões|dade|dades|gem|gens)$/iu.test(noun);
    const plural = /s$/iu.test(noun) || form.plural;
    const choices = form.group.map((fem) => inflect(fem, plural, masculine)).filter((adj) => fold(adj) !== fold(adjective))
      .map((adj) => `${noun} ${adj}`).slice(0, 4);
    if (choices.length < 2) continue;
    out.push({ text: whole, start: match.index, dim: 'literal', kind: 'regra', priority: 3, choices });
    covered.push([match.index, match.index + whole.length]);
  }
  // Adjetivos sozinhos dos mesmos grupos ("praticados por brasileiro" → estrangeiro, nacional...).
  for (const match of unit.t.matchAll(/(?<![\p{L}-])\p{Ll}+(?![\p{L}-])/gu)) {
    const form = forms.get(fold(match[0]));
    if (!form || covered.some(([a, b]) => match.index >= a && match.index < b)) continue;
    // "ninguém será privado de direitos": particípio verbal, não adjetivo de classificação.
    const before = unit.t.slice(Math.max(0, match.index - 12), match.index);
    const after = unit.t.slice(match.index + match[0].length, match.index + match[0].length + 5);
    if (/\b(?:é|são|será|serão|foi|for|ser|sendo|seja|sejam|está|estar|ficar|fica)\s+$/iu.test(before) || /^\s+d[aoe]s?\b/iu.test(after)) continue;
    const choices = form.group.map((fem) => inflect(fem, form.plural, form.masculine)).filter((adj) => fold(adj) !== fold(match[0])).slice(0, 4);
    if (choices.length >= 2) out.push({ text: match[0], start: match.index, dim: 'literal', kind: 'regra', priority: 2, choices });
  }
  return out;
}

/** Palavras que, sozinhas, não testam conhecimento da lei. */
const GENERIC = new Set(['nao', 'tambem', 'e', 'sao', 'sera', 'serao', 'foi', 'ser', 'ha', 'ter', 'tem', 'esta', 'estao',
  'o', 'a', 'os', 'as', 'um', 'uma', 'lei', 'leis', 'crime', 'crimes', 'caso', 'casos', 'agente', 'agentes', 'fato', 'fatos', 'pais', 'brasil',
  'seguinte', 'seguintes', 'disposto', 'artigo', 'artigos', 'forma', 'pessoa', 'pessoas', 'modo', 'termos', 'termo', 'hipotese',
  'hipoteses', 'presente', 'respectivo', 'respectiva', 'referido', 'referida', 'mesmo', 'mesma', 'anterior', 'deste', 'desta', 'ainda']);

export const isGenericTarget = (text: string) => GENERIC.has(fold(text));

const FUNCTION_WORDS = new Set(['nao', 'pode', 'podem', 'depende', 'deve', 'devem', 'sempre', 'tambem', 'contra', 'sera', 'serao', 'ha', 'foi', 'sao', 'esta', 'como', 'mais', 'menos', 'ja']);
const NOUN_SUFFIX = /(?:ção|ções|são|sões|dade|dades|ncia|ncias|gem|gens|ura|uras|mento|mentos|ismo|tude|ez)$/iu;
const INFINITIVE = /(?:ar|er|ir|or)(?:-\p{L}+)?$/iu;
const PARTICIPLE = /(?:ad|id)[oa]s?$/iu;
const ADJECTIVE = /(?:al|ais|ente|entes|ante|antes|iv[oa]s?|ic[oa]s?|ári[oa]s?|os[oa]s?|vel|veis)$/iu;

const isCapitalized = (text: string) => /^\p{Lu}/u.test(text);
const plural = (word: string) => /s$/iu.test(word) && word.length > 3 && !/(?:ês|ás|ós|ís|us|is)$/iu.test(word);

/**
 * A alternativa tem a mesma forma da resposta? Evita alternativas que se denunciam pela
 * classe da palavra (verbo no lugar de substantivo), pelo número ou pela maiúscula.
 */
export function fitsTarget(target: string, choice: string, sentenceStart = false, strict = false) {
  const t = target.trim(), c = choice.trim();
  if (!c || fold(c) === fold(t)) return false;
  const single = !/\s/u.test(t) && /^\p{L}[\p{L}-]*$/u.test(t);
  if (!sentenceStart && /^\p{L}/u.test(t) && /^\p{L}/u.test(c) && isCapitalized(t) !== isCapitalized(c)) return false;
  if (!single) return true;
  const foldedTarget = fold(t);
  if (!FUNCTION_WORDS.has(foldedTarget) && FUNCTION_WORDS.has(fold(c))) return false;
  if (/\s/u.test(c)) return true; // locuções (ex.: "a pedido de") são avaliadas pelo banco de contrastes
  if (NOUN_SUFFIX.test(t) && (INFINITIVE.test(c) || PARTICIPLE.test(c) || /mente$/iu.test(c))) return false;
  // Alternativas geradas (não revisadas) para substantivos abstratos precisam ser substantivos abstratos.
  if (strict && NOUN_SUFFIX.test(t) && !NOUN_SUFFIX.test(c)) return false;
  if (strict && !ADJECTIVE.test(t) && !PARTICIPLE.test(t) && ADJECTIVE.test(c)) return false;
  if (PARTICIPLE.test(t) && !PARTICIPLE.test(c) && !/[oa]s?$/iu.test(c)) return false;
  if (PARTICIPLE.test(t) && NOUN_SUFFIX.test(c)) return false;
  if (INFINITIVE.test(t) && !NOUN_SUFFIX.test(t) && !INFINITIVE.test(c) && t.length > 4) return false;
  if (/mente$/iu.test(t) !== /mente$/iu.test(c)) return false;
  if (/vel$|veis$/iu.test(t) !== /vel$|veis$/iu.test(c)) return false;
  if (plural(t) !== plural(c) && !/\d/u.test(c)) return false;
  return true;
}
