// Cor e ícone de cada ramo do Direito (cartões, ladrilhos e capas).
import type { ReactNode } from 'react';
import type { Ramo } from '../core/sources';
import { SOURCES } from '../core/sources';
import { IBriefcase, IBuilding, ICane, ICar, ICart, IChild, ICity, ICoin, IColumns, ICopyright, IDoc, IFamily, IGavel, IHandcuffs, IHandshake, IHardhat, IHeart, IHouse, IPeople, IPhone, IPill, IScale, IShield, IShieldLock, ITree, IUrna } from './icons';
import { TILE } from './IconTile';

export const RAMO_STYLE: Record<Ramo, { color: keyof typeof TILE; icon: (size?: number) => ReactNode }> = {
  Constitucional: { color: 'peri', icon: (s) => <IColumns size={s} /> },
  Administrativo: { color: 'blue', icon: (s) => <IBuilding size={s} /> },
  Civil: { color: 'teal', icon: (s) => <IFamily size={s} /> },
  'Processual Civil': { color: 'violet', icon: (s) => <IScale size={s} /> },
  Penal: { color: 'rose', icon: (s) => <IHandcuffs size={s} /> },
  'Processual Penal': { color: 'orange', icon: (s) => <IGavel size={s} /> },
  Eleitoral: { color: 'green', icon: (s) => <IUrna size={s} /> },
  'Direitos sociais': { color: 'gold', icon: (s) => <IPeople size={s} /> },
  'Interna TJSP': { color: 'navy', icon: (s) => <IBriefcase size={s} /> },
  'Interna TJMS': { color: 'navy', icon: (s) => <IBriefcase size={s} /> },
};
/** Ramos ainda sem leis no app: ícones já definidos para quando chegarem. */
export const FUTURE_RAMO_ICON: Record<string, (size?: number) => ReactNode> = {
  Ambiental: (s) => <ITree size={s} />, Tributário: (s) => <ICoin size={s} />, Trabalho: (s) => <IHardhat size={s} />,
  Consumidor: (s) => <ICart size={s} />, Previdenciário: (s) => <IShield size={s} />, Digital: (s) => <IShieldLock size={s} />,
};

/** Ícone próprio de algumas leis (o resto herda o ícone do ramo). */
const LAW_ICON: Record<string, (s?: number) => ReactNode> = {
  cdc: (s) => <ICart size={s} />, eca: (s) => <IChild size={s} />, idoso: (s) => <ICane size={s} />, ctb: (s) => <ICar size={s} />,
  lgpd: (s) => <IShieldLock size={s} />, l11343: (s) => <IPill size={s} />, l8245: (s) => <IHouse size={s} />, l8009: (s) => <IHouse size={s} />,
  l9514: (s) => <IHouse size={s} />, l13786: (s) => <IHouse size={s} />, l6766: (s) => <ITree size={s} />, l10257: (s) => <ICity size={s} />,
  l9610: (s) => <ICopyright size={s} />, l9307: (s) => <IHandshake size={s} />, l13140: (s) => <IHandshake size={s} />, l9296: (s) => <IPhone size={s} />,
  l9434: (s) => <IHeart size={s} />, l11340: (s) => <IShield size={s} />, l12016: (s) => <IShield size={s} />, l14133: (s) => <IDoc size={s} />,
  l13874: (s) => <ICoin size={s} />, l9613: (s) => <ICoin size={s} />, d22626: (s) => <ICoin size={s} />,
};
export const lawStyle = (lawId: string) => {
  const base = RAMO_STYLE[SOURCES.find((s) => s.id === lawId)?.ramo ?? 'Constitucional'] ?? RAMO_STYLE.Constitucional;
  return LAW_ICON[lawId] ? { ...base, icon: LAW_ICON[lawId] } : base;
};
