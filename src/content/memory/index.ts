import type { Dim } from '../../data/db';
import { CONSTITUTION_MEMORY } from './constitucional';
import { STATUTE_MEMORY } from './estatutos';
import { GENERAL_MEMORY } from './geral';
import { PROCEDURE_MEMORY } from './processo-civil';
import { PENAL_MEMORY } from './processo-penal';
import { TJSP_MEMORY } from './tjsp';
import { TJMS_MEMORY } from './tjms';

const dimensions = { L: 'literal', T: 'prazos', P: 'penas', E: 'excecoes' } as const satisfies Record<string, Dim>;
type MemoryDimension = keyof typeof dimensions;

export interface MemorySpec {
  unitId: string;
  dim: (typeof dimensions)[MemoryDimension];
  prompt: string;
  answer: string;
  choices: string[];
}

// Cada linha liga uma pergunta e seus distratores a uma passagem exata de um dispositivo vigente.
const curricula = [TJSP_MEMORY, TJMS_MEMORY, CONSTITUTION_MEMORY, STATUTE_MEMORY, PROCEDURE_MEMORY, PENAL_MEMORY, GENERAL_MEMORY];
export const MEMORY_SPECS: MemorySpec[] = curricula.flatMap((source) =>
  source.trim().split('\n').filter((line) => line && !line.startsWith('#')).map((line) => {
    const [unitId, dimension, prompt, answer, ...choices] = line.split('|').map((part) => part.trim());
    const dim = dimensions[dimension as MemoryDimension];
    if (!unitId || !dim || !prompt || !answer || choices.length < 3 || choices.some((choice) => !choice)) {
      throw new Error(`Lacuna de memorização inválida em ${unitId}.`);
    }
    return { unitId, dim, prompt, answer, choices };
  }));

const byUnit = new Map<string, MemorySpec[]>();
for (const spec of MEMORY_SPECS) {
  const specs = byUnit.get(spec.unitId) ?? [];
  specs.push(spec);
  byUnit.set(spec.unitId, specs);
}

export const memorySpecsFor = (unitId: string): readonly MemorySpec[] => byUnit.get(unitId) ?? [];
