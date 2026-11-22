export type Plan = '50/10' | '25/5';
type Phase = 'focus' | 'break';
export interface Pomo { plan: Plan; phase: Phase; endsAt: number; paused?: number; cycles: number }

export const pomodoroMinutes = (plan: Plan, phase: Phase) =>
  plan === '50/10' ? (phase === 'focus' ? 50 : 10) : phase === 'focus' ? 25 : 5;

export function advancePomodoro(p: Pomo, now: number): Pomo {
  if (p.paused !== undefined || now < p.endsAt) return p;
  const focusMs = pomodoroMinutes(p.plan, 'focus') * 60_000;
  const breakMs = pomodoroMinutes(p.plan, 'break') * 60_000;
  const cycleMs = focusMs + breakMs;
  const wholeCycles = Math.floor((now - p.endsAt) / cycleMs);
  const boundary = p.endsAt + cycleMs * wholeCycles;
  const cycles = p.cycles + wholeCycles;
  const inFocus = p.phase === 'focus';
  const nextEnd = boundary + (inFocus ? breakMs : focusMs);
  if (now < nextEnd) {
    return { ...p, phase: inFocus ? 'break' : 'focus', endsAt: nextEnd, cycles: cycles + Number(inFocus) };
  }
  return { ...p, endsAt: boundary + cycleMs, cycles: cycles + 1 };
}

export function readPomodoro(value: unknown, now: number): Pomo | null {
  const saved = value as Pomo | null;
  if (!saved || (saved.plan !== '25/5' && saved.plan !== '50/10')
    || (saved.phase !== 'focus' && saved.phase !== 'break') || !Number.isFinite(saved.endsAt)
    || !Number.isSafeInteger(saved.cycles) || saved.cycles < 0
    || (saved.paused !== undefined && (!Number.isFinite(saved.paused) || saved.paused < 0))) return null;
  // Arquivos antigos podiam guardar uma pausa de zero segundos no fim do bloco.
  const timer = saved.paused === 0 ? { ...saved, paused: undefined } : saved;
  return advancePomodoro(timer, now);
}
