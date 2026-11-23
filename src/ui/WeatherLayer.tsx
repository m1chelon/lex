import { memo, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAmbient, type Rain } from './ambient';
import { isLowPerformance, reducedMotion, useSettings } from './settings';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

const RAIN_STYLE: Record<Rain, { count: number; speed: number; length: number }> = {
  drizzle: { count: 14, speed: 2.4, length: 9 },
  rain: { count: 24, speed: 1.5, length: 17 },
  heavy: { count: 34, speed: 1, length: 23 },
};

const Drops = memo(function Drops({ intensity, windy }: { intensity: Rain; windy: boolean }) {
  const r = rng(11);
  const { count, speed, length } = RAIN_STYLE[intensity];
  return (
    <div className="wx-rain">
      {Array.from({ length: count }, (_, i) => {
        const depth = r();
        const duration = speed * (1.8 - .8 * depth);
        const style = {
          left: `${r() * 108 - 4}%`, animationDuration: `${duration}s`,
          animationDelay: `${-r() * duration}s`, opacity: .12 + .35 * depth,
          width: `${.75 + depth * .65}px`, height: `${length * (.65 + depth * .65)}px`,
          '--drop-drift': `-${windy ? 16 + depth * 8 : 6 + depth * 4}vw`,
          '--drop-angle': `${windy ? 9 + depth * 6 : 3 + depth * 4}deg`,
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </div>
  );
});

const Flakes = memo(function Flakes() {
  const r = rng(23);
  return <div className="wx-snow">{Array.from({ length: 24 }, (_, i) => {
    const depth = r();
    const size = 1.5 + depth * 2.5;
    return <i key={i} style={{ left: `${r() * 100}%`, animationDuration: `${16 - depth * 7}s`,
      animationDelay: `${-r() * 16}s`, width: size, height: size, opacity: .18 + depth * .46 }} />;
  })}</div>;
});

export function WeatherLayer() {
  const { wx, rain, light, weather: current } = useAmbient();
  const { weather } = useSettings();
  const animate = !reducedMotion() && !isLowPerformance();
  const wet = wx === 'rain' || wx === 'storm';
  return <AnimatePresence initial={false}>
    {weather.on && wx && <motion.div className="wx-layer" data-sky={wx} data-light={light}
      key={`${wx}:${light}:${rain ?? ''}`}
      initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: animate ? .85 : 0, ease: 'easeInOut' }}>
      <div className="wx-light" />
      {(wx === 'cloudy' || wx === 'fog' || wx === 'storm') && <div className="wx-clouds"><i /><i /></div>}
      {animate && wet && <Drops intensity={rain ?? 'rain'} windy={(current?.wind ?? 0) >= 25} />}
      {animate && wx === 'snow' && <Flakes />}
    </motion.div>}
  </AnimatePresence>;
}
