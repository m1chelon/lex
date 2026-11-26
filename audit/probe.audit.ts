import 'fake-indexeddb/auto';
import { readFile, writeFile } from 'node:fs/promises';
import { it, vi } from 'vitest';
import { ensureLaws, getLaw, initCorpus } from '../src/data/corpus';
import { provisionUnits } from '../src/learn/provisions';
import { buildMemory } from '../src/learn/lawQuestions';

it('probe', async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus(); await ensureLaws(['cp', 'cpp', 'cf']);
  const out: string[] = [];
  for (const [lawId, from, to] of [['cf', '5', '5'], ['cp', '293', '297'], ['cp', '121', '122'], ['cpp', '41', '42']] as const) {
    const law = getLaw(lawId)!;
    const arts = law.articles.filter((a) => { const n = parseInt(a.num ?? a.lab.replace(/\D/g, '')); return n >= +from && n <= +to; });
    for (const art of arts) for (const u of provisionUnits(art)) {
      const ex = buildMemory(law, art, u, 0, 's1');
      if (!ex?.blanks) continue;
      out.push(`${art.lab} ${u.lab}: ${u.t.slice(0, 90)}`);
      for (const b of ex.blanks) out.push(`   [${b.answer}] ${b.options.filter((o: string) => o !== b.answer).join(' | ')}`);
    }
  }
  await writeFile('audit/probe.txt', out.join('\n'));
}, 120000);
