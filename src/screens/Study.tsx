import { LESSONS } from '../content/lessons';
import { COMPARISONS } from '../content/comparisons';
import { CONCEPTS } from '../content/concepts';
import { GLOSSARY } from '../content/glossary';
import { nav } from '../ui/nav';
import { useAsync } from '../ui/primitives';
import { kvGet } from '../data/db';
import { ICheck, IChevR, ICompare, IGlossary, ILayers, IClock, IBolt } from '../ui/icons';
import { haptic } from '../ui/settings';

export function Study({ embedded = false }: { embedded?: boolean }) {
  const done = useAsync(() => kvGet<string[]>('lessonsDone', []), []) ?? [];
  return (
    <div className="stack" style={{ gap: 14 }}>
      {!embedded && <h1 className="title-xl" style={{ marginTop: 6 }}>Estudar</h1>}
      <div className="row" style={{ gap: 10 }}>
        <button className="card tap grow" onClick={() => nav.push({ name: 'glossary' })}>
          <IGlossary style={{ color: 'var(--gold)' }} /><div className="title-s" style={{ marginTop: 10 }}>Dicionário</div><div className="xsmall muted">{GLOSSARY.length} termos</div>
        </button>
        <button className="card tap grow" onClick={() => nav.push({ name: 'concepts' })}>
          <IBolt style={{ color: 'var(--gold)' }} /><div className="title-s" style={{ marginTop: 10 }}>Interpretação</div><div className="xsmall muted">{CONCEPTS.length} exercícios</div>
        </button>
      </div>

      <div className="section-h"><h2 className="title-m">Microaulas</h2><span className="small muted">{done.length}/{LESSONS.length}</span></div>
      <div className="list">
        {LESSONS.map((l) => (
          <button key={l.id} className="list-item" onClick={() => { haptic('tap'); nav.push({ name: 'lesson', id: l.id }); }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: done.includes(l.id) ? 'var(--ok-soft)' : 'var(--gold-soft)', color: done.includes(l.id) ? 'var(--ok)' : 'var(--gold)', flex: 'none' }}>
              {done.includes(l.id) ? <ICheck size={18} /> : <ILayers size={18} />}
            </div>
            <div className="grow"><div style={{ fontWeight: 620 }}>{l.titulo}</div><div className="xsmall muted">{l.subtitulo}</div></div>
            <span className="xsmall muted row" style={{ gap: 3 }}><IClock size={13} />{l.minutos}′</span>
          </button>
        ))}
      </div>

      <div className="section-h"><h2 className="title-m">Comparativos</h2><span className="small muted">institutos que confundem</span></div>
      <div className="list">
        {COMPARISONS.map((c) => (
          <button key={c.id} className="list-item" onClick={() => { haptic('tap'); nav.push({ name: 'compare', id: c.id }); }}>
            <ICompare style={{ color: 'var(--gold)' }} />
            <div className="grow" style={{ fontWeight: 600 }}>{c.titulo}</div>
            <IChevR className="chev" />
          </button>
        ))}
      </div>
    </div>
  );
}
