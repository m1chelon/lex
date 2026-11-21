// Bem-estar: check-in diário de humor, respiração guiada de 1 minuto e semana de humor.
// Não é atendimento psicológico; em dias difíceis seguidos, o app indica o CVV (188).
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { MOODS, dayKey, getMoods, hardStreak, saveMood, skipToday, type MoodEntry, type MoodId } from '../learn/mood';
import { Mascot } from './Mascot';
import { Sheet, spring, toast, useAsync } from './primitives';
import { haptic, reducedMotion, setSettings } from './settings';

export function Face({ mood, size = 26 }: { mood: MoodId; size?: number }) {
  const eyes = {
    otimo: <><path d="M7.5 10.5q1.5-2 3 0M13.5 10.5q1.5-2 3 0" /></>,
    bem: <><circle cx="9" cy="10" r="1.1" fill="currentColor" /><circle cx="15" cy="10" r="1.1" fill="currentColor" /></>,
    ok: <><circle cx="9" cy="10" r="1.1" fill="currentColor" /><circle cx="15" cy="10" r="1.1" fill="currentColor" /></>,
    cansado: <><path d="M7.5 10.5h3M13.5 10.5h3" /></>,
    ansioso: <><circle cx="9" cy="10.5" r="1.1" fill="currentColor" /><circle cx="15" cy="10.5" r="1.1" fill="currentColor" /><path d="M7.2 7.6l3 1M16.8 7.6l-3 1" /></>,
    triste: <><circle cx="9" cy="10" r="1.1" fill="currentColor" /><circle cx="15" cy="10" r="1.1" fill="currentColor" /><path d="M16.6 12.2q.6 1.4 0 2" /></>,
  }[mood];
  const mouth = { otimo: 'M7.5 14q4.5 4.5 9 0', bem: 'M8.5 14.5q3.5 2.5 7 0', ok: 'M9 15h6', cansado: 'M10.5 15.2a1.5 1.3 0 1 0 3 0a1.5 1.3 0 1 0 -3 0', ansioso: 'M8.5 15.5q1.2-1 2.3 0t2.3 0t2.3 0', triste: 'M8.5 16q3.5-3 7 0' }[mood];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{eyes}<path d={mouth} /></svg>;
}

export function MoodSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [pick, setPick] = useState<MoodId | null>(null);
  const [note, setNote] = useState('');
  const [breath, setBreath] = useState(false);
  const [support, setSupport] = useState(false);
  useEffect(() => { if (open) { setPick(null); setNote(''); setSupport(false); } }, [open]);
  const m = pick ? MOODS.find((x) => x.id === pick)! : null;
  const save = async () => {
    if (!pick) return;
    await saveMood(pick, note);
    haptic('ok'); toast('Check-in salvo. Obrigado por contar como você está.');
    onSaved?.(); onClose();
  };
  const choose = async (id: MoodId) => {
    haptic('soft'); setPick(id);
    if (id === 'triste' || id === 'ansioso') setSupport((await hardStreak()) >= 1); else setSupport(false);
  };
  return (
    <>
      <Sheet open={open && !breath} onClose={onClose} label="Como você está hoje?" tall>
        <div className="stack" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
            <Mascot mood={m ? (pick === 'triste' || pick === 'ansioso' || pick === 'cansado' ? 'think' : 'happy') : 'happy'} size={70} />
            <div className="bubble grow">{m ? m.reply : 'E aí, como você está hoje? Seja sincero — isso fica só aqui no seu aparelho.'}</div>
          </div>
          <div className="mood-grid" role="radiogroup" aria-label="Seu humor hoje">
            {MOODS.map((x) => (
              <button key={x.id} className="mood-tile" role="radio" aria-checked={pick === x.id} onClick={() => void choose(x.id)} style={{ ['--tint' as string]: x.tint }}>
                <span className="itile lg" style={{ width: 54, height: 54, ['--tint' as string]: x.tint }}><Face mood={x.id} size={30} /></span>
                <span className="itile-label">{x.label}</span>
              </button>
            ))}
          </div>
          {pick && <textarea className="input" rows={2} maxLength={280} placeholder="Quer anotar algo? (opcional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Anotação do dia" style={{ resize: 'none' }} />}
          {support && (
            <div className="card support">
              <div className="small" style={{ fontWeight: 700 }}>Você não precisa passar por isso sozinho</div>
              <p className="small muted" style={{ marginTop: 4 }}>Se quiser conversar com alguém agora, o CVV atende de graça, 24 horas, pelo telefone 188 ou pelo chat em cvv.org.br.</p>
              <a className="btn btn-quiet btn-sm" style={{ marginTop: 10 }} href="tel:188">Ligar para o 188</a>
            </div>
          )}
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-quiet grow" onClick={() => { haptic('soft'); setBreath(true); }}>Respirar 1 min</button>
            <button className="btn btn-primary grow" disabled={!pick} onClick={() => void save()}>Salvar</button>
          </div>
          {!pick && (
            <div className="row between" style={{ gap: 10 }}>
              <button className="btn btn-sm btn-ghost" onClick={async () => { await skipToday(); haptic('soft'); toast('Tudo bem. Até amanhã!'); onSaved?.(); onClose(); }}>Prefiro não responder</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { setSettings({ wellbeing: false }); haptic('soft'); toast('Bem-estar desligado. Dá para religar em Você.'); onSaved?.(); onClose(); }}>Desligar check-in</button>
            </div>
          )}
          <p className="xsmall faint">Responder é opcional. O LEX não substitui acompanhamento profissional. Seus registros ficam só neste aparelho.</p>
        </div>
      </Sheet>
      <Breathing open={breath} onClose={() => setBreath(false)} />
    </>
  );
}

