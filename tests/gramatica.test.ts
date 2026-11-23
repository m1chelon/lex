import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildGrammarSession, GRAM_RULES, GRAM_TOPICS, grammarExercise, grammarStats } from '../src/learn/gramatica';
import { recordAnswer } from '../src/learn/scheduler';

describe('gerador gramatical', () => {
  it('gera, para cada regra e muitas sementes, exercícios bem formados e reproduzíveis', () => {
    for (const rule of GRAM_RULES) {
      for (let seed = 1; seed <= 40; seed++) {
        const key = `G:${rule.id}:${seed}`;
        const ex = grammarExercise(key)!;
        expect(ex, key).not.toBeNull();
        const texts = ex.options!.map((o) => o.text);
        expect(texts.length, key).toBeGreaterThanOrEqual(2);
        expect(new Set(texts.map((t) => t.toLowerCase())).size, key).toBe(texts.length);
        expect(ex.options!.filter((o) => o.correct), key).toHaveLength(1);
        expect(`${ex.prompt} ${texts.join(' ')}`, key).not.toMatch(/undefined|NaN|\$\{/);
        if (/^Complete/.test(ex.prompt)) expect(ex.prompt, key).toContain('___');
        expect(ex.options!.find((o) => o.correct)!.why!.length, key).toBeGreaterThan(20);
        expect(grammarExercise(key)!.prompt).toBe(ex.prompt);
      }
    }
  });

  it('cobre os cinco temas pedidos', () => {
    for (const topic of GRAM_TOPICS) expect(GRAM_RULES.filter((r) => r.topic === topic.id).length, topic.id).toBeGreaterThanOrEqual(4);
  });

  it('monta rodadas por tema e traz de volta o exercício errado', async () => {
    const first = await buildGrammarSession('regencia', 'a');
    expect(first).toHaveLength(12);
    expect(first.every((ex) => GRAM_RULES.find((r) => r.id === ex.key.split(':')[1])?.topic === 'regencia')).toBe(true);
    const missed = first[0];
    await recordAnswer({ cardId: missed.key, base: { dim: 'conceitual', type: 'doctrine' }, correct: false, ms: 5000, expectedMs: 25000, mode: 'memorizar', type: 'doctrine' });
    const next = await buildGrammarSession('regencia', 'b');
    expect(next.map(({ key }) => key)).toContain(missed.key);
    const stats = await grammarStats();
    expect(stats.topics.find((t) => t.id === 'regencia')!.wrong).toBe(1);
    const mixed = await buildGrammarSession(undefined, 'c');
    expect(new Set(mixed.map((ex) => GRAM_RULES.find((r) => r.id === ex.key.split(':')[1])!.topic)).size).toBe(5);
  });
});
