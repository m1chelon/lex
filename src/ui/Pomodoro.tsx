// Pomodoro: blocos de foco e pausa (50/10 ou 25/5). Uma "ilha" flutuante no topo mostra o tempo
// em qualquer tela; ao fim do foco, a Capi chama para a pausa (com respiração guiada opcional).
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { profileStorageKey } from '../data/profiles';
import { Mascot } from './Mascot';
import { Breathing } from './Wellbeing';
import { ITomato, IClose, IPlay } from './icons';
import { Sheet, spring, toast } from './primitives';
import { haptic, reducedMotion } from './settings';

export type Plan = '50/10' | '25/5';
type Phase = 'focus' | 'break';
interface Pomo { plan: Plan; phase: Phase; endsAt: number; paused?: number; cycles: number }

const KEY = profileStorageKey('lex.pomodoro');
const mins = (p: Plan, ph: Phase) => (p === '50/10' ? (ph === 'focus' ? 50 : 10) : ph === 'focus' ? 25 : 5);
let state: Pomo | null = null;
try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* sem armazenamento */ }
const subs = new Set<() => void>();
function set(n: Pomo | null) { state = n; try { if (n) localStorage.setItem(KEY, JSON.stringify(n)); else localStorage.removeItem(KEY); } catch { /* ok */ } subs.forEach((f) => f()); }
const usePomo = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

export function startPomodoro(plan: Plan) { haptic('ok'); set({ plan, phase: 'focus', endsAt: Date.now() + mins(plan, 'focus') * 60000, cycles: 0 }); }
export function stopPomodoro() { set(null); }
const left = (p: Pomo) => Math.max(0, Math.ceil(((p.paused ?? p.endsAt) - (p.paused ? 0 : Date.now())) / 1000));
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const TIPS = ['Levante, alongue o pescoço e os ombros.', 'Beba um copo d’água.', 'Olhe para longe da tela por 20 segundos.', 'Respire fundo: inspire em 4, solte em 6.', 'Caminhe um pouco — o cérebro consolida a lei no descanso.'];

/** Ilha do Pomodoro (topo da tela) + chamada para a pausa. */
export function PomodoroIsland() {
  const p = usePomo();
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false);
  const [breath, setBreath] = useState(false);
  useEffect(() => {
    if (!p || p.paused) return;
    const i = setInterval(() => {
      tick((x) => x + 1);
      if (Date.now() < p.endsAt) return;
      if (p.phase === 'focus') { haptic('ok'); set({ ...p, phase: 'break', endsAt: Date.now() + mins(p.plan, 'break') * 60000, cycles: p.cycles + 1 }); }
      else { haptic('ok'); toast('Pausa encerrada. Bora voltar para a lei!'); set({ ...p, phase: 'focus', endsAt: Date.now() + mins(p.plan, 'focus') * 60000 }); }
    }, 1000);
    return () => clearInterval(i);
  }, [p]);
  useEffect(() => { const r = document.documentElement; if (p) r.dataset.pomo = p.phase; else delete r.dataset.pomo; }, [p]);
  if (!p) return null;
  const s = left(p);
  const total = mins(p.plan, p.phase) * 60;
  const pct = 1 - s / total;
  const onBreak = p.phase === 'break';
  return (
    <>
      <motion.button className={`pomo-island${onBreak ? ' brk' : ''}`} onClick={() => { haptic('soft'); setOpen(true); }} aria-label={`Pomodoro: ${onBreak ? 'pausa' : 'foco'}, faltam ${fmt(s)}`}
        initial={reducedMotion() ? false : { y: -30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={spring}>
        <span className="pi-ico"><ITomato size={15} /></span>
        <span className="pi-label">{onBreak ? 'Pausa' : 'Foco'}</span>
        <span className="pi-time">{p.paused ? 'pausado' : fmt(s)}</span>
        <span className="pi-bar"><i style={{ width: `${pct * 100}%` }} /></span>
      </motion.button>

      <AnimatePresence>
        {onBreak && !breath && !open && (
          <motion.div className="pomo-break" role="dialog" aria-label="Hora da pausa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="pb-card glass">
              <Mascot mood="happy" size={96} />
              <div className="caps" style={{ marginTop: 8 }}>Pausa · ciclo {p.cycles}</div>
              <div className="pb-time">{fmt(s)}</div>
              <p className="small muted" style={{ textAlign: 'center', maxWidth: 260 }}>{TIPS[p.cycles % TIPS.length]}</p>
              <div className="stack" style={{ gap: 8, width: '100%', marginTop: 14 }}>
                <button className="btn btn-quiet btn-block" onClick={() => setBreath(true)}>Respirar 1 min com a Capi</button>
                <button className="btn btn-ghost btn-block" onClick={() => { haptic('tap'); set({ ...p, phase: 'focus', endsAt: Date.now() + mins(p.plan, 'focus') * 60000 }); }}>Pular a pausa</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Breathing open={breath} onClose={() => setBreath(false)} />

      <Sheet open={open} onClose={() => setOpen(false)} label="Pomodoro">
        <div className="row" style={{ gap: 12 }}>
          <span className="itile lg" style={{ width: 54, height: 54, ['--tint' as string]: onBreak ? '64, 205, 190' : '255, 92, 110' }}><ITomato size={28} /></span>
          <div className="grow"><div className="title-m">{onBreak ? 'Pausa' : 'Foco'} · {fmt(s)}</div><div className="xsmall muted">Plano {p.plan} min · {p.cycles} {p.cycles === 1 ? 'ciclo concluído' : 'ciclos concluídos'}</div></div>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          {p.paused
            ? <button className="btn btn-primary grow" onClick={() => { set({ ...p, endsAt: Date.now() + p.paused! * 1000, paused: undefined }); setOpen(false); }}><IPlay size={16} /> Retomar</button>
            : <button className="btn btn-quiet grow" onClick={() => set({ ...p, paused: s })}>Pausar</button>}
          <button className="btn btn-ghost grow" onClick={() => { stopPomodoro(); setOpen(false); toast('Pomodoro encerrado'); }}><IClose size={16} /> Encerrar</button>
        </div>
      </Sheet>
    </>
  );
}

/** Folha para escolher o plano e começar. */
export function PomodoroSheet({ open, onClose, onStart }: { open: boolean; onClose: () => void; onStart?: () => void }) {
  const p = usePomo();
  return (
    <Sheet open={open} onClose={onClose} label="Modo Pomodoro">
      <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
        <Mascot mood="happy" size={66} />
        <div className="bubble grow">Foco total por um bloco, depois uma pausa de verdade. Eu cuido do relógio — ele fica no topo da tela.</div>
      </div>
      <div className="pomo-plans">
        {(['50/10', '25/5'] as Plan[]).map((pl) => (
          <button key={pl} className="pomo-plan" onClick={() => { startPomodoro(pl); onClose(); onStart?.(); }}>
            <span className="pp-big">{pl.split('/')[0]}<small>min</small></span>
            <span className="xsmall muted">foco · {pl.split('/')[1]} min de pausa</span>
            <span className="xsmall">{pl === '50/10' ? 'Estudo profundo' : 'Clássico, para dias corridos'}</span>
          </button>
        ))}
      </div>
      {p && <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={() => { stopPomodoro(); onClose(); }}>Encerrar o Pomodoro atual</button>}
      <p className="xsmall faint" style={{ marginTop: 10 }}>O tempo continua contando com o app fechado; ao voltar, a ilha mostra a fase certa.</p>
    </Sheet>
  );
}
