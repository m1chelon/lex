import type { CSSProperties } from 'react';
import { getUnit } from '../data/corpus';
import { unitPathParts } from '../learn/generators';

export function LegalReference({ where, unitId, onOpen }: { where: string; unitId?: string; onOpen?: () => void }) {
  const hit = unitId ? getUnit(unitId) : undefined;
  const [law, ...parts] = hit
    ? [hit.law.short, ...unitPathParts(hit.art, hit.unit)]
    : where.split(/ · |, | — /);

  const description = [law, parts.join(', ')].filter(Boolean).join(' · ');
  const content = (
    <>
      <span className="legal-reference-law">{law}</span>
      {parts.map((part, index) => (
        <span key={index} className="legal-reference-part" style={{ '--reference-step': index } as CSSProperties}>
          {part}
        </span>
      ))}
    </>
  );
  return onOpen
    ? <button type="button" className="where legal-reference reference-button" onClick={onOpen}
        aria-label={`Consultar texto legal · ${description}`}>{content}</button>
    : <div className="where legal-reference" role="group" aria-label={`Dispositivo · ${description}`}>{content}</div>;
}
