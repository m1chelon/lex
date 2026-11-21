// Floresta: uma árvore por lei, que cresce com o domínio real (FSRS + estágios).
import { TucaLoading } from '../ui/TucaLoading';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { db, type CardRow } from '../data/db';
import { getLaw } from '../data/corpus';
import { areaLaws } from '../core/areas';
import { SOURCES } from '../core/sources';
import { retrievability } from '../learn/scheduler';
import { rng } from '../learn/text';
import { PageHeader, useAsync } from '../ui/primitives';
import { reducedMotion, useSettings } from '../ui/settings';
import { nav } from '../ui/nav';
import { Mascot } from '../ui/Mascot';
import { useCorpusVersion } from '../App';

export interface Growth { lawId: string; units: number; learned: number; strength: number; stage: number; pct: number }
export const STAGES = ['Semente', 'Broto', 'Muda', 'Arvoreta', 'Árvore', 'Árvore adulta', 'Árvore dourada'];

export async function forestGrowth(lawIds: string[]): Promise<Growth[]> {
  let cards: CardRow[] = [];
  try { cards = await db.cards.toArray(); } catch { cards = []; }
  const by = new Map<string, CardRow[]>();
  for (const c of cards) { const l = (c.articleId || c.unitId || '').split('.')[0]; if (l) by.set(l, [...(by.get(l) || []), c]); }
  return lawIds.map((id) => {
    const law = getLaw(id);
    const units = law ? law.articles.reduce((n, a) => n + a.units.filter((u) => u.t && !u.rev).length, 0) : 0;
    const cs = (by.get(id) || []).filter((c) => c.unitId);
    const learnedUnits = new Set(cs.filter((c) => c.stage >= 1).map((c) => c.unitId)).size;
    const strength = cs.length ? cs.reduce((s, c) => s + (c.fsrs.reps ? retrievability(c.fsrs) : 0) * (c.stage / 4), 0) / cs.length : 0;
    const pct = units ? learnedUnits / units : 0;
    const score = pct * 0.6 + strength * 0.4 * Math.min(1, pct * 4);
    const stage = cs.length === 0 ? 0 : score < 0.03 ? 1 : score < 0.12 ? 2 : score < 0.3 ? 3 : score < 0.5 ? 4 : score < 0.75 ? 5 : 6;
    return { lawId: id, units, learned: learnedUnits, strength, stage, pct };
  });
}

export function Tree({ seed, stage, size = 120 }: { seed: string; stage: number; size?: number }) {
  const shape = useMemo(() => {
    const r = rng(seed);
    const lean = (r() - 0.5) * 8;
    const blobs = Array.from({ length: 7 }, (_, i) => ({ dx: (r() - 0.5) * 46, dy: -(r() * 34) - (i % 3) * 6, rr: 16 + r() * 12 }));
    const fruits = Array.from({ length: 6 }, () => ({ dx: (r() - 0.5) * 50, dy: -10 - r() * 40 }));
    return { lean, blobs, fruits };
  }, [seed]);
  const rm = reducedMotion();
  const h = [0, 14, 30, 46, 62, 76, 84][stage];
  const canopy = [0, 0, 0.35, 0.55, 0.78, 0.92, 1][stage];
  const leaf = stage >= 6 ? '#d6bf85' : stage >= 5 ? '#7fae8a' : '#6f9c7c';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={STAGES[stage]}>
      <ellipse cx="60" cy="108" rx="34" ry="6" fill="rgba(255,255,255,.05)" />
      <path d="M38 108q22-8 44 0" stroke="#3a3328" strokeWidth="3" fill="none" strokeLinecap="round" />
      {stage === 0 && <ellipse cx="60" cy="103" rx="6" ry="4" fill="#a88b50" />}
      {stage >= 1 && (
        <motion.g initial={rm ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originX: '60px', originY: '106px' }} transition={{ type: 'spring', stiffness: 80, damping: 14 }}>
          <path d={`M60 106 Q${60 + shape.lean} ${106 - h / 2} ${60 + shape.lean * 1.4} ${106 - h}`} stroke="#6b5a40" strokeWidth={2 + stage * 1.2} fill="none" strokeLinecap="round" />
          {stage === 1 && <><path d="M60 94q-8-6-12-2 4 6 12 2Z" fill="#7fae8a" /><path d="M60 92q8-7 13-3-5 6-13 3Z" fill="#8fbf98" /></>}
          {stage >= 2 && shape.blobs.map((b, i) => (
            <motion.circle key={i} cx={60 + shape.lean * 1.4 + b.dx * canopy} cy={106 - h + b.dy * canopy} r={b.rr * canopy} fill={leaf} opacity={0.82 - i * 0.04}
              initial={rm ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: rm ? 0 : 0.1 + i * 0.05, type: 'spring', stiffness: 120, damping: 12 }} />
          ))}
          {stage >= 5 && shape.fruits.slice(0, stage === 6 ? 6 : 3).map((f, i) => <circle key={i} cx={60 + shape.lean + f.dx * canopy * 0.8} cy={106 - h + f.dy * canopy * 0.6} r={3.2} fill={stage === 6 ? '#fff3c9' : '#d6bf85'} />)}
        </motion.g>
      )}
    </svg>
  );
}

export function ForestGrid({ lawIds }: { lawIds: string[] }) {
  const v = useCorpusVersion();
  const growth = useAsync(() => forestGrowth(lawIds), [lawIds.join(','), v]);
  if (!growth) return <TucaLoading msg="Regando a floresta" />;
  const adults = growth.filter((g) => g.stage >= 5).length;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 12 }}>
        <Mascot mood={adults ? 'cheer' : 'happy'} size={70} />
        <div className="bubble grow">{adults ? `${adults} árvore(s) adulta(s) na sua floresta!` : 'Cada lei é uma árvore. Estude e veja a floresta crescer — de semente a árvore dourada.'}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 10 }}>
        {growth.map((g) => {
          const s = SOURCES.find((x) => x.id === g.lawId);
          return (
            <button key={g.lawId} className="card tap" style={{ padding: 8, textAlign: 'center' }} onClick={() => nav.push({ name: 'law', id: g.lawId })}>
              <Tree seed={g.lawId} stage={g.stage} size={96} />
              <div className="xsmall" style={{ fontWeight: 650, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s?.short ?? g.lawId}</div>
              <div className="xsmall muted">{STAGES[g.stage]} · {Math.round(g.pct * 100)}%</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ForestScreen() {
  const { area } = useSettings();
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Floresta" sub="Uma árvore por lei — cresce com o seu domínio" />
      <ForestGrid lawIds={areaLaws(area)} />
    </div>
  );
}
