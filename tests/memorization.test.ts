import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MEMORY_SPECS } from '../src/content/memory';
import { REQUIREMENTS, resolveRequirement } from '../src/core/edital';
import type { LawDoc } from '../src/core/types';
import { buildMemoryExercise, memoryPoints } from '../src/learn/memorization';
import { normAnswer } from '../src/learn/text';

const location = new URL('../public/data/laws/', import.meta.url);
const corpus = readdirSync(location).filter((file) => file.endsWith('.json')).map(
  (file): LawDoc => JSON.parse(readFileSync(new URL(file, location), 'utf8')),
);

it('valida as lacunas revisadas no dispositivo exato e cobre todos os diplomas do edital do TJSP', () => {
  const units = new Map(corpus.flatMap((law) => law.articles.flatMap((article) =>
    article.units.map((unit) => [unit.id, { law, article, unit }] as const))));
  const withinSyllabus = new Set<string>();
  const syllabus = new Map(corpus.map((law) => [law.id, new Set(REQUIREMENTS.filter((req) => req.law === law.id)
    .flatMap((req) => resolveRequirement(law, req).articles))]));
  for (const spec of MEMORY_SPECS) {
    const hit = units.get(spec.unitId);
    expect(hit, spec.unitId).toBeDefined();
    const { law, article, unit } = hit!;
    const point = memoryPoints(law, article, unit).find(({ prompt, target }) => prompt === spec.prompt && target.text === spec.answer);
    expect(point, `${spec.unitId} ${spec.answer}`).toBeDefined();
    const exercise = buildMemoryExercise(law, article, unit, point!, 1, 'teste');
    expect(exercise.stem.slice(1).map(({ t }) => t).join('')).toBe(unit.t);
    expect(exercise.stem.filter(({ blank }) => blank)).toEqual([{ t: spec.answer, blank: true }]);
    expect(exercise.options?.filter(({ correct }) => correct).map(({ text }) => text)).toEqual([spec.answer]);
    expect(exercise.options!.length).toBeGreaterThanOrEqual(4);
    expect(new Set(exercise.options!.map(({ text }) => normAnswer(text))).size).toBe(exercise.options!.length);
    if (syllabus.get(law.id)?.has(article.id)) withinSyllabus.add(law.id);
  }
  expect(withinSyllabus).toEqual(new Set(REQUIREMENTS.map(({ law }) => law)));
});

it('exercita os limites em salários mínimos e deixa de fora verbos genéricos', () => {
  const law = corpus.find(({ id }) => id === 'l9099')!;
  const article = law.articles.find(({ id }) => id === 'l9099.9')!;
  const sample = { ...article.units[0], id: 'teste.cpt', t: 'Poderá comparecer sem advogado nas causas de até 20 (vinte) salários mínimos.' };
  const points = memoryPoints(law, article, sample);
  expect(points.map(({ target }) => target.text)).toEqual(['20 (vinte) salários mínimos']);
  expect(points[0].choices.every((choice) => /salários mínimos$/.test(choice))).toBe(true);
  const filler = { ...sample, t: 'O setor poderá organizar a documentação.' };
  expect(memoryPoints(law, article, filler)).toHaveLength(0);
});

it('mantém ao menos um ponto de memorização em cada diploma do acervo', () => {
  const empty = corpus.filter((law) => !law.articles.some((article) =>
    article.units.some((unit) => memoryPoints(law, article, unit).length > 0))).map(({ id }) => id);
  expect(empty).toEqual([]);
});
