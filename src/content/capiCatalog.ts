import { BASIC_COLLECTIONS, PAID_COLLECTIONS } from './capiCollections';

export const CAPI_SLOTS = {
  suit: 'Roupa', legs: 'Calça ou saia', shoes: 'Calçados', head: 'Cabeça', glasses: 'Óculos',
  hands: 'Luvas', watch: 'Pulso', neck: 'Pescoço', ears: 'Brincos', waist: 'Faixa ou cinto', carry: 'Objeto',
} as const;

export type CapiSlot = keyof typeof CAPI_SLOTS;
export type CapiGender = 'masculino' | 'feminino';
export type CapiLook = Record<CapiSlot, string | null>;
export type CapiCollection = 'xp' | 'icons' | 'brasil' | 'mundo' | 'sports';
export type CapiItemId = string;

export const CAPI_COLLECTIONS: Record<CapiCollection, string> = {
  xp: 'Por XP', icons: 'Ícones & Épocas', brasil: 'Brasilidades', mundo: 'Passaporte Capi', sports: 'Capi Sports',
};
export const PREMIUM_PRICE_CENTS = 499;
export const DEFAULT_CAPI_LOOK: CapiLook = {
  suit: 'terno-classico', legs: null, shoes: null, head: null, glasses: null, hands: null,
  watch: null, neck: null, ears: null, waist: null, carry: null,
};

const MODEL_SLOTS = {
  suit: 'suit', double: 'suit', tux: 'suit', tailleur: 'suit', vest: 'suit', coat: 'suit',
  dress: 'suit', gown: 'suit', cardigan: 'suit', jumpsuit: 'suit', jacket: 'suit', denim: 'suit',
  hoodie: 'suit', tee: 'suit', shirt: 'suit', polo: 'suit', turtleneck: 'suit', overalls: 'suit',
  pajamas: 'suit', raincoat: 'suit', robe: 'suit', cape: 'suit', uniform: 'suit', kimono: 'suit',
  poncho: 'suit', apron: 'suit', racing: 'suit', singlet: 'suit', wetsuit: 'suit', armor: 'suit',
  pants: 'legs', breeches: 'legs', shorts: 'legs', skirt: 'legs',
  oxford: 'shoes', derby: 'shoes', loafer: 'shoes', sneaker: 'shoes', runner: 'shoes',
  highTop: 'shoes', platform: 'shoes', flat: 'shoes', heel: 'shoes', boot: 'shoes',
  cowboyBoot: 'shoes', sandal: 'shoes', geta: 'shoes', cleat: 'shoes',
  panama: 'head', fedora: 'head', beret: 'head', flatCap: 'head', topHat: 'head', wideHat: 'head',
  cowboyHat: 'head', baseball: 'head', bucket: 'head', beanie: 'head', visor: 'head',
  bowler: 'head', mortarboard: 'head', fascinator: 'head', bicorne: 'head', cloche: 'head',
  crown: 'head', deerstalker: 'head', wig: 'head', cone: 'head', fez: 'head', sombrero: 'head',
  fullHelmet: 'head', helmet: 'head', balaclava: 'head', headband: 'head', cap: 'head',
  headset: 'head', faceMask: 'head',
  round: 'glasses', square: 'glasses', halfRim: 'glasses', catEye: 'glasses', aviator: 'glasses',
  heart: 'glasses', hex: 'glasses', monocle: 'glasses', shield: 'glasses', goggles: 'glasses',
  glove: 'hands', operaGlove: 'hands', fingerless: 'hands', mitten: 'hands', boxing: 'hands',
  watch: 'watch', smartWatch: 'watch', bracelet: 'watch', bangle: 'watch', sweatband: 'watch',
  tie: 'neck', bow: 'neck', scarf: 'neck', stringTie: 'neck', necklace: 'neck', choker: 'neck',
  pin: 'neck', medal: 'neck',
  hoop: 'ears', gem: 'ears',
  belt: 'waist', obi: 'waist',
  bag: 'carry', case: 'carry', book: 'carry', gavel: 'carry', scale: 'carry', plaque: 'carry',
  file: 'carry', pen: 'carry', cup: 'carry', fan: 'carry', umbrella: 'carry', pocketWatch: 'carry',
  trophy: 'carry', racket: 'carry', paddle: 'carry', shuttleRacket: 'carry', soccerBall: 'carry',
  basketBall: 'carry', americanBall: 'carry', baseballMitt: 'carry', bat: 'carry',
  board: 'carry', foil: 'carry', archery: 'carry', club: 'carry', scroll: 'carry',
} as const satisfies Record<string, CapiSlot>;

export type CapiModel = keyof typeof MODEL_SLOTS;
export type CapiItem = {
  id: CapiItemId; name: string; collection: CapiCollection | 'legacy'; group: string; slot: CapiSlot;
  model: CapiModel; color: string; accent: string; detail: string;
  unlock: { kind: 'xp'; amount: number } | { kind: 'premium'; priceCents: number } | { kind: 'legacy' };
};

export type CollectionRows = readonly [collection: CapiCollection, key: string, label: string, items: string];

export function catalogSearchKey(input: string) {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const XP_STEPS = [25, 45, 70, 100, 145, 200, 280, 380, 530, 730, 1000, 1370, 1870, 2500, 3350];
const EARLY_GRID: Record<string, number> = { 'terno-classico': 0, 'oculos-dourados': 100, 'relogio-aco': 115 };

function catalogItem(collection: CapiItem['collection'], group: string, row: string, stage: number): CapiItem {
  const [name, pattern, color, accent, detail = '', oldId] = row.split('|');
  if (!Object.hasOwn(MODEL_SLOTS, pattern)) throw new Error('Modelo do Capi inválido: ' + pattern);
  const model = pattern as CapiModel;
  const slug = catalogSearchKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = oldId || `${collection}-${group}-${slug}`;
  return {
    id, name, collection, group, slot: MODEL_SLOTS[model], model, color: '#' + color, accent: '#' + accent, detail,
    unlock: collection === 'legacy' ? { kind: 'legacy' }
      : collection === 'xp' ? { kind: 'xp', amount: EARLY_GRID[id] ?? XP_STEPS[stage] }
        : { kind: 'premium', priceCents: PREMIUM_PRICE_CENTS },
  };
}

const GROUPS = [...BASIC_COLLECTIONS, ...PAID_COLLECTIONS];
export const CAPI_GROUPS = GROUPS.map(([collection, id, label]) => ({ collection, id, label }));

export const CAPI_CATALOG = GROUPS.flatMap(([collection, group, , rows]) =>
  rows.trim().split('\n').map((row, index) => catalogItem(collection, group, row, index)),
);

const legacy = [
  'Terno petróleo|suit|2a6473|ecc384||terno-petroleo',
  'Terno marfim|suit|dccaad|365f92||terno-marfim',
  'Terno floresta|suit|375c48|df9a69||terno-floresta',
  'Óculos fumê|square|1a2235|b4c4e6|smoke|oculos-fume',
  'Relógio de couro|watch|865032|e5b57f|cream|relogio-couro',
].map((row) => catalogItem('legacy', 'anteriores', row, 0));

const previewProps = [catalogItem('legacy', 'provador', 'Pergaminho|scroll|e6cc9d|99744b||capi-pergaminho', 0)];
export const CAPI_ITEMS: Readonly<Record<CapiItemId, CapiItem>> = Object.fromEntries(
  [...CAPI_CATALOG, ...legacy, ...previewProps].map((item) => [item.id, item]),
);
export const CAPI_LEGACY_ITEMS = legacy;
