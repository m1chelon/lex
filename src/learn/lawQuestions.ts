import type { Article, LawDoc, Unit } from '../core/types';
import { buildRead, canTrainArticle, clozeStem, contextualAlternatives, findTargets, literalPrompt, unitContext, unitPath, whereOf, type Exercise, type Target } from './generators';
import { contextualTargets, hasProvisionText, provisionUnits, relatedProvisions, shortAnswer, type QuestionTarget } from './provisions';
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
cpp.240.p1|fundadas razões|fundadas suspeitas|indícios razoáveis|informações anônimas|alegações verossímeis
cpp.240.p1|autorizarem|recomendarem|exigirem|limitarem
cpp.240.p2|fundada suspeita|informação anônima|dúvida razoável|mera suspeita|denúncia formal
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
const overlap = (a: Target, b: Target) => a.start < b.start + b.text.length && b.start < a.start + a.text.length;

function exactTarget(unit: Unit, answer: string, choices: string[], priority: number): Target | undefined {
  const start = unit.t.indexOf(answer);
  if (start < 0 || unit.t.indexOf(answer, start + answer.length) >= 0) return;
  return { text: answer, start, choices, dim: 'literal', priority };
}

const cachedTargets = new WeakMap<LawDoc, WeakMap<Unit, QuestionTarget[]>>();

export function questionTargets(law: LawDoc, unit: Unit): QuestionTarget[] {
  let byUnit = cachedTargets.get(law);
  if (!byUnit) {
    byUnit = new WeakMap();
    cachedTargets.set(law, byUnit);
  }
  const cached = byUnit.get(unit);
  if (cached) return cached;
  if (!hasProvisionText(unit) || unit.k === 'pena') return [];
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
    if (!shortAnswer(target.text) || positions.has(point) || (target.priority !== 6 && authored.some((entry) => overlap(entry, target)))) return [];
    const choices = contextualAlternatives(law, target, unit.t).filter(shortAnswer);
    if (!choices.length) return [];
    positions.add(point);
    return [{ target, choices }];
  });
  byUnit.set(unit, targets);
  return targets;
}

const importance = ({ target }: QuestionTarget) => target.amount ? 7 : target.priority ?? 0;

function sanctionTargets(unit: Unit): QuestionTarget[] {
  const amounts: QuestionTarget[] = findLegalAmounts(unit.t).map((amount) => ({
    target: { text: amount.text, start: amount.start, dim: 'penas', amount, priority: 4 },
    choices: amountAlternatives(amount),
  }));
  const species = /\b(?:reclusão|detenção|prisão simples)\b/iu.exec(unit.t);
  if (species) amounts.unshift({
    target: { text: species[0], start: species.index, dim: 'penas' },
    choices: ['reclusão', 'detenção', 'prisão simples'].filter((kind) => fold(species[0]) !== fold(kind)),
  });
  return amounts.filter(({ target, choices }) => shortAnswer(target.text) && choices.length);
}

const mainTargets = (law: LawDoc, unit: Unit) => unit.k === 'pena' ? sanctionTargets(unit) : questionTargets(law, unit);

export function pickProvisionTarget(law: LawDoc, art: Article, unit: Unit, choicesNeeded = 1): QuestionTarget | undefined {
  if (!canTrainArticle(art) || !hasProvisionText(unit)) return;
  const main = [...mainTargets(law, unit)].sort((a, b) => importance(b) - importance(a));
  const suitable = main.find(({ choices }) => choices.length >= choicesNeeded);
  return suitable ?? contextualTargets(law, art, unit).find(({ choices }) => choices.length >= choicesNeeded);
}

function briefStem(art: Article, unit: Unit, target: Target) {
  const [label, before, blank, after] = clozeStem(art, unit, [target]);
  const words = (text: string) => text.match(/\S+/gu) ?? [];
  const head = words(before.t);
  const tail = words(after.t);
  const room = Math.max(12, 36 - words(label.t).length - words(blank.t).length);
  if (head.length + tail.length <= room) return [label, before, blank, after];
  const left = Math.min(head.length, Math.max(Math.floor(room / 3), room - tail.length));
  const right = room - left;
  return [
    label,
    head.length > left ? { t: '… ' + head.slice(-left).join(' ') + ' ' } : before,
    blank,
    tail.length > right ? { t: ' ' + tail.slice(0, right).join(' ') + ' …' } : after,
  ];
}

