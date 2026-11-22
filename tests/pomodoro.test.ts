import { describe, expect, it } from 'vitest';
import { advancePomodoro, readPomodoro, type Pomo } from '../src/learn/pomodoro';

const minute = 60_000;

describe('cronômetro Pomodoro', () => {
  const focus: Pomo = { plan: '25/5', phase: 'focus', endsAt: 25 * minute, cycles: 0 };

  it('retoma a pausa pelo tempo que faltava e preserva a hora do próximo bloco', () => {
    expect(advancePomodoro(focus, 24 * minute)).toBe(focus);
    expect(advancePomodoro(focus, 27 * minute)).toMatchObject({ phase: 'break', endsAt: 30 * minute, cycles: 1 });
    expect(advancePomodoro(focus, 30 * minute)).toMatchObject({ phase: 'focus', endsAt: 55 * minute, cycles: 1 });
  });

  it('alcança a fase correta mesmo depois de vários ciclos com o app fechado', () => {
    expect(readPomodoro(focus, 87 * minute)).toMatchObject({ phase: 'break', endsAt: 90 * minute, cycles: 3 });
    const pause: Pomo = { plan: '50/10', phase: 'break', endsAt: 60 * minute, cycles: 1 };
    expect(readPomodoro(pause, 178 * minute)).toMatchObject({ phase: 'break', endsAt: 180 * minute, cycles: 3 });
    expect(readPomodoro(pause, 181 * minute)).toMatchObject({ phase: 'focus', endsAt: 230 * minute, cycles: 3 });
  });

  it('mantém pausas reais e recupera um legado gravado com pausa de zero segundos', () => {
    const paused = { ...focus, paused: 40 };
    expect(readPomodoro(paused, 300 * minute)).toBe(paused);
    expect(readPomodoro({ ...focus, paused: 0 }, 26 * minute)).toMatchObject({ phase: 'break', cycles: 1 });
    expect(readPomodoro({ ...focus, endsAt: 'inválido' }, 0)).toBeNull();
  });
});
