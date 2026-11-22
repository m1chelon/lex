import type { Article, LawDoc, Unit } from '../core/types';
import { buildRead, canTrainArticle, clozeStem, contextualAlternatives, findTargets, unitContext, whereOf, type Exercise, type Target } from './generators';
import { legalContrastsOf } from './synonyms';
import { amountAlternatives, findLegalAmounts } from './thresholds';
import { fold, normAnswer, rng, shuffle } from './text';

const REVIEWED = `
cf.1.cpt|união indissolúvel|união dissolúvel|associação confederativa|aliança federativa
cf.1.cpt|Estado democrático de direito|Estado unitário de direito|Estado democrático de fato|Estado confederado de direito
cf.1.pu|representantes eleitos|representantes nomeados|delegados designados|representantes concursados
cf.1.pu|diretamente|indiretamente|subsidiariamente|mediante delegação
cp.3.cpt|excepcional|especial|ordinária|complementar
cp.3.cpt|temporária|permanente|transitória|supletiva
cp.3.cpt|durante|antes de|depois de|fora de
cp.293.cpt|Falsificar|Adulterar|Suprimir|Utilizar
cp.293.cpt|fabricando-os|importando-os|adquirindo-os|recebendo-os
cp.293.cpt|alterando-os|ocultando-os|destruindo-os|transportando-os
cp.293.i1|controle tributário|controle aduaneiro|registro administrativo|controle postal
cp.293.i1|arrecadação|fiscalização|restituição|compensação
l12850.1.p1|estruturalmente ordenada|eventualmente reunida|hierarquicamente subordinada|formalmente registrada
l12850.1.p1|divisão de tarefas|identidade de funções|subordinação funcional|alternância de funções
l12850.1.p1|transnacional|interestadual|intermunicipal|regional
res850.9.i1|processamentos digitais|processamentos físicos|atendimentos presenciais|atividades externas|audiências presenciais
res850.9.i2|imediatamente superior|imediatamente inferior|mais próximo|exatamente igual
res850.9.i2|Presidência do Tribunal de Justiça|Corregedoria Geral da Justiça|Vice-Presidência do Tribunal|Presidência da Seção
res850.9.i3|gabinetes|cartórios|juizados especiais|secretarias
res850.9.i3|imediatamente superior|imediatamente inferior|mais próximo|exatamente igual
ritjsp.10.p1|convocar|realizar|homologar|anular
cf.5.i54|devido processo legal|contraditório|juízo natural|duplo grau de jurisdição
cf.5.i54|liberdade|cidadania|nacionalidade|intimidade
cpc.300.cpt|probabilidade do direito|certeza do direito|verossimilhança dos fatos|prova incontroversa
cpc.300.cpt|perigo de dano|dano consumado|risco abstrato|prejuízo irreversível
cpp.312.cpt|ordem pública|segurança nacional|ordem tributária|segurança jurídica
cpp.312.cpt|instrução criminal|execução provisória|investigação preliminar|instrução civil
`.trim().split('\n');

const reviewed = new Map<string, string[][]>();
for (const line of REVIEWED) {
  const [id, ...parts] = line.split('|');
  reviewed.set(id, [...reviewed.get(id) ?? [], parts]);
}

const prompts = [
  'Escolha os termos que completam o dispositivo.',
  'Preencha as lacunas com a redação exata da lei.',
  'Complete os trechos destacados.',
];
const short = (value: string) => value.length <= 42 && (value.replace(/\([^()]*\)/gu, '').trim().match(/\S+/g)?.length ?? 0) <= 4;
const overlap = (a: Target, b: Target) => a.start < b.start + b.text.length && b.start < a.start + a.text.length;

function exactTarget(unit: Unit, answer: string, choices: string[], priority: number): Target | undefined {
  const start = unit.t.indexOf(answer);
  if (start < 0 || unit.t.indexOf(answer, start + answer.length) >= 0) return;
  return { text: answer, start, choices, dim: 'literal', priority };
}

type QuestionTarget = { target: Target; choices: string[] };
const cachedTargets = new WeakMap<LawDoc, WeakMap<Unit, QuestionTarget[]>>();

export function questionTargets(law: LawDoc, unit: Unit): QuestionTarget[] {
  let byUnit = cachedTargets.get(law);
  if (!byUnit) {
    byUnit = new WeakMap();
    cachedTargets.set(law, byUnit);
  }
  const cached = byUnit.get(unit);
  if (cached) return cached;
  if (unit.rev || !unit.t || unit.k === 'pena') return [];
  const authored = (reviewed.get(unit.id) ?? []).flatMap(([answer, ...choices]) => exactTarget(unit, answer, choices, 6) ?? []);
  const extracted = findTargets(unit).filter((target) => target.kind !== 'pena');
  const additional = [...unit.t.matchAll(/[\p{L}][\p{L}-]+/gu)].flatMap((match): Target[] => {
    const choices = [...legalContrastsOf(match[0])];
    if (choices.length < 2 || choices.some((choice) => /\d/.test(choice)) || /^(?:pode|podem|poderao?|dois|duas|tres|seis|quinze|noventa|metade)$/u.test(fold(match[0]))) return [];
    return [{ text: match[0], start: match.index, dim: 'literal', choices, priority: 1 }];
  });
  const inlineSanction = /(?:^|[.;–:]\s*)(?:Pena\s*[-–:]|reclusão,\s*de |detenção,\s*de )|\b(?:incorre|incorrerá)\s+na\s+pena\s+de\b/iu.exec(unit.t);
  const candidates = [...authored, ...extracted, ...additional].filter((target) => !inlineSanction || target.start < inlineSanction.index);
  const positions = new Set<string>();
  const targets = candidates.flatMap((target) => {
    const point = `${target.start}:${target.text}`;
    if (!short(target.text) || positions.has(point) || (target.priority !== 6 && authored.some((entry) => overlap(entry, target)))) return [];
    const choices = contextualAlternatives(law, target, unit.t).filter(short);
    if (!choices.length) return [];
    positions.add(point);
    return [{ target, choices }];
  });
  byUnit.set(unit, targets);
  return targets;
}

