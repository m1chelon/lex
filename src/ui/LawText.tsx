import { memo, useMemo } from 'react';
import type { Article, Unit } from '../core/types';
import { findTerms } from '../learn/terms';
import { haptic, useSettings } from './settings';

export type OnTerm = (id: string) => void;

/** Texto com termos do dicionário sublinhados (apenas a 1ª ocorrência por dispositivo, salvo preferência). */
export const TermText = memo(function TermText({ text, onTerm, seen, disabled, lawId }: { text: string; onTerm?: OnTerm; seen?: Set<string>; disabled?: boolean; lawId?: string }) {
  const { underlineAll } = useSettings();
  const parts = useMemo(() => {
    if (disabled || !onTerm) return [text];
    const hits = findTerms(text, lawId);
    const out: (string | { t: string; id: string })[] = [];
    let i = 0;
    for (const h of hits) {
      if (!underlineAll && seen) { if (seen.has(h.id)) continue; seen.add(h.id); }
      if (h.start < i) continue;
      out.push(text.slice(i, h.start), { t: text.slice(h.start, h.end), id: h.id });
      i = h.end;
    }
    out.push(text.slice(i));
    return out;
  }, [text, disabled, underlineAll, lawId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {parts.map((p, k) => typeof p === 'string' ? <span key={k}>{p}</span> : (
        <span key={k} role="button" tabIndex={0} className="term" onClick={(e) => { e.stopPropagation(); haptic('soft'); onTerm!(p.id); }} onKeyDown={(e) => { if (e.key === 'Enter') onTerm!(p.id); }}>{p.t}</span>
      ))}
    </>
  );
});

export function UnitView({ u, onTerm, seen, selected, highlighted, onTap, showNotes = true, lawId }: { lawId?: string; u: Unit; onTerm?: OnTerm; seen?: Set<string>; selected?: boolean; highlighted?: boolean; onTap?: () => void; showNotes?: boolean }) {
  if (!u.t && u.old?.length && !u.rev) return null;
  return (
    <div id={`u-${u.id}`} className={`law-unit k-${u.k}${u.rev ? ' rev' : ''}${selected ? ' selected' : ''}`} onClick={onTap}>
      {u.rub && <div className="law-rub">{u.rub}</div>}
      {u.k !== 'caput' && u.lab && <span className="law-lab">{u.lab}{u.k === 'inc' || u.k === 'pena' || u.k === 'item' ? ' –' : ''}</span>}
      <span className={`law-txt${highlighted ? ' law-hl' : ''}`}>{u.t ? <TermText text={u.t} onTerm={onTerm} seen={seen} lawId={lawId} /> : <span className="faint">{u.rev ? '(revogado)' : ''}</span>}</span>
      {showNotes && (u.notes?.length || u.fn?.length) ? (
        <span className="law-note">{[...(u.notes || []), ...(u.fn || [])].join(' · ')}</span>
      ) : null}
    </div>
  );
}

export function ArticleView({ art, onTerm, selectedUnit, highlights, onUnitTap, showNotes = true }: { art: Article; onTerm?: OnTerm; selectedUnit?: string; highlights?: Set<string>; onUnitTap?: (u: Unit) => void; showNotes?: boolean }) {
  const seen = new Set<string>();
  const caput = art.units.find((u) => u.k === 'caput');
  return (
    <div className="law">
      {art.rub && <div className="law-rub">{art.rub}</div>}
      {art.noCurrent && <div className="badge badge-warn" style={{ marginBottom: 8 }}>A compilação oficial mostra apenas redação anterior (riscada). Confira na fonte.</div>}
      {art.units.map((u) => (
        u === caput ? (
          <div key={u.id} id={`u-${u.id}`} className={`law-unit k-caput${u.rev ? ' rev' : ''}${selectedUnit === u.id ? ' selected' : ''}`} onClick={() => onUnitTap?.(u)}>
            <span className="law-lab">{art.lab}</span>{' '}
            <span className={`law-txt${highlights?.has(u.id) ? ' law-hl' : ''}`}>{u.t ? <TermText text={u.t} onTerm={onTerm} seen={seen} lawId={art.id.split('.')[0]} /> : <span className="faint">{u.rev ? '(revogado)' : ''}</span>}</span>
            {showNotes && (u.notes?.length || u.fn?.length) ? <span className="law-note">{[...(u.notes || []), ...(u.fn || [])].join(' · ')}</span> : null}
          </div>
        ) : (
          <UnitView key={u.id} lawId={art.id.split('.')[0]} u={u} onTerm={onTerm} seen={seen} selected={selectedUnit === u.id} highlighted={highlights?.has(u.id)} onTap={() => onUnitTap?.(u)} showNotes={showNotes} />
        )
      ))}
    </div>
  );
}
