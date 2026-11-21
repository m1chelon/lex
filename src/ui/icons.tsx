// Ícones de traço fino (estilo SF Symbols), desenhados para o LEX.
import type { SVGProps } from 'react';
type P = SVGProps<SVGSVGElement> & { size?: number };
const S = ({ size = 22, children, ...p }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
export const IHome = (p: P) => <S {...p}><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10.5h13V9" /><path d="M10 19.5v-5h4v5" /></S>;
export const IStudy = (p: P) => <S {...p}><path d="M12 6.5c-2-1.6-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6-.1-8 1.5Z" /><path d="M12 6.5v13" /></S>;
export const IBook = (p: P) => <S {...p}><path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z" /><path d="M5 16.5a3 3 0 0 1 3-3h11" /><path d="M9 8h6" /></S>;
export const IClipboard = (p: P) => <S {...p}><path d="M8 5H5.5v15h13V5H16" /><rect x="8" y="3.5" width="8" height="3" rx="1" /><path d="M8.5 11h7m-7 4h7" /></S>;
export const ICalendar = (p: P) => <S {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M8 3.5v3M16 3.5v3M8 14h2m4 0h2m-8 3h2" /></S>;
export const IMap = (p: P) => <S {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" /></S>;
export const IGraduation = (p: P) => <S {...p}><path d="m2.8 9 9.2-4.5L21.2 9 12 13.5Z" /><path d="M6.5 11v5c2.5 2.8 8.5 2.8 11 0v-5M21.2 9v6" /></S>;
export const IProgressChart = (p: P) => <S {...p}><path d="M4 4.5V20h16M8 16v-3m4 3v-5m4 5V8" /><path d="m8 9.5 4-2 4-3 3-1m-3 .1h3v3" /></S>;
export const IUser = (p: P) => <S {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c1.2-3.3 4-5 7-5s5.8 1.7 7 5" /></S>;
export const IChevR = (p: P) => <S {...p}><path d="m9.5 6 6 6-6 6" /></S>;
export const IChevL = (p: P) => <S {...p}><path d="m14.5 6-6 6 6 6" /></S>;
export const IChevD = (p: P) => <S {...p}><path d="m6 9.5 6 6 6-6" /></S>;
export const IClose = (p: P) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>;
export const ISearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></S>;
export const IStar = ({ filled, ...p }: P & { filled?: boolean }) => <S {...p} fill={filled ? 'currentColor' : 'none'}><path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8Z" /></S>;
export const IHighlight = (p: P) => <S {...p}><path d="m14.5 5 4.5 4.5-8 8H6.5V13Z" /><path d="M4 20h16" /></S>;
export const INote = (p: P) => <S {...p}><path d="M5 4.5h14v10l-5 5H5Z" /><path d="M14 19.5v-5h5" /><path d="M8.5 9h7M8.5 12h4" /></S>;
export const IPlay = (p: P) => <S {...p}><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" stroke="none" /></S>;
export const IPause = (p: P) => <S {...p}><path d="M9 6v12m6-12v12" strokeWidth="2.6" /></S>;
export const ITarget = (p: P) => <S {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></S>;
export const IFlame = (p: P) => <S {...p}><path d="M12 20c3.5 0 6-2.4 6-5.8 0-3.6-2.8-5.6-3.6-8.7-1.6 1.5-2 3.2-2 4.6-1.2-.8-2-2.4-2-4.1C7.6 7.8 6 10.8 6 14.2 6 17.6 8.5 20 12 20Z" /></S>;
export const IClock = (p: P) => <S {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></S>;
export const ILayers = (p: P) => <S {...p}><path d="m12 4 8.5 4.5L12 13 3.5 8.5Z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16 8.5 4.5L20.5 16" /></S>;
export const ICompare = (p: P) => <S {...p}><rect x="3.5" y="5" width="7.5" height="14" rx="2" /><rect x="13" y="5" width="7.5" height="14" rx="2" /></S>;
export const IGlossary = (p: P) => <S {...p}><path d="M6 4.5h10.5A2.5 2.5 0 0 1 19 7v12.5H8.5A2.5 2.5 0 0 1 6 17Z" /><path d="M6 17a2.5 2.5 0 0 1 2.5-2.5H19" /><path d="M10 8.5h5" /></S>;
export const IBolt = (p: P) => <S {...p}><path d="M13 3.5 5.5 13.5H12l-1 7 7.5-10H12Z" /></S>;
export const ICheck = (p: P) => <S {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></S>;
export const IX = (p: P) => <S {...p}><path d="M7 7l10 10M17 7 7 17" /></S>;
export const IInfo = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></S>;
export const IShield = (p: P) => <S {...p}><path d="M12 3.5 19 6v5.5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6Z" /><path d="m9 12 2 2 4-4" /></S>;
export const IUpload = (p: P) => <S {...p}><path d="M12 15.5V5M7.5 9.5 12 5l4.5 4.5" /><path d="M5 15v4.5h14V15" /></S>;
export const ISettings = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></S>;
export const IHistory = (p: P) => <S {...p}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" /><path d="M4.5 4.5V9H9" /><path d="M12 8v4.5l3 1.8" /></S>;
export const ILink = (p: P) => <S {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></S>;
export const IDiff = (p: P) => <S {...p}><path d="M8 4.5v10M3.5 9.5h9" /><path d="M12 19.5h8.5" /><path d="M15.5 4.5 20 9" /></S>;
export const IExternal = (p: P) => <S {...p}><path d="M14 4.5h5.5V10" /><path d="m19.5 4.5-8 8" /><path d="M17 13.5v6H4.5V7h6" /></S>;
export const ISparkle = (p: P) => <S {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><path d="m7 7 1.8 1.8M15.2 15.2 17 17M17 7l-1.8 1.8M8.8 15.2 7 17" /></S>;
export const IFull = (p: P) => <S {...p}><path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" /></S>;

// ---------- Ícones temáticos (ramos, modos, estados) ----------
export const IScale = (p: P) => <S {...p}><path d="M12 4v16M7 20h10M5 7h14" /><path d="m5 7-2.5 6a2.5 2.5 0 0 0 5 0Z" /><path d="m19 7-2.5 6a2.5 2.5 0 0 0 5 0Z" /></S>;
export const IGavel = (p: P) => <S {...p}><path d="m13.5 4.5 6 6M10.5 7.5l6 6M12 6l4.5 4.5-3 3L9 9Z" /><path d="m10.5 12-6.5 6.5" /><path d="M13 20h7" /></S>;
export const IColumns = (p: P) => <S {...p}><path d="M3.5 9 12 4.5 20.5 9Z" /><path d="M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8M3.5 19.5h17" /></S>;
export const IBriefcase = (p: P) => <S {...p}><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M9 7.5V5.5h6v2M3.5 12.5h17" /></S>;
export const IHandcuffs = (p: P) => <S {...p}><circle cx="7.5" cy="14.5" r="4" /><circle cx="16.5" cy="14.5" r="4" /><path d="M7.5 10.5V7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v3.5" /></S>;
export const IFamily = (p: P) => <S {...p}><circle cx="8" cy="7.5" r="2.5" /><circle cx="16" cy="7.5" r="2.5" /><circle cx="12" cy="13" r="2" /><path d="M3.5 19c.6-3 2.3-5 4.5-5M20.5 19c-.6-3-2.3-5-4.5-5M8.5 20c.5-2 1.8-3.3 3.5-3.3s3 1.3 3.5 3.3" /></S>;
export const IBallot = (p: P) => <S {...p}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V5.5h8V11M10 8.5l1.5 1.5L14 7.5M4 14.5h16" /></S>;
export const IPeople = (p: P) => <S {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.8-3 3-4.8 5.5-4.8s4.7 1.8 5.5 4.8" /><circle cx="17" cy="9.5" r="2.3" /><path d="M16 14.5c2.2 0 3.8 1.5 4.5 4" /></S>;
export const IBuilding = (p: P) => <S {...p}><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10.5 20.5v-3h3v3" /></S>;
export const IBrain = (p: P) => <S {...p}><path d="M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 4.5 3 3 0 0 0 5.5 1.5V6a2 2 0 0 0-2.5-1.5Z" /><path d="M14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 4.5 3 3 0 0 1-5.5 1.5" /></S>;
export const IPuzzle = (p: P) => <S {...p}><path d="M5 8h3.5a2 2 0 1 1 4 0H16v3.5a2 2 0 1 1 0 4V19H12.5a2 2 0 1 0-4 0H5v-3.5a2 2 0 1 0 0-4Z" /></S>;
export const ITrophy = (p: P) => <S {...p}><path d="M8 4.5h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6.5H5a3 3 0 0 0 3 4M16 6.5h3a3 3 0 0 1-3 4M12 13.5v3M8.5 20h7M9.5 20l.5-3.5h4l.5 3.5" /></S>;
export const IBell = (p: P) => <S {...p}><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></S>;
export const IMoon = (p: P) => <S {...p}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" /></S>;
export const ISun = (p: P) => <S {...p}><circle cx="12" cy="12" r="3.8" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" /></S>;
export const ISunrise = (p: P) => <S {...p}><path d="M7.5 16a4.5 4.5 0 0 1 9 0M3.5 19.5h17M12 4.5v4M9.5 7 12 4.5 14.5 7M5 11l1.4 1.4M19 11l-1.4 1.4" /></S>;
export const IInfinity = (p: P) => <S {...p}><path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4Zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4Z" /></S>;
export const IShuffle = (p: P) => <S {...p}><path d="M4 7.5h3.5c4.5 0 4.5 9 9 9H20M4 16.5h3.5c1.6 0 2.6-1.1 3.5-2.6M13 10.1c.9-1.5 1.9-2.6 3.5-2.6H20M17.5 5 20 7.5 17.5 10M17.5 14 20 16.5 17.5 19" /></S>;
export const IListOrdered = (p: P) => <S {...p}><path d="M10 6.5h10M10 12h10M10 17.5h10M4.5 5.5l1-.5v3.5M4 12.5c0-1 2-1.5 2 0 0 .8-2 1.7-2 2.5h2M4 16.5h2l-1 1.2c1 0 1.2.6 1.2 1s-.5 1-1.2 1-1-.3-1-.6" /></S>;
export const ILock = (p: P) => <S {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></S>;
export const IGrowth = (p: P) => <S {...p}><path d="M12 20v-8" /><path d="M12 12c0-3.5 2.5-6 6.5-6 0 4-2.6 6-6.5 6Z" /><path d="M12 14.5c0-2.8-2-4.8-5.5-4.8 0 3.2 2.1 4.8 5.5 4.8Z" /><path d="M7.5 20h9" /></S>;

// ---------- Clima ----------
export const ICloud = (p: P) => <S {...p}><path d="M7 18.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 9.6 4.5 4.5 0 0 0 7 18.5Z" /></S>;
export const ICloudSun = (p: P) => <S {...p}><path d="M9 4.5v1.3M4.5 9H3.2M5.8 5.8l.9.9M12.2 5.8l-.9.9" /><path d="M6.6 10.6A3 3 0 0 1 11.7 8" /><path d="M9 19.5h8.5a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9-.9A3.9 3.9 0 0 0 9 19.5Z" /></S>;
export const ICloudMoon = (p: P) => <S {...p}><path d="M12.5 4.5a4.5 4.5 0 0 0 5.6 5.6A4.6 4.6 0 0 1 12.5 4.5Z" /><path d="M7.5 19.5h8.5a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9-.9A3.9 3.9 0 0 0 7.5 19.5Z" /></S>;
export const IRain = (p: P) => <S {...p}><path d="M7 15.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 6.6 4.5 4.5 0 0 0 7 15.5Z" /><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" /></S>;
export const IStorm = (p: P) => <S {...p}><path d="M7 15h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 6.1 4.5 4.5 0 0 0 7 15Z" /><path d="m12.5 15-2 3.5h3l-2 3.5" /></S>;
export const IFog = (p: P) => <S {...p}><path d="M7 12.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 3.6" /><path d="M4 15.5h16M6 18.5h12M8 21h8" /></S>;
export const ISnow = (p: P) => <S {...p}><path d="M7 14.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 5.6 4.5 4.5 0 0 0 7 14.5Z" /><path d="M9 18h.01M12 20h.01M15 18h.01M12 17h.01" strokeWidth="2.4" /></S>;
export const IPin = (p: P) => <S {...p}><path d="M12 20.5s6-5.4 6-10.5a6 6 0 0 0-12 0c0 5.1 6 10.5 6 10.5Z" /><circle cx="12" cy="10" r="2.2" /></S>;
export const ISliders = (p: P) => <S {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></S>;
export const IHeart = (p: P) => <S {...p}><path d="M12 19.5s-7-4.3-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.2c0 5-7 9.3-7 9.3Z" /></S>;

/* ── ramos e leis (monocromáticos) ── */
/** Urna eletrônica: tela à esquerda, teclado à direita. */
export const IUrna = (p: P) => <S {...p}><rect x="2.5" y="7" width="19" height="11" rx="2" /><rect x="5" y="9.5" width="7" height="5" rx=".8" /><path d="M14.5 10h.01M16.5 10h.01M18.5 10h.01M14.5 12h.01M16.5 12h.01M18.5 12h.01M14.5 14.5h4" strokeWidth={2.1} /><path d="M6 18v2.5M18 18v2.5" /></S>;
export const ITree = (p: P) => <S {...p}><path d="M12 3.5c-3 0-5.2 2.3-5.2 5 0 .7.1 1.3.4 1.9A4 4 0 0 0 8 18h8a4 4 0 0 0 .8-7.6c.3-.6.4-1.2.4-1.9 0-2.7-2.2-5-5.2-5Z" /><path d="M12 11v9.5M12 14.5l-2.5-2M12 13l2.5-2" /></S>;
export const ICart = (p: P) => <S {...p}><path d="M3.5 4.5h2.2l2 11h10.5l1.8-8H7" /><circle cx="9" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></S>;
export const IChild = (p: P) => <S {...p}><circle cx="12" cy="5.5" r="2.3" /><path d="M7 10.5c1.6-1 3.2-1.5 5-1.5s3.4.5 5 1.5M12 9v6M9.5 20.5 12 15l2.5 5.5" /></S>;
export const ICane = (p: P) => <S {...p}><circle cx="10" cy="4.8" r="2" /><path d="M10 7.5v6l-2.5 7M10 13.5l2.5 7M7 10.5l3-1.5 3 2M16 10.5a1.8 1.8 0 0 1 3.6 0V21" /></S>;
export const ICar = (p: P) => <S {...p}><path d="M4.5 16.5v-4l1.8-4.6A2 2 0 0 1 8.2 6.5h7.6a2 2 0 0 1 1.9 1.4l1.8 4.6v4" /><path d="M3.5 12.5h17v4h-17Z" /><path d="M6 16.5v2M18 16.5v2M7 14.5h.01M17 14.5h.01" /></S>;
export const IHouse = (p: P) => <S {...p}><path d="M4 11 12 4.5l8 6.5" /><path d="M6 9.5v10h12v-10" /><rect x="10" y="13" width="4" height="6.5" rx=".6" /></S>;
export const IPill = (p: P) => <S {...p}><rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-40 12 12)" /><path d="m9.7 9.3 5 4.2" /></S>;
export const IHandshake = (p: P) => <S {...p}><path d="m3 11 3.5-3.5 3 1.5 2.5-1.5 3 .5L21 11" /><path d="m6.5 7.5 6.5 7a1.5 1.5 0 0 0 2.2-2l-3-3.2" /><path d="m9.5 12.5 3 3.2a1.5 1.5 0 0 0 2.2-2M7.5 14.5l2.5 2.6a1.5 1.5 0 0 0 2.2-2M3 11l3 3.2" /></S>;
export const ICopyright = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.6a3.5 3.5 0 1 0 0 4.8" /></S>;
export const IPhone = (p: P) => <S {...p}><path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" /></S>;
export const IShieldLock = (p: P) => <S {...p}><path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.7 7 9 4.1-1.3 7-4.7 7-9V6Z" /><rect x="9" y="11" width="6" height="4.5" rx="1" /><path d="M10.2 11V9.6a1.8 1.8 0 0 1 3.6 0V11" /></S>;
export const ICoin = (p: P) => <S {...p}><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></S>;
export const IHardhat = (p: P) => <S {...p}><path d="M4 16.5a8 8 0 0 1 16 0" /><path d="M2.5 16.5h19v2.5h-19ZM10 8.7V5.5h4v3.2M10 16.5v-5M14 16.5v-5" /></S>;
export const ICity = (p: P) => <S {...p}><path d="M3.5 20.5h17M5 20.5V9l5-2.5v14M10 20.5V4l6 2.5v14M16 20.5V11l3.5 1.5v8" /><path d="M7.3 11h.01M7.3 14h.01M12.8 9h.01M12.8 12h.01M12.8 15h.01" strokeWidth={2.1} /></S>;
export const IDoc = (p: P) => <S {...p}><path d="M6.5 3.5h7.5l4 4v13h-11.5Z" /><path d="M13.5 3.5V8h4.5M9.5 12h5M9.5 15h5M9.5 18h3" /></S>;
export const ITimer = (p: P) => <S {...p}><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V9.5M9.5 3.5h5M18 7l1.5-1.5" /></S>;
export const ITomato = (p: P) => <S {...p}><path d="M12 7.5c4.4 0 7.5 2.6 7.5 6.3S16.4 20 12 20s-7.5-2.5-7.5-6.2S7.6 7.5 12 7.5Z" /><path d="M12 7.5 9.5 5.5M12 7.5l2.5-2M12 7.5V4" /></S>;
export const IPunch = (p: P) => <S {...p}><rect x="4" y="4.5" width="16" height="15.5" rx="2.5" /><path d="M4 9h16M8.5 2.5v4M15.5 2.5v4" /><path d="m9 14 2 2 4-4" /></S>;
export const IPodium = (p: P) => <S {...p}><path d="M3.5 20.5v-6h5.5v6M9 20.5V10h6v10.5M15 20.5v-4h5.5v4M2.5 20.5h19" /><path d="m12 4 .8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.3Z" /></S>;
export const IGroup = (p: P) => <S {...p}><circle cx="9" cy="8.5" r="3" /><circle cx="17" cy="9.5" r="2.4" /><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6M15 14.6c2.6-.3 4.5 1.1 5.5 3.9" /></S>;
export const IGlobe = (p: P) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5Z" /></S>;
export const IMail = (p: P) => <S {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.2" /><path d="m4.5 7 7.5 6 7.5-6" /></S>;
export const ITrash = (p: P) => <S {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 10.5v6M14 10.5v6" /></S>;
export const IEye = (p: P) => <S {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></S>;
export const IText = (p: P) => <S {...p}><path d="M5 7V5h14v2M12 5v14M9 19h6" /></S>;
export const IDownload = (p: P) => <S {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></S>;