export function buildMemory(law: LawDoc, art: Article, unit: Unit, stage: number, seed: string, quick = false): Exercise | null {
  if (!canTrainArticle(art) || !hasProvisionText(unit)) return null;
  const r = rng(`lacunas:${unit.id}:${seed}`);
  const main = mainTargets(law, unit);
  const candidates = shuffle(main, r).sort((a, b) => importance(b) - importance(a));
  const chosen: QuestionTarget[] = [];
  const select = (possible: QuestionTarget[], limit: number) => {
    for (const entry of possible) {
      if (chosen.length >= limit) break;
      if (!chosen.some(({ target }) => overlap(target, entry.target) || normAnswer(target.text) === normAnswer(entry.target.text))) chosen.push(entry);
    }
  };
  select(candidates, quick ? 1 : 3);
  const minimum = quick ? 1 : 2;
  if (chosen.length < minimum) select(contextualTargets(law, art, unit), minimum);
  if (!chosen.length) return null;
  const dim = unit.k === 'pena' ? 'penas' : main.length && main.every(({ target }) => target.dim === 'prazos') ? 'prazos' : 'literal';
  const key = `L:${unit.id}:${dim}`;
  const base = { key, lawId: law.id, articleId: art.id, unitId: unit.id, dim: dim as Target['dim'], family: 'literal' as const,
    stage, where: whereOf(law, art, unit), priority: chosen[0].target.priority };
  if (quick) {
    const [{ target, choices }] = chosen;
    const options = shuffle([{ id: 'ok', text: target.text, correct: true },
      ...choices.slice(0, 3).map((text, i) => ({ id: `d${i}`, text, correct: false }))], r);
    return { ...base, stem: briefStem(art, unit, target), kind: 'cloze-mc', prompt: literalPrompt(target), answer: target.text, options, expectedMs: 10_000 };
  }
  const companion = chosen.length < minimum ? companionFor(law, art, unit, chosen[0].target) : undefined;
  if (chosen.length < minimum && !companion) return null;
  chosen.sort((a, b) => a.target.start - b.target.start);
  const stem = clozeStem(art, unit, chosen.map(({ target }) => target));
  if (companion) {
    const extraStem = clozeStem(companion.art, companion.unit, [companion.extra.target]);
    extraStem[0].t = unitPath(companion.art, companion.unit) + ' ';
    stem.push({ t: '\n\n' }, ...extraStem);
    chosen.push(companion.extra);
  }
  const blanks = chosen.map(({ target, choices }) => ({
    answer: target.text,
    options: shuffle([target.text, ...choices.slice(0, 4)], r),
  }));
  return { ...base, stem, context: companion ? undefined : unitContext(art, unit), kind: 'cloze-multi', blanks, companionUnitId: companion?.unit.id,
    prompt: unit.k === 'pena' && !companion ? 'Complete os elementos da sanção.' : prompts[Math.floor(r() * prompts.length)], answer: blanks.map(({ answer }) => answer).join(' | '),
    expectedMs: blanks.length * 12_000 };
}

function companionFor(law: LawDoc, art: Article, unit: Unit, answered: Target) {
  const excluded = normAnswer(answered.text);
  for (const part of relatedProvisions(law, art, unit)) {
    if ((unit.k === 'pena') !== (part.unit.k === 'pena')) continue;
    const different = ({ target }: QuestionTarget) => normAnswer(target.text) !== excluded;
    const extra = mainTargets(law, part.unit).find(different) ?? contextualTargets(law, part.art, part.unit).find(different);
    if (extra) return { ...part, extra };
  }
}

export function buildPenaltyQuestion(law: LawDoc, art: Article, unit: Unit, seed: string): Exercise | null {
  return unit.k === 'pena' ? buildMemory(law, art, unit, 1, seed) : null;
}

export function buildProvisionTyped(law: LawDoc, art: Article, unit: Unit, stage: number): Exercise | null {
  const pick = pickProvisionTarget(law, art, unit);
  if (!pick) return null;
  const { target } = pick;
  return { key: `L:${unit.id}:${target.dim}`, kind: 'cloze-type', family: 'literal', dim: target.dim,
    lawId: law.id, articleId: art.id, unitId: unit.id, where: whereOf(law, art, unit), stage,
    prompt: literalPrompt(target), stem: clozeStem(art, unit, [target]), context: unitContext(art, unit),
    answer: target.text, expectedMs: 25_000, priority: target.priority };
}

export function buildGuidedRead(law: LawDoc, art: Article) {
  const focus = provisionUnits(art).flatMap((unit) => {
    const pick = pickProvisionTarget(law, art, unit);
    return pick ? [{ unitId: unit.id, text: pick.target.text }] : [];
  });
  return { ...buildRead(law, art), prompt: focus.length
    ? 'Leia o artigo e repare nos pontos destacados.'
    : 'Leia o artigo e identifique a regra e a quem ela se aplica.',
    readingFocus: focus, expectedMs: Math.max(15_000, Math.min(100_000, art.units.reduce((sum, unit) => sum + unit.t.length, 0) * 55)) };
}
