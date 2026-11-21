import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { haptic, reducedMotion } from './settings';
import { IChevL, IClose } from './icons';
import { nav } from './nav';

export const spring = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.9 };
export const softSpring = { type: 'spring' as const, stiffness: 260, damping: 30 };
const t = () => (reducedMotion() ? { duration: 0 } : spring);

/* ---------- Folha contextual (sheet) com arrastar para fechar ---------- */
type SheetProps = { onClose: () => void; children: ReactNode; label: string; tall?: boolean };

function SheetPanel({ onClose, children, label, tall }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controls = useDragControls();
  const rm = reducedMotion();
  useLayoutEffect(() => {
    const layer = dialog.current;
    layer?.showModal();
    return () => layer?.close();
  }, []);
  return createPortal(
    <dialog ref={dialog} className="sheet-layer" aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <motion.div className="scrim" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: rm ? 0 : .18 }} onClick={onClose} />
      <motion.div
        className={`sheet glass glass-strong${tall ? ' sheet-tall' : ''}`}
        initial={rm ? false : { y: '100%' }} animate={{ y: 0 }} exit={{ y: rm ? 0 : '100%', transition: { duration: rm ? 0 : .19, ease: [0.32, 0.72, 0, 1] } }} transition={t()}
        drag={rm ? false : 'y'} dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: .55 }}
        onDragEnd={(_e: unknown, info: PanInfo) => { if (info.offset.y > 110 || (info.offset.y > 20 && info.velocity.y > 600)) onClose(); }}
      >
        <div className="sheet-handle" aria-hidden="true" onPointerDown={(event) => { if (!rm) controls.start(event); }} />
        <button className="sheet-close icon-btn" aria-label="Fechar" type="button" onClick={onClose}><IClose size={19} /></button>
        <div className="sheet-body">{children}</div>
      </motion.div>
      <Toaster />
    </dialog>, document.body
  );
}

export function Sheet({ open, ...props }: SheetProps & { open: boolean }) {
  return <AnimatePresence>{open && <SheetPanel key="sheet" {...props} />}</AnimatePresence>;
}

/* ---------- Toast ---------- */
let toastMsg: { id: number; text: string } | null = null;
const tsubs = new Set<() => void>();
export function toast(text: string) {
  toastMsg = { id: Date.now(), text };
  tsubs.forEach((f) => f());
  setTimeout(() => { if (toastMsg && Date.now() - toastMsg.id >= 2300) { toastMsg = null; tsubs.forEach((f) => f()); } }, 2400);
}
export function Toaster() {
  const m = useSyncExternalStore((f) => { tsubs.add(f); return () => tsubs.delete(f); }, () => toastMsg);
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>{m && <motion.div key={m.id} className="toast glass" initial={{ y: -30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }} transition={t()}>{m.text}</motion.div>}</AnimatePresence>
    </div>
  );
}

/* ---------- Anel de progresso ---------- */
export function Ring({ value, size = 64, stroke = 6, children, color = 'var(--gold)', track = 'rgba(255,255,255,0.08)' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v * 100)}%`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={reducedMotion() ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 22 }} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

/* ---------- Controle segmentado com “gota” de vidro deslizante ---------- */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <div className="segmented glass" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => { haptic('soft'); onChange(o.id); }}>
          {value === o.id && <motion.span layoutId={`seg-${id}`} className="seg-thumb" style={{ left: 0, right: 0 }} transition={t()} />}
          <span style={{ position: 'relative' }}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export type CTypeKind = 'oficial' | 'didatico' | 'interpretacao' | 'hipotetico' | 'incorreto' | 'doutrina';
const CT: Record<CTypeKind, string> = { oficial: 'Texto oficial', didatico: 'Explicação didática', interpretacao: 'Interpretação jurídica', hipotetico: 'Exemplo hipotético', incorreto: 'Redação propositalmente incorreta', doutrina: 'Doutrina' };
export const CType = ({ k, extra }: { k: CTypeKind; extra?: string }) => <span className={`ctype ${k}`}>{CT[k]}{extra ? ` · ${extra}` : ''}</span>;

export function Progress({ value, label = 'Progresso' }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value * 100 || 0));
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><div className="progress-fill" style={{ width: `${percent}%` }} /></div>;
}

/* ---------- Cabeçalho de página empilhada ---------- */
export function PageHeader({ title, sub, right, onBack }: { title: string; sub?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="topbar page-header">
      <button className="icon-btn glass" type="button" aria-label="Voltar" onClick={() => { haptic('soft'); (onBack ?? nav.back)(); }}><IChevL /></button>
      <div className="page-header-copy grow">
        <h1 className="title-m page-title">{title}</h1>
        {sub && sub !== title && <p className="page-subtitle">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function SectionHeader({ title, description, icon, right }: { title: string; description?: string; icon: ReactNode; right?: ReactNode }) {
  return (
    <header className="section-header">
      <div className="section-heading">{icon}<h1>{title}</h1></div>
      {right}
      {description && <p>{description}</p>}
    </header>
  );
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): T | undefined {
  const [v, setV] = useState<T>();
  useEffect(() => { let alive = true; fn().then((x) => alive && setV(x)).catch(() => {}); return () => { alive = false; }; }, deps); // eslint-disable-line
  return v;
}
