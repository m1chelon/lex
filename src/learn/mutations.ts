// Alterações pequenas e localizadas. A correção identifica o trecho trocado.
import type { LawDoc, Unit } from '../core/types';
import { contextualAlternatives, findTargets, lexicalChanges } from './generators';
import { normAnswer, rng, shuffle } from './text';

export interface Mutation { text: string; from: string; to: string; kind: 'sentido' | 'literal'; note: string }

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
  const out: Mutation[] = lexicalChanges(u.t, true).map((change) => ({
    ...change, kind: 'sentido', note: `Trocou-se “${change.from}” por “${change.to}”.`,
  }));
  for (const target of findTargets(u)) {
    if (target.dim !== 'prazos' && target.dim !== 'penas') continue;
    const label = target.dim === 'prazos' ? 'O prazo correto é' : 'A pena correta é';
    for (const to of shuffle(contextualAlternatives(law, target), r).slice(0, 3)) {
      out.push({
        text: u.t.slice(0, target.start) + to + u.t.slice(target.start + target.text.length),
        from: target.text, to, kind: 'sentido', note: `${label} “${target.text}”, não “${to}”.`,
      });
    }
  }
  return uniqueMutations(u.t, out);
}

export function literalMutations(u: Unit): Mutation[] {
  return uniqueMutations(u.t, lexicalChanges(u.t).map((change) => ({
    ...change, kind: 'literal', note: `A lei diz “${change.from}”, não “${change.to}”.`,
  })));
}
