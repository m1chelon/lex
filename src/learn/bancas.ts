// Formatos típicos das bancas, gerados a partir do texto oficial.
// - CEBRASPE: itens Certo/Errado com as armadilhas mais frequentes (troca de modal, regra que vira
//   faculdade, proibição que vira permissão e ressalva suprimida para tornar a regra absoluta).
// - FGV e VUNESP: julgamento de assertivas (I, II e III) com as combinações nas alternativas.
// Toda alteração é pequena, localizada e explicada, e o texto oficial acompanha a correção.
import type { Article, LawDoc, Unit } from '../core/types';
import { unitPath } from './generators';
import type { Mutation } from './mutations';
import { meaningMutations } from './mutations';
import { provisionUnits } from './provisions';
import { rng, shuffle } from './text';

type Swap = { re: RegExp; to: string; why: string };

// Pares de sentido oposto: trocar um pelo outro sempre torna o item errado.
const SWAPS: Swap[] = [
  { re: /(?<!\p{L})deverá(?!\p{L})/u, to: 'poderá', why: 'O dispositivo impõe um dever (“deverá”). O item transforma o dever em mera faculdade.' },
  { re: /(?<!\p{L})deverão(?!\p{L})/u, to: 'poderão', why: 'O dispositivo impõe um dever (“deverão”). O item transforma o dever em mera faculdade.' },
  { re: /(?<!\p{L})poderá(?!\p{L})/u, to: 'deverá', why: 'O dispositivo prevê uma faculdade (“poderá”). O item a transforma em obrigação.' },
  { re: /(?<!\p{L})poderão(?!\p{L})/u, to: 'deverão', why: 'O dispositivo prevê uma faculdade (“poderão”). O item a transforma em obrigação.' },
  { re: /(?<!\p{L})é vedad([oa])(?!\p{L})/u, to: 'é permitid$1', why: 'O dispositivo proíbe a conduta. O item a apresenta como permitida.' },
  { re: /(?<!\p{L})são vedad([oa]s)(?!\p{L})/u, to: 'são permitid$1', why: 'O dispositivo proíbe as condutas. O item as apresenta como permitidas.' },
  { re: /(?<!\p{L})não poderá(?!\p{L})/u, to: 'poderá', why: 'O dispositivo nega a possibilidade (“não poderá”). O item a afirma.' },
  { re: /(?<!\p{L})não será(?!\p{L})/u, to: 'será', why: 'O dispositivo nega a consequência (“não será”). O item a afirma.' },
  { re: /(?<!\p{L})independentemente de(?!\p{L})/u, to: 'mediante', why: 'O dispositivo dispensa a condição (“independentemente de”). O item passa a exigi-la.' },
  { re: /(?<!\p{L})obrigatoriamente(?!\p{L})/u, to: 'facultativamente', why: 'O dispositivo torna a providência obrigatória. O item a torna facultativa.' },
  { re: /(?<!\p{L})somente(?!\p{L})/u, to: 'preferencialmente', why: 'O dispositivo restringe a hipótese (“somente”). O item a transforma em simples preferência.' },
  { re: /(?<!\p{L})apenas(?!\p{L})/u, to: 'preferencialmente', why: 'O dispositivo restringe a hipótese (“apenas”). O item a transforma em simples preferência.' },
  { re: /(?<!\p{L})exclusivamente(?!\p{L})/u, to: 'preferencialmente', why: 'O dispositivo atribui caráter exclusivo. O item o reduz a preferência.' },
  { re: /(?<!\p{L})de ofício(?!\p{L})/u, to: 'somente a requerimento da parte', why: 'O dispositivo permite atuação de ofício. O item exige provocação da parte.' },
  { re: /(?<!\p{L})maioria absoluta(?!\p{L})/u, to: 'maioria simples', why: 'O dispositivo exige maioria absoluta. O item reduz o quórum para maioria simples.' },
  { re: /(?<!\p{L})dois terços(?!\p{L})/u, to: 'maioria absoluta', why: 'O dispositivo exige dois terços. O item reduz o quórum.' },
  { re: /(?<!\p{L})dias úteis(?!\p{L})/u, to: 'dias corridos', why: 'O dispositivo conta o prazo em dias úteis. O item o converte em dias corridos.' },
];

// Ressalva que, suprimida e substituída por "sem exceção", torna a regra absoluta e o item errado.
// (Para o CEBRASPE, item apenas incompleto não é errado; por isso a ressalva é negada, não só omitida.)
const EXCEPTION = /,\s*(salvo|exceto|ressalvad[oa]s?|a não ser)(?!\p{L})[^;:,]*?(?=[;:,]|\.(?:\s+\p{Lu}|\s*$)|$)/u;

/** "no CPC", "na Lei 9.099/95", "nas NSCGJ": preposição contraída conforme o gênero da norma. */
export function naNorma(short: string) {
  if (/^(NSCGJ|Normas)/u.test(short)) return `nas ${short}`;
  if (/^(Lei|LC|Res|CF|Constitui|LIA|LINDB|LGPD|LEP|Portaria|Instru)/u.test(short)) return `na ${short}`;
  return `no ${short}`;
}

function phrase(text: string) {
  const t = text.trim().replace(/[;:,]$/u, '');
  return /[.!?]$/u.test(t) ? t : t + '.';
}

