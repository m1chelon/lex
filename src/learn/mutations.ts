// Alterações pequenas e localizadas. A correção identifica o trecho trocado.
import type { LawDoc, Unit } from '../core/types';
import type { Dim } from '../data/db';
import { contextualAlternatives, findTargets } from './generators';
import { normAnswer, rng, shuffle } from './text';

export interface Mutation {
  text: string; from: string; to: string; kind: 'sentido' | 'literal'; note: string;
  priority?: number; dim?: Dim;
}

function uniqueMutations(original: string, mutations: Mutation[]) {
  const seen = new Set([normAnswer(original)]);
  return mutations.filter((mutation) => {
    const key = normAnswer(mutation.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function meaningMutations(law: LawDoc, u: Unit, seed: string): Mutation[] {
  const r = rng(seed);
  const changes = findTargets(u).flatMap((target): Mutation[] => {
    const choices = contextualAlternatives(law, target, u.t).slice(0, 4);
    return shuffle(choices, r).map((to) => ({
      text: u.t.slice(0, target.start) + to + u.t.slice(target.start + target.text.length),
      from: target.text, to, kind: 'sentido', dim: target.dim, priority: target.priority,
      note: `O dispositivo estabelece “${target.text}”. A alternativa troca esse trecho por “${to}”.`,
    }));
  });
  return uniqueMutations(u.t, changes);
}
