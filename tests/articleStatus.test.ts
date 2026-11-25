import { expect, it } from 'vitest';
import { sessionArticleStatus, statusOf } from '../src/learn/articleStatus';

it('classifica o artigo pelo conjunto de respostas', () => {
  expect(statusOf([])).toBe('todo');
  expect(statusOf([true, true])).toBe('ok');
  expect(statusOf([true, false])).toBe('mid');
  expect(statusOf([false, false])).toBe('bad');
});

it('agrupa os resultados da sessão por artigo, na ordem de aparição', () => {
  const item = (key: string, articleId?: string) => ({ key, articleId }) as never;
  const { order, status } = sessionArticleStatus({
    items: [item('a1', 'cp.1'), item('a2', 'cp.1'), item('b1', 'cp.2'), item('g', undefined), item('c1', 'cp.3')],
    results: [{ key: 'a1', correct: true, ms: 1 }, { key: 'a2', correct: false, ms: 1 }, { key: 'b1', correct: true, ms: 1 }, { key: 'g', correct: null, ms: 1 }],
  });
  expect(order).toEqual(['cp.1', 'cp.2', 'cp.3']);
  expect([...status.values()]).toEqual(['mid', 'ok', 'todo']);
});
