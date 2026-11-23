// Auditoria de cobertura: confere, para cada artigo exigido no edital, se todos os dispositivos
// (caput, parágrafos, incisos, alíneas e itens) recebem ao menos uma questão em cada modo de jogo.
// Execução: npx vitest run --config audit/vitest.audit.config.ts
import 'fake-indexeddb/auto';
import { readFile, writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { areaLaws, type AreaId } from '../src/core/areas';
import { coverage, ensureLaws, getArticle, initCorpus } from '../src/data/corpus';
import { provisionUnits } from '../src/learn/provisions';
import { buildSession, type Mode, type SessionConfig } from '../src/learn/session';
import { gerarSimulado, type Estilo } from '../src/learn/simulado';
import { recordAnswer } from '../src/learn/scheduler';

const AREA = (process.env.AUDIT_AREA ?? 'tjsp') as AreaId;
const LIMIT = Number(process.env.AUDIT_LIMIT ?? 0);

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(await readFile(new URL(`../public/${url}`, import.meta.url), 'utf8')));
  await initCorpus();
  await ensureLaws(areaLaws(AREA));
}, 120_000);
afterAll(() => vi.unstubAllGlobals());

type Row = { article: string; mode: string; missing: string[] };

it(`cobre todos os dispositivos exigidos (${AREA})`, async () => {
  const required = [...coverage(AREA).required].sort();
  const articles = LIMIT ? required.slice(0, LIMIT) : required;
  const modes: { id: string; cfg: Partial<SessionConfig>; kinds?: string[] }[] = [
    { id: 'memorizar', cfg: { mode: 'memorizar' as Mode } },
    { id: 'memorizar-guiada', cfg: { mode: 'memorizar-guiada' as Mode } },
    { id: 'aprender', cfg: { mode: 'aprender' as Mode }, kinds: ['cloze-mc'] },
    { id: 'casos', cfg: { mode: 'casos' as Mode }, kinds: ['case'] },
    { id: 'provar', cfg: { mode: 'provar' as Mode } },
    { id: 'relampago', cfg: { mode: 'memorizar' as Mode, blitz: true } },
  ];
  const styles: Estilo[] = ['leiseca', 'cebraspe', 'fgv'];
  const gaps: Row[] = [];
  const totals: Record<string, { units: number; covered: number }> = {};
  let units = 0;
  for (const id of articles) {
    const hit = getArticle(id);
    if (!hit) continue;
    const expected = provisionUnits(hit.art).map((u) => u.id);
    if (!expected.length) continue;
    units += expected.length;
    const base: SessionConfig = { area: AREA, focus: 'auto', mode: 'memorizar', minutes: 30, articleIds: [id] };
    const record = (mode: string, got: Set<string>) => {
      const missing = expected.filter((u) => !got.has(u));
      const t = (totals[mode] ??= { units: 0, covered: 0 });
      t.units += expected.length;
      t.covered += expected.length - missing.length;
      if (missing.length) gaps.push({ article: id, mode, missing });
    };
    for (const m of modes) {
      const got = new Set<string>();
      // O Relâmpago sorteia 20 questões e prioriza dispositivos ainda não respondidos:
      // simula rodadas sucessivas, registrando as respostas, até esgotar o artigo.
      const rounds = m.id === 'relampago' ? Math.ceil(expected.length / 20) + 2 : 1;
      for (let round = 0; round < rounds; round++) {
      const { items } = await buildSession({ ...base, ...m.cfg }, false);
      if (m.id === 'relampago') for (const item of items) {
        if (!item.unitId) continue;
        await recordAnswer({ cardId: item.key, base: { articleId: item.articleId, unitId: item.unitId, dim: item.dim, type: 'law' },
          correct: true, ms: 5000, expectedMs: 10000, mode: 'audit', type: 'law' });
      }
      for (const item of items) {
        if (m.kinds && !m.kinds.includes(item.kind)) continue;
        if (item.unitId) got.add(item.unitId);
        item.readingFocus?.forEach((f) => got.add(f.unitId));
      }
      }
      record(m.id, got);
    }
    for (const style of styles) {
      const exam = await gerarSimulado(base, style, expected.length, null);
      record(`simulado-${style}`, new Set(exam.questoes.flatMap((q) => q.unitId ? [q.unitId] : [])));
    }
  }
  const summary = Object.entries(totals).map(([mode, t]) => `${mode.padEnd(20)} ${t.covered}/${t.units} (${(100 * t.covered / t.units).toFixed(2)}%)`);
  const report = [
    `Área: ${AREA} · artigos: ${articles.length} · dispositivos treináveis: ${units}`, '', ...summary, '',
    'Lacunas (artigo · modo · dispositivos sem questão):',
    ...gaps.map((g) => `${g.article} · ${g.mode} · ${g.missing.join(', ')}`),
  ].join('\n');
  await writeFile(new URL(`./coverage-${AREA}.txt`, import.meta.url), report + '\n');
  console.log(summary.join('\n'));
  expect(units).toBeGreaterThan(0);
}, 3_600_000);