/** Armadilhas no estilo CEBRASPE para um dispositivo. */
export function cebraspeTraps(unit: Unit): Mutation[] {
  const out: Mutation[] = [];
  for (const swap of SWAPS) {
    const match = swap.re.exec(unit.t);
    if (!match) continue;
    const to = match[0].replace(swap.re, swap.to);
    out.push({ text: unit.t.slice(0, match.index) + to + unit.t.slice(match.index + match[0].length),
      from: match[0], to, kind: 'sentido', dim: 'literal', priority: 2, note: swap.why });
  }
  const exception = EXCEPTION.exec(unit.t);
  if (exception) {
    out.push({ text: unit.t.slice(0, exception.index) + ', sem exceção' + unit.t.slice(exception.index + exception[0].length),
      from: exception[0].replace(/^,\s*/u, ''), to: 'sem exceção', kind: 'sentido', dim: 'excecoes', priority: 3,
      note: `O dispositivo traz a ressalva “${exception[0].replace(/^,\s*/u, '').trim()}”. O item a nega e torna a regra absoluta.` });
  }
  return out;
}

/** Enunciado autônomo do dispositivo: incisos e alíneas levam junto o texto que os introduz. */
export function statementOf(art: Article, unit: Unit, text = unit.t) {
  if (unit.k === 'caput' || unit.k === 'par') return phrase(text);
  const chain: Unit[] = [];
  let parent = unit.parent ? art.units.find((x) => x.id === unit.parent) : art.units.find((x) => x.k === 'caput');
  while (parent) {
    chain.unshift(parent);
    parent = parent.parent ? art.units.find((x) => x.id === parent!.parent) : undefined;
  }
  if (!chain.length) return phrase(text);
  const lead = chain.map((x) => x.t.trim().replace(/[:;,.]$/u, '')).join(': ');
  return phrase(`${lead}: ${text.trim()}`);
}

const COMBOS: [string, boolean[]][] = [
  ['I, apenas.', [true, false, false]],
  ['II, apenas.', [false, true, false]],
  ['III, apenas.', [false, false, true]],
  ['I e II, apenas.', [true, true, false]],
  ['I e III, apenas.', [true, false, true]],
  ['II e III, apenas.', [false, true, true]],
  ['I, II e III.', [true, true, true]],
];

export interface Assertivas {
  id: string; enunciado: string; texto: string; officialText: string;
  options: { id: string; text: string; correct: boolean; why?: string }[];
  mutations: Mutation[];
}

/**
 * Assertivas I, II e III (FGV e VUNESP): o dispositivo sorteado e dois vizinhos da mesma norma.
 * Cada afirmativa é o texto oficial ou uma alteração de sentido; as alternativas trazem combinações.
 */
export function buildAssertivas(law: LawDoc, art: Article, unit: Unit, seed: string): Assertivas | null {
  const r = rng(`assertivas:${unit.id}:${seed}`);
  // Textos que só introduzem incisos ("…as seguintes modificações:") não formam afirmativa autônoma.
  const usable = (u: Unit) => u.k !== 'pena' && !/:\s*$/u.test(u.t);
  const own = provisionUnits(art).filter((u) => u.id !== unit.id && usable(u));
  const index = law.articles.findIndex((a) => a.id === art.id);
  const near = [law.articles[index + 1], law.articles[index - 1], law.articles[index + 2]]
    .filter((a): a is Article => !!a).flatMap((a) => provisionUnits(a).filter(usable).map((u) => ({ art: a, unit: u })));
  const withChanges = (part: { art: Article; unit: Unit }, i: number) =>
    ({ ...part, changes: [...cebraspeTraps(part.unit), ...meaningMutations(law, part.unit, `${seed}:${i}`)] });
  // Vizinhos com alteração possível vêm primeiro, para a questão sempre exigir julgamento.
  const peers = [...shuffle(own, r).map((u) => ({ art, unit: u })), ...shuffle(near, r)].slice(0, 10)
    .map((part, i) => withChanges(part, i + 1))
    .sort((a, b) => Number(!!b.changes.length) - Number(!!a.changes.length));
  const statements = [withChanges({ art, unit }, 0), ...peers.slice(0, 2)];
  if (statements.length < 3) return null;
  // Pelo menos uma afirmativa correta e uma incorreta, para que a questão exija julgar cada item.
  let truth = statements.map((s) => !s.changes.length || r() < 0.5);
  if (truth.every(Boolean)) {
    const changeable = statements.map((s, i) => s.changes.length ? i : -1).filter((i) => i >= 0);
    if (!changeable.length) return null;
    truth = truth.map((t, i) => i === changeable[Math.floor(r() * changeable.length)] ? false : t);
  }
  if (truth.every((t) => !t)) truth[0] = true;
  const used: Mutation[] = [];
  const lines = statements.map((s, i) => {
    if (truth[i]) return statementOf(s.art, s.unit);
    const change = s.changes[Math.floor(r() * s.changes.length)];
    used.push(change);
    return statementOf(s.art, s.unit, change.text);
  });
  const roman = ['I', 'II', 'III'];
  const correctLabel = COMBOS.find(([, combo]) => combo.every((v, i) => v === truth[i]))![0];
  const wrong = shuffle(COMBOS.filter(([label]) => label !== correctLabel), r).slice(0, 4);
  const explain = statements.map((s, i) => `${roman[i]} (${unitPath(s.art, s.unit)}): ${truth[i] ? 'correta' : 'incorreta'}.`).join(' ');
  const options = shuffle([
    { id: 'ok', text: correctLabel, correct: true, why: explain + (used.length ? ' ' + used.map((m) => m.note).join(' ') : '') },
    ...wrong.map(([label], i) => ({ id: `c${i}`, text: label, correct: false })),
  ], r);
  return {
    id: `S:${unit.id}:III`,
    enunciado: `Considere as afirmativas a seguir, com base ${naNorma(law.short)}. Está correto o que se afirma em`,
    texto: lines.map((line, i) => `${roman[i]}. ${line}`).join('\n'),
    officialText: statements.map((s, i) => `${roman[i]}. ${unitPath(s.art, s.unit)}: ${s.unit.t}`).join('\n'),
    options, mutations: used,
  };
}
