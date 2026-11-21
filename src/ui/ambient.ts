import { useSyncExternalStore } from 'react';
import { profileStorageKey } from '../data/profiles';
import { stateFromGps, type WeatherLocation } from './locations';
import { getSettings, setSettings, subscribeSettings } from './settings';

export type Period = 'manha' | 'tarde' | 'noite' | 'madrugada';
export type Wx = 'clear' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow';
export type Rain = 'drizzle' | 'rain' | 'heavy';
export interface WeatherNow {
  t: number;
  code: number;
  day: boolean;
  at: number;
  feels?: number;
  wind?: number;
  timezone?: string;
  sunrise?: number;
  sunset?: number;
}
export interface Ambient {
  period: Period;
  now: Date;
  weather: WeatherNow | null;
  wx: Wx | null;
  temp: 'hot' | 'cold' | 'mild' | null;
  light?: 'day' | 'twilight' | 'night';
  rain?: Rain;
}

const CACHE = profileStorageKey('lex.weather');
const TTL = 20 * 60 * 1000;

function hourOf(d: Date, timezone?: string) {
  if (timezone) {
    try { return Number(new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(d)); }
    catch { /* usa o fuso do aparelho */ }
  }
  return d.getHours();
}

export function periodOf(d = new Date()): Period {
  const h = d.getHours();
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

export function wxOf(code: number): Wx {
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  return 'rain';
}

export function rainOf(code: number): Rain | undefined {
  if (wxOf(code) === 'storm' || code === 65 || code === 67 || code === 82) return 'heavy';
  if (wxOf(code) !== 'rain') return undefined;
  return code >= 51 && code <= 57 ? 'drizzle' : 'rain';
}

const locationKey = ({ on, lat, lon }: WeatherLocation) => on && lat !== undefined && lon !== undefined ? lat + ':' + lon : null;

function readCache(key: string | null): WeatherNow | null {
  if (!key) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (saved?.key === key && Number.isFinite(saved.weather?.at) && Date.now() - saved.weather.at < TTL * 6) return saved.weather;
  } catch { /* armazenamento indisponível */ }
  return null;
}

export function deriveAmbient(now: Date, weather: WeatherNow | null): Ambient {
  const wx = weather ? wxOf(weather.code) : null;
  const feels = weather?.feels ?? weather?.t;
  const temp = feels === undefined ? null : feels >= 28 ? 'hot' : feels <= 16 ? 'cold' : 'mild';
  const hour = hourOf(now, weather?.timezone);
  const time = now.getTime();
  const sunrise = weather?.sunrise;
  const sunset = weather?.sunset;
  const knownSun = sunrise !== undefined && sunset !== undefined && Math.abs(time - sunrise) < 86400000;
  const day = knownSun ? time >= sunrise && time < sunset : weather?.day;
  const twilight = knownSun && Math.min(Math.abs(time - sunrise), Math.abs(time - sunset)) < 35 * 60000;
  const period = day === undefined ? periodOf(now) : day ? (hour < 12 ? 'manha' : 'tarde') : (hour < 12 ? 'madrugada' : 'noite');
  return {
    now, period, weather: weather && day !== undefined && day !== weather.day ? { ...weather, day } : weather, wx, temp,
    light: twilight ? 'twilight' : period === 'manha' || period === 'tarde' ? 'day' : 'night',
    rain: weather ? rainOf(weather.code) : undefined,
  };
}

let key = locationKey(getSettings().weather);
let state = deriveAmbient(new Date(), readCache(key));
const subs = new Set<() => void>();

function apply() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.period = state.period;
  root.dataset.light = state.light ?? 'night';
  if (state.wx) root.dataset.wx = state.wx; else delete root.dataset.wx;
  if (state.temp) root.dataset.temp = state.temp; else delete root.dataset.temp;
  if (state.rain) root.dataset.rain = state.rain; else delete root.dataset.rain;
}
function update(weather: WeatherNow | null) {
  state = deriveAmbient(new Date(), weather);
  apply();
  subs.forEach((fn) => fn());
}

let request: AbortController | undefined;
let resolvingUf: string | null = null;

async function resolveUf(location: WeatherLocation, locationId: string) {
  if (location.city || location.uf || resolvingUf === locationId) return;
  resolvingUf = locationId;
  try {
    const uf = await stateFromGps(location.lat!, location.lon!);
    const latest = getSettings().weather;
    if (uf && locationKey(latest) === locationId && !latest.uf && !latest.city) setSettings({ weather: { ...latest, uf } });
  } catch { /* o clima continua disponível; o local também pode ser escolhido pela cidade */ }
}

