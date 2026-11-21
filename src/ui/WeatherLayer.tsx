// Efeitos de clima no fundo: pingos de chuva, relâmpagos discretos, neblina e neve.
// Fica atrás do conteúdo e some com "Reduzir movimento" ou no modo desempenho.
import { memo } from 'react';
import { useAmbient } from './ambient';
import { isLowPerformance, reducedMotion, useSettings } from './settings';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

const Drops = memo(function Drops({ n, heavy }: { n: number; heavy: boolean }) {
  const r = rng(11);
  return (
    <div className="wx-rain">
      {Array.from({ length: n }, (_, i) => {
        const dur = (heavy ? 0.55 : 0.8) + r() * 0.6;
        return <i key={i} style={{ left: `${r() * 104 - 2}%`, animationDuration: `${dur}s`, animationDelay: `${-r() * 3}s`, opacity: 0.18 + r() * 0.32, height: `${10 + r() * 14}px` }} />;
      })}
    </div>
  );
});

const Flakes = memo(function Flakes() {
  const r = rng(23);
  return <div className="wx-snow">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ left: `${r() * 100}%`, animationDuration: `${7 + r() * 8}s`, animationDelay: `${-r() * 12}s`, width: `${2 + r() * 3}px`, height: `${2 + r() * 3}px`, opacity: 0.3 + r() * 0.4 }} />)}</div>;
});

export function WeatherLayer() {
  const { wx, rain } = useAmbient();
  const { weather } = useSettings();
  if (!weather.on || !wx || reducedMotion() || isLowPerformance()) return null;
  if (rain === 'drizzle') return <Drops n={18} heavy={false} />;
  if (rain === 'heavy') return <Drops n={52} heavy />;
  if (wx === 'rain') return <Drops n={34} heavy={false} />;
  if (wx === 'fog') return <div className="wx-fog"><i /><i /></div>;
  if (wx === 'snow') return <Flakes />;
  return null;
}
