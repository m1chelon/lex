import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, expect, it, vi } from 'vitest';
import { corpusVersion, ensureLaws, getLaw, initCorpus, prepareCorpus } from '../src/data/corpus';
import type { LawDoc } from '../src/core/types';
import { libraryDb } from '../src/data/db';
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

it('atualiza uma norma já baixada quando o índice online mudou desde a última visita', async () => {
  const read = async (path: string) => JSON.parse(await readFile(new URL(`../public/${path}`, import.meta.url), 'utf8'));
  const manifest = await read('./data/manifest.json') as { laws: { id: string; provenance: LawDoc['provenance'] }[] };
  const law = await read('./data/laws/cf.json') as LawDoc;
  await libraryDb.kv.put({ key: 'corpus-manifest', value: manifest });
  await libraryDb.laws.put({ id: law.id, doc: law, sha: law.provenance.sha256, method: 'automatico', storedAt: new Date().toISOString() });
  const sha256 = 'nova-revisao-da-cf';
  manifest.laws.find(({ id }) => id === 'cf')!.provenance.sha256 = sha256;
  law.provenance.sha256 = sha256;
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/manifest.json')) return Response.json(manifest);
    if (url.endsWith('/cf.json')) return Response.json(law);
    throw new Error('Norma inesperada');
  });
  vi.resetModules();
  const fresh = await import('../src/data/corpus');
  await fresh.prepareCorpus();
  await fresh.ensureLaws(['cf']);
  expect(fresh.getLaw('cf')?.provenance.sha256).toBe(sha256);
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