export async function refreshWeather() {
  const location = getSettings().weather;
  const locationId = locationKey(location);
  if (!locationId || request || (state.weather && Date.now() - state.weather.at < TTL)) return;
  void resolveUf(location, locationId);
  const controller = new AbortController();
  request = controller;
  const params = new URLSearchParams({
    latitude: String(location.lat), longitude: String(location.lon),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',
    daily: 'sunrise,sunset', forecast_days: '1', timezone: 'auto', timeformat: 'unixtime',
  });
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: controller.signal });
    if (!response.ok) return;
    const { current, daily, timezone } = await response.json();
    if (controller.signal.aborted || locationKey(getSettings().weather) !== locationId
      || !Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.weather_code)) return;
    const weather: WeatherNow = {
      t: Math.round(current.temperature_2m), code: current.weather_code, day: current.is_day === 1, at: Date.now(),
      feels: Number.isFinite(current.apparent_temperature) ? Math.round(current.apparent_temperature) : undefined,
      wind: Number.isFinite(current.wind_speed_10m) ? Math.round(current.wind_speed_10m) : undefined,
      timezone: typeof timezone === 'string' ? timezone : undefined,
      sunrise: Number.isFinite(daily?.sunrise?.[0]) ? daily.sunrise[0] * 1000 : undefined,
      sunset: Number.isFinite(daily?.sunset?.[0]) ? daily.sunset[0] * 1000 : undefined,
    };
    try { localStorage.setItem(CACHE, JSON.stringify({ key: locationId, weather })); } catch { /* sem armazenamento */ }
    update(weather);
  } catch { /* offline: mantém o último tempo dessa localidade */ }
  finally {
    clearTimeout(timeout);
    if (request === controller) request = undefined;
  }
}

function syncLocation() {
  const nextKey = locationKey(getSettings().weather);
  if (nextKey !== key) {
    key = nextKey;
    request?.abort();
    request = undefined;
    resolvingUf = null;
    update(readCache(nextKey));
  }
  if (key) void resolveUf(getSettings().weather, key);
  void refreshWeather();
}

async function updateDeviceLocation() {
  const location = getSettings().weather;
  const locationId = locationKey(location);
  if (!locationId || location.city || typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) return;
  try {
    if ((await navigator.permissions.query({ name: 'geolocation' })).state !== 'granted') return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const latest = getSettings().weather;
      if (locationKey(latest) !== locationId || latest.city) return;
      const lat = Math.round(coords.latitude * 100) / 100;
      const lon = Math.round(coords.longitude * 100) / 100;
      if (lat !== latest.lat || lon !== latest.lon) setSettings({ weather: { on: true, lat, lon } });
    }, () => { /* usa a última posição */ }, { maximumAge: 300000, timeout: 10000 });
  } catch { /* aparelhos sem consulta de permissão usam a última posição */ }
}

let started = false;
export function startAmbient() {
  if (started) return;
  started = true;
  subscribeSettings(syncLocation);
  apply();
  syncLocation();
  void updateDeviceLocation();
  setInterval(() => {
    const now = Date.now();
    const weather = state.weather && now - state.weather.at < TTL * 6 ? state.weather : null;
    if (Math.floor(now / 60000) !== Math.floor(state.now.getTime() / 60000)) update(weather);
  }, 30000);
  setInterval(() => { void refreshWeather(); }, TTL);
  window.addEventListener('online', () => { resolvingUf = null; syncLocation(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void updateDeviceLocation();
      void refreshWeather();
    }
  });
}

export const getAmbient = () => state;
export function useAmbient(): Ambient {
  return useSyncExternalStore((fn) => { subs.add(fn); return () => subs.delete(fn); }, getAmbient, getAmbient);
}

export type CapiWeather = 'sun' | 'warm' | 'cloud' | 'rain' | 'storm' | 'cold' | 'fog' | 'snow';

export function capiWeatherOf(a: Ambient, enabled = getSettings().weather.on): CapiWeather | null {
  if (!enabled || !a.weather) return null;
  if (a.wx === 'storm' || a.wx === 'rain' || a.wx === 'snow' || a.wx === 'fog') return a.wx;
  if (a.temp === 'cold') return 'cold';
  if (a.weather.day && a.wx === 'clear' && (a.weather.feels ?? a.weather.t) >= 22) return 'sun';
  if (a.temp === 'hot') return 'warm';
  if (a.wx === 'cloudy') return 'cloud';
  return null;
}