const importance = ({ target }: QuestionTarget) => target.amount ? 7 : target.priority ?? 0;

export function buildMemory(law: LawDoc, art: Article, unit: Unit, stage: number, seed: string, quick = false): Exercise | null {
  if (!canTrainArticle(art) || unit.rev || !unit.t) return null;
  const r = rng(`lacunas:${unit.id}:${seed}`);
  const candidates = shuffle(questionTargets(law, unit), r)
    .sort((a, b) => importance(b) - importance(a));
  const chosen: typeof candidates = [];
  for (const entry of candidates) {
    if (chosen.some(({ target }) => overlap(target, entry.target) || normAnswer(target.text) === normAnswer(entry.target.text))) continue;
    chosen.push(entry);
    if (chosen.length === (quick ? 1 : 3)) break;
  }
  if (chosen.length < (quick ? 1 : 2)) return null;
  const dim = candidates.every(({ target }) => target.dim === 'prazos') ? 'prazos' : 'literal';
  const key = `L:${unit.id}:${dim}`;
  const base = { key, lawId: law.id, articleId: art.id, unitId: unit.id, dim: dim as Target['dim'], family: 'literal' as const,
    stage, where: whereOf(law, art, unit), priority: chosen[0].target.priority };
  chosen.sort((a, b) => a.target.start - b.target.start);
  const stem = clozeStem(art, unit, chosen.map(({ target }) => target));
  if (quick) {
    const [{ target, choices }] = chosen;
    const options = shuffle([{ id: 'ok', text: target.text, correct: true },
      ...choices.slice(0, 3).map((text, i) => ({ id: `d${i}`, text, correct: false }))], r);
    return { ...base, stem, kind: 'cloze-mc', prompt: prompts[Math.floor(r() * prompts.length)], answer: target.text, options, expectedMs: 10_000 };
  }
  const blanks = chosen.map(({ target, choices }) => ({
    answer: target.text,
    options: shuffle([target.text, ...choices.slice(0, 4)], r),
  }));
  return { ...base, stem, context: unitContext(art, unit), kind: 'cloze-multi', blanks,
    prompt: prompts[Math.floor(r() * prompts.length)], answer: blanks.map(({ answer }) => answer).join(' | '),
    expectedMs: blanks.length * 12_000 };
}

export function buildPenaltyQuestion(law: LawDoc, art: Article, unit: Unit, seed: string): Exercise | null {
  if (!canTrainArticle(art) || unit.rev || unit.k !== 'pena') return null;
  const r = rng(`pena:${unit.id}:${seed}`);
  const amounts = findLegalAmounts(unit.t);
  const candidates = amounts.map((amount) => ({
    target: { text: amount.text, start: amount.start, dim: 'penas' as const },
    choices: amountAlternatives(amount).slice(0, 3),
  }));
  const species = /\b(?:reclusão|detenção|prisão simples)\b/iu.exec(unit.t);
  if (species) {
    const kinds = ['reclusão', 'detenção', 'prisão simples'].filter((kind) => fold(species[0]) !== kind);
    candidates.unshift({ target: { text: species[0], start: species.index, dim: 'penas' }, choices: kinds });
  }
  const chosen = candidates.filter(({ target, choices }) => short(target.text) && choices.length).slice(0, 3);
  if (chosen.length < 2) return null;
  const blanks = chosen.map(({ target, choices }) => ({ answer: target.text, options: shuffle([target.text, ...choices], r) }));
  return { key: `L:${unit.id}:penas`, kind: 'cloze-multi', dim: 'penas', family: 'literal',
    lawId: law.id, articleId: art.id, unitId: unit.id, where: whereOf(law, art, unit), stage: 1,
    prompt: 'Complete os elementos da sanção.', stem: clozeStem(art, unit, chosen.map(({ target }) => target)),
    context: unitContext(art, unit), blanks, answer: blanks.map(({ answer }) => answer).join(' | '), expectedMs: 32_000 };
}

export function buildGuidedRead(law: LawDoc, art: Article) {
  const focus = art.units.flatMap((unit) => questionTargets(law, unit).filter(({ target }) => (target.priority ?? 0) >= 3)
    .slice(0, 2).map(({ target }) => ({ unitId: unit.id, text: target.text })));
  return { ...buildRead(law, art), prompt: focus.length
    ? 'Leia o artigo e repare nos pontos destacados.'
    : 'Leia o artigo e identifique a regra e a quem ela se aplica.',
    readingFocus: focus.slice(0, 8), expectedMs: Math.max(15_000, Math.min(100_000, art.units.reduce((sum, unit) => sum + unit.t.length, 0) * 55)) };
}