const PHASES = [{ t: 'Inspire', s: 4, scale: 1 }, { t: 'Segure', s: 4, scale: 1 }, { t: 'Solte o ar', s: 6, scale: 0.55 }] as const;

/** Respiração guiada (4-4-6), 4 ciclos ≈ 1 minuto. */
export function Breathing({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(56);
  useEffect(() => {
    if (!open) return;
    setI(0); setLeft(56);
    let k = 0, alive = true;
    const step = () => { if (!alive) return; haptic('soft'); setI(k); const ph = PHASES[k % 3]; k++; if (k <= 12) setTimeout(step, ph.s * 1000); else onClose(); };
    step();
    const tick = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => { alive = false; clearInterval(tick); };
  }, [open]); // eslint-disable-line
  const ph = PHASES[i % 3];
  const rm = reducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="breath" role="dialog" aria-label="Respiração guiada" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="caps">Respiração · {left}s</div>
          <motion.div className="breath-orb" animate={rm ? undefined : { scale: ph.scale }} transition={{ duration: ph.s, ease: 'easeInOut' }} />
          <motion.div key={i} className="breath-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>{ph.t}</motion.div>
          <button className="btn btn-quiet" onClick={onClose}>Encerrar</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Últimos 7 dias de humor (Progresso). */
export function MoodWeek({ onCheckIn }: { onCheckIn: () => void }) {
  const list = useAsync(getMoods, []) ?? [];
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); return d; });
  const by = new Map<string, MoodEntry>(list.map((m) => [m.day, m]));
  const todayDone = by.has(dayKey());
  return (
    <div className="card">
      <div className="row between"><div className="title-m">Seu bem-estar</div>{!todayDone && <button className="small gold" style={{ fontWeight: 700 }} onClick={onCheckIn}>Fazer check-in</button>}</div>
      <div className="mood-week">
        {days.map((d) => { const e = by.get(dayKey(d)); const mm = e ? MOODS.find((x) => x.id === e.mood) : null; return (
          <div key={dayKey(d)} className="mw-day">
            <span className={`mw-dot${mm ? '' : ' mw-none'}`} style={mm ? { ['--tint' as string]: mm.tint } : undefined}>{mm && <Face mood={mm.id} size={20} />}</span>
            <span className="xsmall muted">{d.toLocaleDateString('pt-BR', { weekday: 'narrow' })}</span>
          </div>); })}
      </div>
    </div>
  );
}
