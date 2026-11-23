import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterAll, expect, it, vi } from 'vitest';
import { lawsByRamo } from '../src/core/areas';
import { ensureLaws, getLaw, getManifest } from '../src/data/corpus';
import { db } from '../src/data/db';
import { loadBranchCoverage } from '../src/learn/courseProgress';
import { markSeen } from '../src/learn/scheduler';

afterAll(() => vi.unstubAllGlobals());

it('conta cada artigo estudado uma vez por matéria e inclui no total as leis ainda não baixadas', async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await ensureLaws(['cp']);
  expect(getLaw('l12850')).toBeUndefined();
  await db.kv.put({ key: 'readArticles', value: ['cp.1', 'cp.1', 'cp.88', 'l12850.1'] });
  await markSeen('literal:cp.1', { articleId: 'cp.1', dim: 'literal', type: 'cloze-multi' });
  await markSeen('caso:cp.316', { conceptId: 'lex-caso-cp.316', dim: 'aplicacao', type: 'concept' });
  await markSeen('literal:cc.1', { articleId: 'cc.1', dim: 'literal', type: 'cloze-multi' });

  const progress = await loadBranchCoverage();
  const laws = lawsByRamo('Penal');
  const total = getManifest()!.laws.filter(({ id }) => laws.includes(id))
    .reduce((sum, law) => sum + (law.articles ?? 0) - (law.stats?.revoked ?? 0), 0);
  expect(progress.get('Penal')).toEqual({ seen: 2, total });
  expect(progress.get('Processual Penal')?.seen).toBe(1);
  expect(progress.get('Civil')?.seen).toBe(1);
  expect(progress.get('Eleitoral')?.seen).toBe(0);
});
