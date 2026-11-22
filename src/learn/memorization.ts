import { memorySpecsFor } from '../content/memory';
import type { Article, LawDoc, Unit } from '../core/types';
import { buildTargetChoices, canTrainArticle, contextualAlternatives, findTargets, type Target } from './generators';
import { fold, hashStr, normAnswer, rng } from './text';

export interface MemoryPoint {
  key: string;
  fingerprint: string;
  target: Target;
  choices: string[];
  prompt?: string;
}

const LEGAL_TERMS = /^(?:citacao|intimacao|reclusao|detencao|maioria|unanimidade|soberania|dolo|culpa|dolosas?|culposas?|impedimento|suspeicao|exoneracao|demissao|suspensao|advertencia|repreensao|penhora|arresto|tutela|curatela|nulidade|testamento|legado|jurisdicao|competencia|domicilio|aposentadoria)$/;

function isSubstantive(target: Target) {
  // Contrastes em verbos modais, adjetivos soltos e conectivos entram apenas se revisados para o dispositivo.
  return target.kind === 'regra' && (LEGAL_TERMS.test(fold(target.text)) || /[ -]/.test(target.text));
}

function overlaps(a: Target, b: Target) {
  return a.start < b.start + b.text.length && b.start < a.start + a.text.length;
}

type Candidate = Pick<MemoryPoint, 'target' | 'choices' | 'prompt'>;
const byArticle = new WeakMap<Article, Map<Unit, MemoryPoint[]>>();

export function memoryPoints(law: LawDoc, art: Article, unit: Unit): readonly MemoryPoint[] {
  if (!canTrainArticle(art) || unit.rev || !unit.t) return [];
  let article = byArticle.get(art);
  if (!article) {
    article = new Map();
    byArticle.set(art, article);
  }
  const cached = article.get(unit);
  if (cached) return cached;
  const extracted = findTargets(unit);
  const authored = memorySpecsFor(unit.id).flatMap((spec): Candidate[] => {
    const start = unit.t.indexOf(spec.answer);
    if (start < 0 || unit.t.indexOf(spec.answer, start + 1) >= 0) return [];
    const existing = extracted.find((target) => target.start === start && target.text === spec.answer);
    const target: Target = { ...existing, text: spec.answer, start, dim: spec.dim, priority: existing?.amount ? 6 : 5 };
    return [{ target, prompt: spec.prompt, choices: spec.choices }];
  });
  const quantities = extracted.filter((target) => target.amount || target.kind === 'pena');
  const selected = authored.length || quantities.length ? quantities : extracted.filter(isSubstantive);
  const automatic = selected.flatMap((target): Candidate[] => {
    if (authored.some((entry) => overlaps(entry.target, target))) return [];
    const start = fold(unit.t).indexOf(fold(target.text));
    if (fold(unit.t).indexOf(fold(target.text), start + target.text.length) >= 0) return [];
    const choices = contextualAlternatives(law, target, unit.t).slice(0, 4);
    return choices.length ? [{ target, choices }] : [];
  });
  const points: MemoryPoint[] = [];
  const identities = new Set<string>();
  const dimensions = new Set<Target['dim']>();
  for (const candidate of [...authored, ...automatic].sort((a, b) =>
    (b.target.priority ?? 0) - (a.target.priority ?? 0) || a.target.start - b.target.start)) {
    const fingerprint = hashStr(normAnswer(candidate.target.text)).toString(36);
    if (identities.has(fingerprint)) continue;
    identities.add(fingerprint);
    const base = `L:${unit.id}:${candidate.target.dim}`;
    // Mantém o cartão anterior do dispositivo. Outros pontos têm revisão independente.
    const key = dimensions.has(candidate.target.dim) ? `${base}:m${fingerprint}` : base;
    dimensions.add(candidate.target.dim);
    points.push({ ...candidate, fingerprint, key });
  }
  article.set(unit, points);
  return points;
}

export function buildMemoryExercise(law: LawDoc, art: Article, unit: Unit, point: MemoryPoint, stage: number, seed: string) {
  const item = buildTargetChoices(law, art, unit, point.target, point.choices, stage, rng(`${point.key}:${seed}`));
  return { ...item, key: point.key, memoryPoint: point.fingerprint, prompt: point.prompt ?? item.prompt };
}
