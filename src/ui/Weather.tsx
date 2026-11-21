import { useState } from 'react';
import { useAmbient } from './ambient';
import { ICloud, ICloudMoon, ICloudSun, IFog, IMoon, IPin, IRain, ISnow, IStorm, ISun } from './icons';
import { locationLabel, ufOf, type UF } from './locations';
import { Sheet, toast } from './primitives';
import { haptic, setSettings, useSettings } from './settings';

function iconFor(code: number, day: boolean, size = 18) {
  if (code === 0) return day ? <ISun size={size} /> : <IMoon size={size} />;
  if (code <= 2) return day ? <ICloudSun size={size} /> : <ICloudMoon size={size} />;
  if (code === 3) return <ICloud size={size} />;
  if (code === 45 || code === 48) return <IFog size={size} />;
  if (code >= 95) return <IStorm size={size} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <ISnow size={size} />;
  return <IRain size={size} />;
}
export function weatherLabel(code: number) {
  if (code === 0) return 'céu limpo';
  if (code <= 2) return 'parcialmente nublado';
  if (code === 3) return 'nublado';
  if (code === 45 || code === 48) return 'neblina';
  if (code >= 95) return 'trovoadas';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'neve';
  if (code === 65 || code === 67 || code === 82) return 'chuva forte';
  if (code >= 80) return 'pancadas de chuva';
  if (code >= 61) return 'chuva';
  if (code >= 51) return 'garoa';
  return 'tempo instável';
}

export function WeatherChip() {
  const { weather } = useSettings();
  const now = useAmbient().weather;
  const [open, setOpen] = useState(false);
  if (!weather.on) return null;
  const place = locationLabel(weather);
  return (
    <>
      <button className="weather-chip" onClick={() => { haptic('soft'); setOpen(true); }}
        aria-label={now ? `${now.t} graus, ${weatherLabel(now.code)} em ${place}. Alterar local do clima` : place ? 'Clima e localização' : 'Mostrar o clima'}>
        {now ? <>{iconFor(now.code, now.day, 17)}<span>{now.t}°</span></> : <><ICloudSun size={16} /><span className="xsmall">{place ? 'Clima' : '+ clima'}</span></>}
      </button>
      <WeatherSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Relógio discreto ao lado do cumprimento. */
export function Clock() {
  const { now, weather } = useAmbient();
  const time = localTime(now, weather?.timezone);
  return <time className="clock" dateTime={now.toISOString()} aria-label={`Hora local, ${time}`}>{time}</time>;
}

function localTime(date: Date, timeZone?: string) {
  const options = { hour: '2-digit', minute: '2-digit' } as const;
  try { return date.toLocaleTimeString('pt-BR', { ...options, timeZone }); }
  catch { return date.toLocaleTimeString('pt-BR', options); }
}

type City = { id: number; latitude: number; longitude: number; name: string; admin1?: string; country?: string; country_code?: string };
const cityLabel = (city: City) => [city.name, city.admin1 ?? city.country].filter(Boolean).join(' – ');

function WeatherSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { weather } = useSettings();
  const current = useAmbient().weather;
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<City[]>([]);
  const save = (lat: number, lon: number, city?: string, uf?: UF) => {
    setSettings({ weather: { on: true, lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, city, uf } });
    setResults([]); setQ('');
    onClose(); haptic('ok');
  };
  const gps = () => {
    if (!navigator.geolocation) { toast('Localização indisponível neste aparelho'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition((p) => { setBusy(false); save(p.coords.latitude, p.coords.longitude); }, () => { setBusy(false); toast('Sem permissão de localização — digite sua cidade'); }, { maximumAge: 3600000, timeout: 12000 });
  };
  const search = async () => {
    if (q.trim().length < 2 || busy) return;
    setBusy(true);
    setResults([]);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=8&language=pt&format=json`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Busca indisponível');
      const data = await response.json();
      const cities = (data.results as City[] | undefined)?.filter(({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude)) ?? [];
      if (!cities.length) toast('Cidade não encontrada');
      else setResults(cities.sort((a, b) => Number(b.country_code === 'BR') - Number(a.country_code === 'BR')));
    } catch { toast('Sem conexão para buscar a cidade'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} label="Clima e localização">
      <div className="stack weather-settings">
        <h2 className="title-m">Clima e localização</h2>
        <p className="small muted">O ambiente e o Capi acompanham o mesmo local.</p>
        {weather.lat !== undefined && <div className="weather-current">
          <strong>{locationLabel(weather)}</strong>
          {current ? <>
            <span className="row">{iconFor(current.code, current.day)} {current.t}° · {weatherLabel(current.code)}</span>
            <span className="small muted">{current.feels !== undefined && `Sensação de ${current.feels}°`}{current.feels !== undefined && current.wind !== undefined && ' · '}{current.wind !== undefined && `Vento de ${current.wind} km/h`}</span>
            <span className="xsmall muted">Atualizado às {localTime(new Date(current.at), current.timezone)}</span>
          </> : <span className="small muted">Aguardando dados do clima</span>}
        </div>}
        <button className="btn btn-quiet" onClick={gps} disabled={busy}><IPin size={18} /> Usar minha localização</button>
        <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <input className="input grow" placeholder="Digite uma cidade" value={q} disabled={busy} onChange={(e) => { setQ(e.target.value); setResults([]); }} aria-label="Cidade" />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy || q.trim().length < 2} style={{ minHeight: 52 }}>Buscar</button>
        </form>
        {busy && <span className="small muted" role="status">Buscando localização…</span>}
        {results.length > 0 && <ul className="weather-places" aria-label="Cidades encontradas">{results.map((city) => <li key={city.id}>
          <button className="btn btn-quiet btn-block" onClick={() => save(city.latitude, city.longitude, cityLabel(city), city.country_code === 'BR' ? ufOf(city.admin1) : undefined)}>{cityLabel(city)}</button>
        </li>)}</ul>}
        <button className="small muted weather-disable" onClick={() => { setSettings({ weather: { ...weather, on: false } }); onClose(); }}>Desativar clima e localização</button>
      </div>
    </Sheet>
  );
}
