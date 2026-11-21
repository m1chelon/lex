import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IPause, IPlay } from './icons';
import { isLowPerformance, reducedMotion, useSettings } from './settings';

export function Carousel({ label, children }: { label: string; children: ReactNode }) {
  return <div className="catalog-rail" role="region" aria-label={label} tabIndex={0} onKeyDown={(event) => {
    if (event.target !== event.currentTarget || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    const rail = event.currentTarget;
    const step = rail.firstElementChild?.getBoundingClientRect().width ?? rail.clientWidth;
    rail.scrollBy({ left: (step + 10) * (event.key === 'ArrowLeft' ? -1 : 1), behavior: reducedMotion() ? 'instant' : 'smooth' });
  }}>{children}</div>;
}

type FeaturedSlide = {
  id: string;
  title: string;
  heading: string;
  description: string;
  art: ReactNode;
  action?: ReactNode;
};

export function FeaturedCarousel({ slides }: { slides: readonly [FeaturedSlide, ...FeaturedSlide[]] }) {
  const carousel = useRef<HTMLElement>(null);
  const { motion, perf } = useSettings();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [playing, setPlaying] = useState(() => !reducedMotion() && !isLowPerformance());
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  const touch = useRef<{ x: number; y: number }>();
  const resetSwipe = (view: HTMLElement) => {
    touch.current = undefined;
    view.style.removeProperty('--swipe-offset');
    setTouching(false);
  };
  const count = slides.length;
  const active = index % count;
  const slide = slides[active];
  const running = playing && visible && inView && !hovered && !focused && !touching;
  const select = (next: number, backward = next < active) => {
    setDirection(backward ? 'back' : 'forward');
    setIndex((next + count) % count);
  };

  useEffect(() => {
    if (!carousel.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.intersectionRatio >= .45), { threshold: .45 });
    observer.observe(carousel.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    const pauseForPreference = () => {
      if (reducedMotion() || isLowPerformance()) setPlaying(false);
    };
    pauseForPreference();
    if (motion !== 'auto' || typeof matchMedia === 'undefined') return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    preference.addEventListener('change', pauseForPreference);
    return () => preference.removeEventListener('change', pauseForPreference);
  }, [motion, perf]);
  useEffect(() => {
    if (!running || count < 2) return;
    const timer = setTimeout(() => { setDirection('forward'); setIndex((current) => (current + 1) % count); }, 7200);
    return () => clearTimeout(timer);
  }, [active, count, running]);

  return <section ref={carousel} className="featured-carousel" data-feature={slide.id} data-direction={direction} data-in-view={inView || undefined} aria-label="Destaques do Início"
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }}
    onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="featured-viewport" aria-live={running ? 'off' : 'polite'}
      onTouchStart={({ currentTarget, touches }) => {
        if (touches.length !== 1) { resetSwipe(currentTarget); return; }
        touch.current = { x: touches[0].clientX, y: touches[0].clientY };
        setTouching(true);
      }}
      onTouchMove={({ currentTarget, touches }) => {
        const start = touch.current;
        if (!start || touches.length !== 1 || reducedMotion()) return;
        const dx = touches[0].clientX - start.x;
        const dy = touches[0].clientY - start.y;
        const offset = Math.abs(dx) > Math.abs(dy) ? Math.max(-65, Math.min(65, dx)) : 0;
        currentTarget.style.setProperty('--swipe-offset', `${offset}px`);
      }}
      onTouchCancel={({ currentTarget }) => resetSwipe(currentTarget)}
      onTouchEnd={({ changedTouches, currentTarget }) => {
        const start = touch.current;
        resetSwipe(currentTarget);
        if (!start) return;
        const dx = changedTouches[0].clientX - start.x;
        const dy = changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1), dx > 0);
      }}>
      <div className="featured-slide" key={slide.id}>
        <div className="featured-copy">
          <h2>{slide.heading}</h2>
          <p>{slide.description}</p>
          {slide.action}
        </div>
        <div className="featured-art">{slide.art}</div>
      </div>
    </div>
    <div className="featured-controls" role="group" aria-label="Controles dos destaques">
      <div className="featured-pickers" onKeyDown={(event) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        const buttons = [...event.currentTarget.querySelectorAll('button')];
        const current = buttons.indexOf(event.target as HTMLButtonElement);
        const next = (current + step + count) % count;
        buttons[next]?.focus();
        select(next, step < 0);
      }}>
        {slides.map(({ id, title }, i) => <button key={id} className="featured-picker" aria-label={`Mostrar ${title}`} aria-current={i === active || undefined} onClick={() => select(i)}>{title}</button>)}
      </div>
      <button className="featured-toggle" aria-label={playing ? 'Pausar carrossel' : 'Ativar carrossel automático'} onClick={() => setPlaying((current) => !current)}>
        {playing ? <IPause size={17} /> : <IPlay size={17} />}
      </button>
    </div>
  </section>;
}
