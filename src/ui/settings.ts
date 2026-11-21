import { useSyncExternalStore } from 'react';
import type { Level } from '../content/types';
import type { AreaId } from '../core/areas';
import { PROFILE_SETTINGS_KEY, profileStorageKey } from '../data/profiles';
import { ufOf, type WeatherLocation } from './locations';

export interface Settings {
  level: Level;
  dailyMinutes: number;
  lawFont: 'sans' | 'serif';
  textSize: 'm' | 'l' | 'xl';
  transparency: 'auto' | 'full' | 'reduced';
  motion: 'auto' | 'full' | 'reduced';
  perf: 'auto' | 'low';
  haptics: boolean;
  underlineAll: boolean;
  area: AreaId;
  provarMix: 'literal' | 'casos' | 'ambos';
  /** Temperatura de cor: Aura (fria, azul-noite), Clássico (quente, grafite e ouro) ou automático (quente à noite). */
  theme: 'aura' | 'estudio' | 'classico' | 'auto'; // legado: o app usa só o tema Aura
  /** Como a Capi chama o jogador. */
  name: string;
  /** Horário preferido de estudo. */
  when: 'manha' | 'tarde' | 'noite';
  /** Localidade usada pelo clima e pelas variações regionais do Capi. */
  weather: WeatherLocation;
  /** Bem-estar (check-in de humor e respiração): pode ser desligado. */
  wellbeing: boolean;
  studyFocus: boolean;
}
const DEFAULTS: Settings = { level: 'simples', dailyMinutes: 15, lawFont: 'sans', textSize: 'm', transparency: 'auto', motion: 'auto', perf: 'auto', haptics: true, underlineAll: false, area: 'geral', provarMix: 'ambos', theme: 'aura', name: '', when: 'noite', weather: { on: true }, wellbeing: true, studyFocus: false };
function normalizedSettings(value: Partial<Settings>): Settings {
  return {
    level: ['simples', 'tecnico', 'concurso'].includes(value.level ?? '') ? value.level! : DEFAULTS.level,
    dailyMinutes: typeof value.dailyMinutes === 'number' && Number.isFinite(value.dailyMinutes) && value.dailyMinutes > 0 ? value.dailyMinutes : DEFAULTS.dailyMinutes,
    lawFont: value.lawFont === 'serif' ? 'serif' : DEFAULTS.lawFont,
    textSize: value.textSize === 'l' || value.textSize === 'xl' ? value.textSize : DEFAULTS.textSize,
    transparency: value.transparency === 'full' || value.transparency === 'reduced' ? value.transparency : DEFAULTS.transparency,
    motion: value.motion === 'full' || value.motion === 'reduced' ? value.motion : DEFAULTS.motion,
    perf: value.perf === 'low' ? 'low' : DEFAULTS.perf,
    haptics: typeof value.haptics === 'boolean' ? value.haptics : DEFAULTS.haptics,
    underlineAll: value.underlineAll === true,
    area: value.area === 'tjsp' || value.area === 'tjms' ? value.area : DEFAULTS.area,
    provarMix: value.provarMix === 'literal' || value.provarMix === 'casos' ? value.provarMix : DEFAULTS.provarMix,
    theme: 'aura',
    name: typeof value.name === 'string' ? value.name.slice(0, 24) : '',
    when: value.when === 'manha' || value.when === 'tarde' ? value.when : DEFAULTS.when,
    weather: {
      on: typeof value.weather?.on === 'boolean' ? value.weather.on : DEFAULTS.weather.on,
      lat: Number.isFinite(value.weather?.lat) && Math.abs(value.weather!.lat!) <= 90 ? value.weather!.lat : undefined,
      lon: Number.isFinite(value.weather?.lon) && Math.abs(value.weather!.lon!) <= 180 ? value.weather!.lon : undefined,
      city: typeof value.weather?.city === 'string' ? value.weather.city : undefined,
      uf: ufOf(value.weather?.uf) ?? (typeof value.weather?.city === 'string' ? ufOf(value.weather.city.split(' – ')[1]) : undefined),
    },
    wellbeing: typeof value.wellbeing === 'boolean' ? value.wellbeing : DEFAULTS.wellbeing,
    studyFocus: value.studyFocus === true,
  };
}

export function readProfileSettings(id?: string): Settings {
  try { return normalizedSettings(JSON.parse(localStorage.getItem(profileStorageKey(PROFILE_SETTINGS_KEY, id)) || '{}') ?? {}); }
  catch { return DEFAULTS; }
}

const KEY = profileStorageKey(PROFILE_SETTINGS_KEY);
let state = readProfileSettings();
const subs = new Set<() => void>();
export function subscribeSettings(fn: () => void) { subs.add(fn); return () => subs.delete(fn); }

function apply() {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.dataset.lawfont = state.lawFont;
  r.dataset.textsize = state.textSize;
  if (state.transparency === 'auto') delete r.dataset.transparency; else r.dataset.transparency = state.transparency;
  if (state.motion === 'auto') delete r.dataset.motion; else r.dataset.motion = state.motion;
  if (isLowPerformance()) r.dataset.perf = 'low'; else delete r.dataset.perf;
  r.dataset.theme = effectiveTheme();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#0e1324');
}
/** Tema em uso agora: no automático, Aura (fria) das 6h às 18h e Clássico (quente) à noite. */
export function effectiveTheme(): 'aura' {
  return 'aura';
}
export function isLowPerformance() {
  if (state.perf === 'low') return true;
  if (typeof navigator === 'undefined') return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return (memory !== undefined && memory <= 2) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2);
}
if (typeof document !== 'undefined') apply();

export function setSettings(p: Partial<Settings>) {
  state = normalizedSettings({ ...state, ...p });
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  apply();
  subs.forEach((f) => f());
}
export const getSettings = () => state;
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, () => state, () => state);
}
export function reducedMotion() {
  if (state.studyFocus && typeof document !== 'undefined' && document.documentElement.dataset.study === '1') return true;
  if (state.motion === 'reduced') return true;
  if (state.motion === 'full') return false;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function haptic(kind: 'tap' | 'ok' | 'bad' | 'soft' = 'tap') {
  if (!state.haptics || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  const pattern = { tap: 8, soft: 4, ok: [10, 40, 14], bad: [28, 50, 28] }[kind];
  try { navigator.vibrate(pattern as number | number[]); } catch { /* sem suporte */ }
}
