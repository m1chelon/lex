import { db } from '../data/db';
import { CAPI_ITEMS, CAPI_SLOTS, DEFAULT_CAPI_LOOK, type CapiGender, type CapiItem, type CapiItemId, type CapiLook, type CapiSlot } from '../content/capiCatalog';
import { getCareer } from './career';

export const CAPI_WARDROBE_KEY = 'capi-wardrobe';
export const DEFAULT_CAPI_GENDER: CapiGender = 'masculino';
const slots = Object.keys(CAPI_SLOTS) as CapiSlot[];

type Wardrobe = {
  acquired: Record<CapiItemId, number>;
  equipped: CapiLook;
  gender: CapiGender;
  changedAt: number;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function findCapiItem(id: unknown): CapiItem | undefined {
  return typeof id === 'string' && Object.hasOwn(CAPI_ITEMS, id) ? CAPI_ITEMS[id] : undefined;
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isDefault(item: CapiItem) {
  return item.id === DEFAULT_CAPI_LOOK.suit;
}

export function normalizeWardrobe(value: unknown): Wardrobe {
  const saved = record(value);
  const acquired: Wardrobe['acquired'] = {};
  for (const [id, price] of Object.entries(record(saved.acquired))) {
    const item = findCapiItem(id);
    if (item && item.group !== 'provador' && item.unlock.kind !== 'premium' && !isDefault(item) && validNumber(price)) {
      acquired[id] = price;
    }
  }

  const previousLook = record(saved.equipped);
  const equipped = { ...DEFAULT_CAPI_LOOK };
  for (const slot of slots) {
    const item = findCapiItem(previousLook[slot]);
    if (item?.slot === slot && (isDefault(item) || Object.hasOwn(acquired, item.id))) equipped[slot] = item.id;
  }
  const gender = saved.gender === 'feminino' ? 'feminino' : DEFAULT_CAPI_GENDER;
  return { acquired, equipped, gender, changedAt: validNumber(saved.changedAt) ? saved.changedAt : 0 };
}

export function mergeWardrobes(current: unknown, restored: unknown): Wardrobe {
  const left = normalizeWardrobe(current);
  const right = normalizeWardrobe(restored);
  const latest = right.changedAt > left.changedAt ? right : left;
  return { ...latest, acquired: { ...left.acquired, ...right.acquired } };
}

export function withCapiItem(look: CapiLook, slot: CapiSlot, id: CapiItemId | null): CapiLook {
  if (id === null) return { ...look, [slot]: DEFAULT_CAPI_LOOK[slot] };
  return findCapiItem(id)?.slot === slot ? { ...look, [slot]: id } : look;
}

export type CapiShopState = { wardrobe: Wardrobe; xp: number };

async function shopState(): Promise<CapiShopState> {
  const [{ xp }, row] = await Promise.all([getCareer(), db.kv.get(CAPI_WARDROBE_KEY)]);
  return { wardrobe: normalizeWardrobe(row?.value), xp };
}

export const getCapiShop = () => db.transaction('r', db.kv, db.reviews, shopState);

export function capiItemStatus(item: CapiItem, state: CapiShopState) {
  if (item.unlock.kind === 'premium') return 'premium';
  if (isDefault(item) || Object.hasOwn(state.wardrobe.acquired, item.id)) return 'owned';
  return item.unlock.kind === 'xp' && state.xp >= item.unlock.amount ? 'available' : 'locked';
}

export function equipCapiItem(slot: CapiSlot, id: CapiItemId | null) {
  return db.transaction('rw', db.kv, db.reviews, async () => {
    const state = await shopState();
    const item = findCapiItem(id);
    if (!Object.hasOwn(CAPI_SLOTS, slot) || (id !== null && item?.slot !== slot)) throw new Error('Item inválido.');
    const status = item && capiItemStatus(item, state);
    if (status === 'premium') throw new Error('Compras em breve.');
    if (status === 'locked') throw new Error('Seu progresso ainda não libera este item.');
    const wardrobe = state.wardrobe;
    if (item && status === 'available') wardrobe.acquired[item.id] = 0;
    const equipped = withCapiItem(wardrobe.equipped, slot, id);
    await db.kv.put({ key: CAPI_WARDROBE_KEY, value: { ...wardrobe, equipped, changedAt: Date.now() } satisfies Wardrobe });
    return status === 'available' ? 'acquired' : 'equipped';
  });
}

export function setCapiGender(gender: CapiGender) {
  return db.transaction('rw', db.kv, async () => {
    const row = await db.kv.get(CAPI_WARDROBE_KEY);
    const wardrobe = normalizeWardrobe(row?.value);
    if (wardrobe.gender !== gender) {
      await db.kv.put({ key: CAPI_WARDROBE_KEY, value: { ...wardrobe, gender, changedAt: Date.now() } satisfies Wardrobe });
    }
  });
}
