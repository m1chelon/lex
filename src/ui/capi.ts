import { capiWeatherOf, type Ambient, type CapiWeather, type Period } from './ambient';
import type { WeatherLocation } from './locations';

export type CapiReaction = 'correct' | 'incorrect' | 'first' | 'recovered';
export type Ritual = 'terere' | 'chimarrao' | 'acai';
export type Mood = 'happy' | 'cheer' | 'think' | 'sad' | 'sleep' | 'grumpy' | 'proud';

export function capiScene(ambient: Ambient, location: WeatherLocation, visible = true) {
  if (!visible || !location.on) return { effect: null, wind: false };
  const region = location.uf;
  const effect = capiWeatherOf(ambient, true);
  const wind = (ambient.weather?.wind ?? 0) >= 25;
  const sheltered = effect !== 'rain' && effect !== 'storm';
  const ritual: Ritual | undefined = sheltered
    ? region === 'RS' ? 'chimarrao'
      : region === 'PA' && ambient.temp !== 'cold' ? 'acai'
        : effect === 'sun' || effect === 'warm' || (region === 'MS' && ambient.temp !== 'cold') ? 'terere' : undefined
    : undefined;
  return { region, effect, ritual, wind, rain: ambient.rain };
}

export const RITUAL_NAME: Record<Ritual, string> = { terere: 'tereré', chimarrao: 'chimarrão', acai: 'açaí com farinha' };
export type CapiScene = ReturnType<typeof capiScene>;
export const CAPI_WEATHER_LABEL: Record<CapiWeather, string> = {
  sun: 'ao sol', warm: 'no calor', cloud: 'sob nuvens', rain: 'com guarda-chuva',
  storm: 'segurando o guarda-chuva na tempestade', cold: 'com frio', fog: 'na neblina', snow: 'na neve',
};

export function mascotLine(s: {
  streak: number; due: number; todayMin: number; todayCount: number; goal: number;
  lastPracticeAt?: number | null; studying?: boolean;
}, now = new Date(), period?: Period): { mood: Mood; text: string } {
  if (s.todayMin >= s.goal) return { mood: 'cheer', text: `Meta de hoje cumprida! Foram ${s.todayMin} minutos de estudo.` };
  if (s.todayCount >= 12) return { mood: 'cheer', text: `${s.todayCount} questões hoje! Mandou bem demais.` };
  if (s.lastPracticeAt && !s.todayCount && +now - s.lastPracticeAt >= 3 * 86_400_000) {
    return { mood: 'grumpy', text: 'Até fiz bico de tanta saudade. Bora fazer uma questão juntos?' };
  }
  if (s.studying) return { mood: 'think', text: 'Estou de olho na próxima questão. Vamos de onde paramos?' };
  if (period === 'madrugada' || (!period && now.getHours() < 5)) return { mood: 'sleep', text: 'Já é tarde. Uma revisão rápida e cama?' };
  if (s.streak >= 5) return { mood: 'proud', text: `${s.streak} dias seguidos! Dá orgulho de ver esse ritmo.` };
  if (s.due >= 20) return { mood: 'think', text: `Separei ${s.due} questões que estão na hora de revisar.` };
  if (s.streak === 0 && s.todayMin === 0) return { mood: 'happy', text: 'Bora começar? Vamos treinar um artigo juntos.' };
  return { mood: 'happy', text: `Faltam ${Math.max(1, s.goal - s.todayMin)} minutos para a meta de hoje. Vamos nessa?` };
}
