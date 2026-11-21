import 'fake-indexeddb/auto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import { CAPI_CATALOG, CAPI_ITEMS, DEFAULT_CAPI_LOOK } from '../src/content/capiCatalog';
import { db, type ReviewRow } from '../src/data/db';
import { CAPI_WARDROBE_KEY, capiItemStatus, equipCapiItem, getCapiShop, mergeWardrobes, setCapiGender } from '../src/learn/capiShop';
import { CapiItemThumb } from '../src/ui/CapiWardrobeArt';

const earn = (correct: number) => db.reviews.bulkAdd(Array.from({ length: correct }, (_, i): ReviewRow => ({
  at: 1730000000000 + i, cardId: `ref:${i}`, dim: 'literal', type: 'cloze-type',
  correct: true, rating: 3, ms: 2000, mode: 'provar',
})));

const premium = CAPI_CATALOG.find((item) => item.name === 'Fedora do Luar')!;
const golden = CAPI_ITEMS['oculos-dourados'];

afterEach(async () => {
  await db.reviews.clear();
  await db.kv.delete(CAPI_WARDROBE_KEY);
});

it('publica as cinco coleções com 365 peças diferentes e preço em centavos', () => {
  const counts = new Map<string, number>();
  for (const item of CAPI_CATALOG) {
    counts.set(item.collection, 1 + (counts.get(item.collection) ?? 0));
    expect(item.unlock.kind).toBe(item.collection === 'xp' ? 'xp' : 'premium');
    if (item.unlock.kind === 'premium') expect(item.unlock.priceCents).toBe(499);
    else if (item.unlock.kind === 'xp') expect(Number.isSafeInteger(item.unlock.amount)).toBe(true);
    const image = renderToStaticMarkup(createElement(CapiItemThumb, { item }));
    expect(image).toMatch(/<(?:path|rect|ellipse|circle) [^>]+>/);
  }
  expect(Object.fromEntries(counts)).toEqual({ xp: 135, icons: 50, brasil: 50, mundo: 50, sports: 80 });
  expect(new Set(CAPI_CATALOG.map(({ id }) => id)).size).toBe(365);
});

it('usa automaticamente o histórico de XP e permite desbloquear sem consumir progresso', async () => {
  const fresh = await getCapiShop();
  expect(fresh.wardrobe.equipped).toEqual(DEFAULT_CAPI_LOOK);
  expect(capiItemStatus(golden, fresh)).toBe('locked');
  await expect(equipCapiItem('glasses', golden.id)).rejects.toThrow('progresso');
  await earn(10);
  await expect(equipCapiItem('glasses', golden.id)).resolves.toBe('acquired');
  await equipCapiItem('glasses', null);
  await expect(equipCapiItem('glasses', golden.id)).resolves.toBe('equipped');
  expect(await getCapiShop()).toMatchObject({ xp: 100, wardrobe: { acquired: { 'oculos-dourados': 0 }, equipped: { glasses: golden.id } } });
  await expect(equipCapiItem('watch', golden.id)).rejects.toThrow('Item inválido');
});

it('mantém a coleção premium fechada mesmo com XP e restauração de backup', async () => {
  await earn(75);
  await expect(equipCapiItem(premium.slot, premium.id)).rejects.toThrow('Compras em breve');
  const restored = mergeWardrobes(null, { acquired: { [premium.id]: 499 }, equipped: { head: premium.id }, changedAt: 5 });
  expect(restored.equipped.head).toBeNull();
  expect(restored.acquired[premium.id]).toBeUndefined();
});

it('preserva peças antigas e concilia alterações simultâneas de aparência e vestimenta', async () => {
  const restored = mergeWardrobes(
    { acquired: { 'terno-petroleo': 30 }, equipped: { suit: 'terno-petroleo' }, changedAt: 2 },
    { acquired: { 'oculos-fume': 14 }, equipped: { suit: 'terno-marfim', glasses: 'oculos-fume' }, changedAt: 1, gender: 'feminino' },
  );
  expect(restored.acquired).toEqual({ 'terno-petroleo': 30, 'oculos-fume': 14 });
  expect(restored.equipped.suit).toBe('terno-petroleo');
  expect(restored.gender).toBe('masculino');
  await db.kv.put({ key: CAPI_WARDROBE_KEY, value: restored });
  await Promise.all([setCapiGender('feminino'), equipCapiItem('glasses', 'oculos-fume')]);
  expect((await getCapiShop()).wardrobe).toMatchObject({ gender: 'feminino', equipped: { suit: 'terno-petroleo', glasses: 'oculos-fume' } });
});
