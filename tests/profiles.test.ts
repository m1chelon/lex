import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() { return entries.size; },
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    removeItem: (key) => { entries.delete(key); },
    clear: () => { entries.clear(); },
  };
}

async function openApp() {
  vi.resetModules();
  const [profiles, storage, settings, nav, corpus] = await Promise.all([
    import('../src/data/profiles'), import('../src/data/db'), import('../src/ui/settings'),
    import('../src/ui/nav'), import('../src/data/corpus'),
  ]);
  return { ...profiles, ...storage, ...settings, ...nav, ...corpus };
}

it('mantém progresso e preferências legados, isola os perfis e compartilha as leis offline', async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  localStorage.setItem('lex.settings', JSON.stringify({ name: 'Titular', area: 'tjsp', dailyMinutes: 20, onboarded: true }));
  localStorage.setItem('lex.plan', JSON.stringify({ scope: { kind: 'curso', area: 'tjsp' }, mode: 'memorizar', minutes: 20 }));
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  const primary = await openApp();
  expect(primary.activeProfile.id).toBe(primary.PRIMARY_PROFILE_ID);
  expect(primary.getSettings()).toMatchObject({ name: 'Titular', area: 'tjsp', dailyMinutes: 20 });
  await primary.prepareCorpus();
  await primary.ensureLaws(['cf']);
  await primary.kvSet('nav', { tab: 'cursos', stack: [{ name: 'jogar' }] });
  await primary.kvSet('session', { id: 'treino-titular' });
  await primary.kvSet('capi-wardrobe', { gender: 'feminino' });
  await primary.db.marks.put({ id: 'fav:cf.5', kind: 'fav', target: 'cf.5', at: 1 });
  primary.nav.push({ name: 'jogar' });

  const assistant = primary.createProfile({ name: '  Apoio  ', kind: 'assistente', area: 'tjms', dailyMinutes: 10, when: 'manha' });
  primary.selectProfile(assistant.id);
  expect(primary.activeProfile.id).toBe(primary.PRIMARY_PROFILE_ID);
  expect(primary.db.name).toBe('lex');
  primary.db.close();

  vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
  const next = await openApp();
  const { getPlan, savePlan } = await import('../src/learn/plan');
  expect(next.activeProfile).toEqual(assistant);
  expect(next.listProfiles()).toHaveLength(2);
  expect(next.getSettings()).toMatchObject({ name: 'Apoio', area: 'tjms', dailyMinutes: 10, when: 'manha' });
  expect(next.nav.get()).toMatchObject({ tab: 'home', stack: [] });
  expect(getPlan()).toBeNull();
  expect(await next.db.marks.count()).toBe(0);
  expect(await next.kvGet('session', null)).toBeNull();
  expect(await next.kvGet('capi-wardrobe', null)).toBeNull();
  await next.prepareCorpus();
  expect(next.getLaw('cf')?.id).toBe('cf');

  savePlan({ scope: { kind: 'curso', area: 'tjms' }, mode: 'memorizar', minutes: 10 });
  await next.kvSet('session', { id: 'treino-assistente' });
  await next.db.marks.put({ id: 'fav:cf.7', kind: 'fav', target: 'cf.7', at: 2 });
  next.selectProfile(next.PRIMARY_PROFILE_ID);
  next.db.close();
  next.libraryDb.close();

  const returned = await openApp();
  expect(returned.getSettings().name).toBe('Titular');
  expect(returned.nav.get()).toMatchObject({ tab: 'home', stack: [] });
  expect(await returned.kvGet('session', null)).toEqual({ id: 'treino-titular' });
  expect(await returned.kvGet('capi-wardrobe', null)).toEqual({ gender: 'feminino' });
  expect(await returned.db.marks.toCollection().primaryKeys()).toEqual(['fav:cf.5']);
  expect((await import('../src/learn/plan')).getPlan()?.scope).toEqual({ kind: 'curso', area: 'tjsp' });
  returned.db.close();
});
