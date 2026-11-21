// Cor e ícone de cada ramo do Direito (cartões, ladrilhos e capas).
import type { ReactNode } from 'react';
import type { Ramo } from '../core/sources';
import { SOURCES } from '../core/sources';
import { IBook, IBriefcase, IBuilding, ICane, ICar, ICart, IChild, ICity, ICoin, IColumns, ICopyright, IDoc, IFamily, IGavel, IGlobe, IHandcuffs, IHandshake, IHardhat, IHeart, IHouse, INote, IPeople, IPhone, IPill, IProgressChart, IPuzzle, IScale, IShield, IShieldLock, IText, ITree, IUrna } from './icons';
import { TINT, TILE } from './IconTile';

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

const SUBJECT_STYLE: Record<string, (typeof RAMO_STYLE)[Ramo]> = {
  'Direito Constitucional': RAMO_STYLE.Constitucional,
  'Direito Administrativo': RAMO_STYLE.Administrativo,
  'Direito Civil': RAMO_STYLE.Civil,
  'Direito Processual Civil': RAMO_STYLE['Processual Civil'],
  'Direito Penal': RAMO_STYLE.Penal,
  'Direito Processual Penal': RAMO_STYLE['Processual Penal'],
  'Direito Eleitoral': RAMO_STYLE.Eleitoral,
  'Direito do Consumidor': lawStyle('cdc'),
  'Hermenêutica Constitucional': { color: 'violet', icon: (size) => <IBook size={size} /> },
  'Legislação Interna': RAMO_STYLE['Interna TJSP'],
  'Noções de Legislação': RAMO_STYLE['Interna TJMS'],
  'Atualidades — item 2': { color: 'gold', icon: (size) => <IGlobe size={size} /> },
  'Língua Portuguesa': { color: 'teal', icon: (size) => <IText size={size} /> },
  Matemática: { color: 'green', icon: (size) => <IProgressChart size={size} /> },
  Informática: { color: 'blue', icon: (size) => <IPhone size={size} /> },
  'Raciocínio Lógico': { color: 'violet', icon: (size) => <IPuzzle size={size} /> },
  Redação: { color: 'rose', icon: (size) => <INote size={size} /> },
};

export function SubjectGlyph({ title, law, small }: { title: string; law?: string; small?: boolean }) {
  const subject = title.replace(/^\d+\.\s*/, '');
  const style = SUBJECT_STYLE[subject] ?? RAMO_STYLE[subject as Ramo]
    ?? (law ? lawStyle(law) : { color: 'peri' as const, icon: (size: number) => <IBook size={size} /> });
  return <span aria-hidden="true" className={`law-glyph subject-glyph${small ? ' sm' : ''}`}
    style={{ '--tint': TINT[style.color] } as React.CSSProperties}>{style.icon(small ? 16 : 21)}</span>;
}
