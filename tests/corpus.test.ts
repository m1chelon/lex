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

it('atualiza a lei quando muda a versão do parser, mesmo com a fonte original idêntica', async () => {
  const read = async (path: string) => JSON.parse(await readFile(new URL(`../public/${path}`, import.meta.url), 'utf8'));
  const manifest = await read('data/manifest.json') as { laws: { id: string; provenance: LawDoc['provenance'] }[] };
  const law = await read('data/laws/cf.json') as LawDoc;
  const previousParser = law.provenance.parserVersion;
  await libraryDb.kv.put({ key: 'corpus-manifest', value: manifest });
  await libraryDb.laws.put({ id: law.id, doc: law, sha: law.provenance.sha256, method: 'automatico', storedAt: new Date().toISOString() });
  const parserVersion = `${previousParser}-novo`;
  manifest.laws.find(({ id }) => id === 'cf')!.provenance.parserVersion = parserVersion;
  let served = law;
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/manifest.json')) return Response.json(manifest);
    if (url.endsWith('/cf.json')) return Response.json(served);
    return new Response(null, { status: 503 });
  });
  vi.resetModules();
  const fresh = await import('../src/data/corpus');
  await fresh.initCorpus();
  expect(fresh.getLaw('cf')?.provenance.parserVersion).toBe(previousParser);
  served = { ...law, provenance: { ...law.provenance, parserVersion } };
  await fresh.initCorpus();
  expect(fresh.getLaw('cf')?.provenance).toMatchObject({ sha256: law.provenance.sha256, parserVersion });
  expect((await libraryDb.laws.get('cf'))?.doc.provenance.parserVersion).toBe(parserVersion);
});

it('publica o índice e baixa as normas quando a conexão volta após uma abertura sem cache', async () => {
  await libraryDb.kv.delete('corpus-manifest');
  await libraryDb.laws.clear();
  vi.stubGlobal('fetch', async () => { throw new Error('Sem conexão'); });
  vi.resetModules();
  const fresh = await import('../src/data/corpus');
  await fresh.prepareCorpus();
  expect(fresh.getManifest()).toBeNull();
  expect(fresh.getLaw('cf')).toBeUndefined();
  const version = fresh.corpusVersion();

  vi.stubGlobal('fetch', async (url: string) => {
    const body = await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8');
    return new Response(body);
  });
  await fresh.initCorpus();

  expect(fresh.getManifest()?.laws).toContainEqual(expect.objectContaining({ id: 'cf' }));
  expect(fresh.getLaw('cf')?.id).toBe('cf');
  expect(fresh.corpusVersion()).toBe(version + 2);
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

it('preserva a importação manual salva enquanto outra aba baixa a versão automática', async () => {
  const read = async (path: string) => JSON.parse(await readFile(new URL(`../public/${path}`, import.meta.url), 'utf8'));
  const manifest = await read('data/manifest.json');
  const law: LawDoc = await read('data/laws/cf.json');
  const manual: LawDoc = { ...law, provenance: { ...law.provenance, method: 'manual', sha256: 'cf-importada' } };
  await libraryDb.laws.delete('cf');
  let notifyDownload!: () => void;
  let releaseDownload!: () => void;
  const requested = new Promise<void>((resolve) => { notifyDownload = resolve; });
  const waitForImport = new Promise<void>((resolve) => { releaseDownload = resolve; });
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/manifest.json')) return Response.json(manifest);
    notifyDownload();
    await waitForImport;
    return Response.json(law);
  });
  vi.resetModules();
  const fresh = await import('../src/data/corpus');
  const downloading = fresh.ensureLaws(['cf']);
  await requested;
  try {
    await libraryDb.laws.put({ id: manual.id, doc: manual, sha: manual.provenance.sha256, method: 'manual', storedAt: new Date().toISOString() });
  } finally { releaseDownload(); }
  await downloading;
  expect(fresh.getLaw('cf')?.provenance.sha256).toBe('cf-importada');
  expect(await libraryDb.laws.get('cf')).toMatchObject({ method: 'manual', sha: 'cf-importada' });
});
