import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getArticle, initCorpus } from '../src/data/corpus';
import { buildAssertivas, cebraspeTraps, naNorma, statementOf } from '../src/learn/bancas';
import type { Unit } from '../src/core/types';

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus();
});
afterAll(() => vi.unstubAllGlobals());

const unit = (t: string): Unit => ({ id: 'x.1.cpt', k: 'caput', lab: 'Art. 1º', t });

it('gera as armadilhas típicas do CEBRASPE e explica cada troca', () => {
  const traps = cebraspeTraps(unit('O juiz deverá decidir em 10 (dez) dias, salvo motivo justificado, sendo vedada a prorrogação.'));
  const texts = traps.map(({ text }) => text);
  expect(texts).toContain('O juiz poderá decidir em 10 (dez) dias, salvo motivo justificado, sendo vedada a prorrogação.');
  expect(texts).toContain('O juiz deverá decidir em 10 (dez) dias, sem exceção, sendo vedada a prorrogação.');
  expect(traps.every(({ note }) => note.length > 20)).toBe(true);
  expect(cebraspeTraps(unit('A sessão será pública.'))).toEqual([]);
});

it('monta proposições completas para incisos e escolhe a preposição da norma', () => {
  const hit = getArticle('cf.5')!;
  const inciso = hit.art.units.find(({ id }) => id === 'cf.5.i2')!;
  const text = statementOf(hit.art, inciso);
  expect(text.startsWith('Todos são iguais perante a lei')).toBe(true);
  expect(text).toContain('ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei');
  expect(text.endsWith('.')).toBe(true);
  expect(naNorma('CPC')).toBe('no CPC');
  expect(naNorma('CF')).toBe('na CF');
  expect(naNorma('NSCGJ')).toBe('nas NSCGJ');
});

it('cria assertivas I, II e III com uma única combinação correta', () => {
  for (const id of ['cf.5', 'cpc.205', 'cp.312']) {
    const hit = getArticle(id)!;
    const target = hit.art.units.find((u) => u.k === 'caput')!;
    for (const seed of ['a', 'b', 'c', 'd']) {
      const q = buildAssertivas(hit.law, hit.art, target, seed);
      expect(q).not.toBeNull();
      expect(q!.options).toHaveLength(5);
      expect(q!.options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(q!.options.map((o) => o.text)).size).toBe(5);
      expect(q!.texto.split('\n')).toHaveLength(3);
      // Ao menos uma afirmativa é correta e ao menos uma foi alterada.
      expect(q!.mutations.length).toBeGreaterThanOrEqual(1);
      expect(q!.options.find((o) => o.correct)!.text).not.toBe('I, II e III.');
    }
  }
});

