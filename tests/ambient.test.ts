import { describe, expect, it, vi } from 'vitest';
import { capiWeatherOf, deriveAmbient, getAmbient, periodOf, rainOf, startAmbient, wxOf, type Ambient, type CapiWeather } from '../src/ui/ambient';
import { capiScene, mascotLine } from '../src/ui/capi';
import { stateAt, ufOf } from '../src/ui/locations';
import { setSettings } from '../src/ui/settings';

describe('clima e expressões do Capi', () => {
  it.each([
    [0, 28, true, 'sun'],
    [2, 31, true, 'warm'],
    [0, 33, false, 'warm'],
    [2, 21, true, 'cloud'],
    [0, 14, true, 'cold'],
    [63, 30, true, 'rain'],
    [95, 30, false, 'storm'],
    [45, 20, true, 'fog'],
    [73, 2, true, 'snow'],
    [0, 20, false, null],
  ] satisfies [number, number, boolean, CapiWeather | null][])('seleciona a reação para código %i e %i °C', (code, t, day, expected) => {
    const now = new Date(2026, 0, 1, day ? 10 : 22);
    const data: Ambient = { now, period: periodOf(now), weather: { code, t, day, at: now.getTime() }, wx: wxOf(code), temp: t >= 28 ? 'hot' : t <= 16 ? 'cold' : 'mild' };
    expect(capiWeatherOf(data, true)).toBe(expected);
    expect(capiWeatherOf(data, false)).toBeNull();
  });

  it.each([[4, 'madrugada'], [5, 'manha'], [12, 'tarde'], [18, 'noite']] as const)('atualiza a luz às %i horas', (hour, period) => {
    expect(periodOf(new Date(2026, 0, 1, hour))).toBe(period);
  });

  it('combina o clima e os hábitos locais sem alterar o guarda-roupa', () => {
    const now = new Date('2026-06-21T20:00:00Z');
    const hot = deriveAmbient(now, { t: 25, feels: 31, code: 0, day: true, at: +now, timezone: 'America/Campo_Grande' });
    const rainy = deriveAmbient(now, { t: 19, feels: 13, code: 65, wind: 36, day: true, at: +now });
    expect(capiScene(hot, { on: true, uf: 'MS' })).toMatchObject({ effect: 'sun', ritual: 'terere' });
    expect(capiScene(rainy, { on: true, uf: 'RS' })).toMatchObject({ effect: 'rain', wind: true, ritual: undefined });
    expect(capiScene(hot, { on: true, uf: 'PA' }).ritual).toBe('acai');
    expect(capiScene(rainy, { on: false, uf: 'RS' })).toEqual({ effect: null, wind: false });
    expect(capiScene(hot, { on: true, uf: 'SP' }).ritual).toBe('terere');
    expect(capiScene(hot, { on: true, uf: 'SP' }, false)).toEqual({ effect: null, wind: false });
  });

  it('reage a uma pausa longa, a uma retomada e ao progresso do dia', () => {
    const now = new Date(2026, 10, 21, 14);
    const stats = { streak: 0, due: 0, todayMin: 0, todayCount: 0, goal: 15 };
    expect(mascotLine(stats, now).mood).toBe('happy');
    expect(mascotLine({ ...stats, lastPracticeAt: +now - 4 * 86_400_000, studying: true }, now).mood).toBe('grumpy');
    expect(mascotLine({ ...stats, studying: true, todayCount: 1 }, now).mood).toBe('think');
    expect(mascotLine({ ...stats, todayCount: 12 }, now).mood).toBe('cheer');
    expect(mascotLine({ ...stats, streak: 5 }, now).mood).toBe('proud');
  });

  it('diferencia garoa, chuva e chuva forte', () => {
    expect([51, 63, 65, 82, 95, 0].map(rainOf)).toEqual(['drizzle', 'rain', 'heavy', 'heavy', 'heavy', undefined]);
  });

  it('faz a transição ao anoitecer conforme o pôr do sol local', () => {
    const sunrise = Date.parse('2026-06-21T10:00:00Z');
    const sunset = Date.parse('2026-06-21T20:30:00Z');
    const forecast = { t: 22, code: 0, day: true, at: sunset - 1000, sunrise, sunset, timezone: 'America/Sao_Paulo' };
    expect(deriveAmbient(new Date('2026-06-21T14:00:00Z'), forecast).period).toBe('manha');
    expect(deriveAmbient(new Date(sunset - 1), forecast)).toMatchObject({ period: 'tarde', light: 'twilight', weather: { day: true } });
    expect(deriveAmbient(new Date(sunset), forecast)).toMatchObject({ period: 'noite', light: 'twilight', weather: { day: false } });
  });

  it('identifica UF pela geocodificação e pela malha do GPS', () => {
    expect(['Mato Grosso do Sul', 'BR-RS', 'Para', 'Paraná', 'Washington'].map(ufOf)).toEqual(['MS', 'RS', 'PA', 'PR', undefined]);
    const feature = { properties: { codarea: '50' }, geometry: {
      type: 'Polygon' as const, coordinates: [[[-58, -24], [-52, -24], [-52, -17], [-58, -17], [-58, -24]] as [number, number][]],
    } };
    expect(stateAt([feature], -20.47, -54.62)).toBe('MS');
    expect(stateAt([feature], -30.03, -51.21)).toBeUndefined();
  });

  it('descarta a previsão da cidade anterior mesmo se ela chegar depois da troca', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', { addEventListener: vi.fn() });
    vi.stubGlobal('document', { documentElement: { dataset: {} }, addEventListener: vi.fn(), querySelector: () => null });
    const requests: ((data: Response) => void)[] = [];
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => requests.push(resolve))));
    const forecast = (temp: number) => new Response(JSON.stringify({
      current: { temperature_2m: temp, apparent_temperature: temp, weather_code: 0, is_day: 1 }, timezone: 'America/Sao_Paulo',
    }));
    try {
      startAmbient();
      setSettings({ weather: { on: true, lat: -20.47, lon: -54.62, city: 'Campo Grande', uf: 'MS' } });
      setSettings({ weather: { on: true, lat: -30.03, lon: -51.21, city: 'Porto Alegre', uf: 'RS' } });
      expect(requests).toHaveLength(2);
      requests[1](forecast(14));
      await vi.advanceTimersByTimeAsync(1);
      expect(getAmbient().weather?.t).toBe(14);
      requests[0](forecast(33));
      await vi.advanceTimersByTimeAsync(1);
      expect(getAmbient().weather?.t).toBe(14);
    } finally {
      setSettings({ weather: { on: true } });
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
