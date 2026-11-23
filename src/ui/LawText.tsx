import { memo, useMemo } from 'react';
import type { Article, Unit } from '../core/types';
import { findTerms } from '../learn/terms';
import { haptic, useSettings } from './settings';

export type OnTerm = (id: string) => void;

/** Texto com termos do dicionário sublinhados (apenas a 1ª ocorrência por dispositivo, salvo preferência). */
export const TermText = memo(function TermText({ text, onTerm, seen, disabled, lawId, focus }: { focus?: string[]; text: string; onTerm?: OnTerm; seen?: Set<string>; disabled?: boolean; lawId?: string }) {
  const { underlineAll } = useSettings();
  const parts = useMemo(() => {
    const emphasis = (focus ?? []).flatMap((term) => {
      const start = text.indexOf(term);
      return start < 0 ? [] : [{ start, end: start + term.length, id: '', emphasis: true }];
    });
    const terms = disabled || !onTerm ? [] : findTerms(text, lawId);
    const hits = [...emphasis, ...terms.filter((term) => !emphasis.some((part) => term.start < part.end && part.start < term.end))]
      .sort((a, b) => a.start - b.start);
    const out: (string | { t: string; id: string; emphasis?: boolean })[] = [];
    let i = 0;
    for (const h of hits) {
      if (h.id && !underlineAll && seen) { if (seen.has(h.id)) continue; seen.add(h.id); }
      if (h.start < i) continue;
      out.push(text.slice(i, h.start), { t: text.slice(h.start, h.end), id: h.id, emphasis: 'emphasis' in h });
      i = h.end;
    }
    out.push(text.slice(i));
    return out;
  }, [text, disabled, underlineAll, lawId, focus]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {parts.map((p, k) => typeof p === 'string' ? <span key={k}>{p}</span> : p.emphasis ? <mark key={k} className="law-hl">{p.t}</mark> : (
        <span key={k} role="button" tabIndex={0} className="term" onClick={(e) => { e.stopPropagation(); haptic('soft'); onTerm!(p.id); }} onKeyDown={(e) => { if (e.key === 'Enter') onTerm!(p.id); }}>{p.t}</span>
      ))}
    </>
  );
});

export function UnitView({ u, onTerm, seen, selected, highlighted, onTap, showNotes = true, lawId, focus = [] }: { focus?: string[]; lawId?: string; u: Unit; onTerm?: OnTerm; seen?: Set<string>; selected?: boolean; highlighted?: boolean; onTap?: () => void; showNotes?: boolean }) {
  if (!u.t && u.old?.length && !u.rev) return null;
  return (
    <div id={`u-${u.id}`} className={`law-unit k-${u.k}${u.rev ? ' rev' : ''}${selected ? ' selected' : ''}`} onClick={onTap}>
      {u.rub && <div className="law-rub">{u.rub}</div>}
      {u.k !== 'caput' && u.lab && <span className="law-lab">{u.lab}{u.k === 'inc' || u.k === 'pena' || u.k === 'item' ? ' –' : ''}</span>}
      <span className={`law-txt${highlighted ? ' law-hl' : ''}`}>{u.t ? <TermText text={u.t} onTerm={onTerm} seen={seen} lawId={lawId} focus={focus} /> : <span className="faint">{u.rev ? '(revogado)' : ''}</span>}</span>
      {showNotes && (u.notes?.length || u.fn?.length) ? (
        <span className="law-note">{[...(u.notes || []), ...(u.fn || [])].join(' · ')}</span>
      ) : null}
    </div>
  );
}

export function ArticleView({ art, onTerm, selectedUnit, highlights, onUnitTap, showNotes = true, focus = [], only }: { art: Article; onTerm?: OnTerm; selectedUnit?: string; highlights?: Set<string>; onUnitTap?: (u: Unit) => void; showNotes?: boolean; focus?: { unitId: string; text: string }[]; /** Mostra só estes dispositivos (o perguntado e os que o introduzem). */ only?: Set<string> }) {
  const seen = new Set<string>();
  const guided = (unit: Unit) => focus.filter(({ unitId }) => unitId === unit.id).map(({ text }) => text);
  const caput = art.units.find((u) => u.k === 'caput');
  return (
    <div className="law">
      {art.rub && <div className="law-rub">{art.rub}</div>}
      {art.noCurrent && <div className="badge badge-warn" style={{ marginBottom: 8 }}>A compilação oficial mostra apenas redação anterior (riscada). Confira na fonte.</div>}
      {art.units.filter((u) => !only || only.has(u.id)).map((u) => (
        u === caput ? (
          <div key={u.id} id={`u-${u.id}`} className={`law-unit k-caput${u.rev ? ' rev' : ''}${selectedUnit === u.id ? ' selected' : ''}`} onClick={() => onUnitTap?.(u)}>
            <span className="law-lab">{art.lab}</span>{' '}
            <span className={`law-txt${highlights?.has(u.id) ? ' law-hl' : ''}`}>{u.t ? <TermText text={u.t} onTerm={onTerm} seen={seen} lawId={art.id.split('.')[0]} focus={guided(u)} /> : <span className="faint">{u.rev ? '(revogado)' : ''}</span>}</span>
            {showNotes && (u.notes?.length || u.fn?.length) ? <span className="law-note">{[...(u.notes || []), ...(u.fn || [])].join(' · ')}</span> : null}
          </div>
        ) : (
          <UnitView key={u.id} lawId={art.id.split('.')[0]} u={u} onTerm={onTerm} seen={seen} selected={selectedUnit === u.id} highlighted={highlights?.has(u.id)} onTap={() => onUnitTap?.(u)} showNotes={showNotes} focus={guided(u)} />
        )
      ))}
    </div>
  );
}
