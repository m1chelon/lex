import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, expect, it, vi } from 'vitest';
import { corpusVersion, ensureLaws, getLaw, initCorpus, prepareCorpus } from '../src/data/corpus';
import type { LawDoc } from '../src/core/types';
import { articlesInSection, lawSections } from '../src/learn/lawSections';

afterAll(() => vi.unstubAllGlobals());

it('recusa um arquivo de lei de outra revisão e permite repetir o download após falha', async () => {
  let valid = false;
  const requests: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url);
    const raw = await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8');
    if (url.endsWith('/cf.json') && !valid) {
      const doc = JSON.parse(raw);
      return new Response(JSON.stringify({ ...doc, provenance: { ...doc.provenance, sha256: 'versão antiga' } }));
    }
    return new Response(raw);
  });
  await prepareCorpus();
  expect(requests).toEqual(['./data/manifest.json']);
  await initCorpus();
  expect(getLaw('cf')).toBeUndefined();
  const version = corpusVersion();
  await ensureLaws(['cf']);
  expect(corpusVersion()).toBe(version);
  valid = true;
  await ensureLaws(['cf']);
  expect(getLaw('cf')?.id).toBe('cf');
  expect(corpusVersion()).toBe(version + 1);
});

it.each([
  ['cp', '121'],
  ['cc', '233'],
])('abre as partes do código %s com artigos próprios', async (id, firstSpecial) => {
  const law: LawDoc = JSON.parse(await readFile(new URL(`../public/data/laws/${id}.json`, import.meta.url), 'utf8'));
  const sections = lawSections(law);
  expect(sections.slice(0, 2).map(({ title }) => title)).toEqual(['Parte Geral', 'Parte Especial']);
  const general = articlesInSection(law, sections[0]);
  const special = articlesInSection(law, sections[1]);
  expect(general[0]).toBe(`${id}.1`);
  expect(special[0]).toBe(`${id}.${firstSpecial}`);
  expect(new Set([...general, ...special]).size).toBe(general.length + special.length);
});
