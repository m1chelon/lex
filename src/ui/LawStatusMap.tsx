// Mapa da legislação por desempenho: verde acertou tudo, amarelo em parte, vermelho errou tudo.
import { useEffect, useRef } from 'react';
import { getArticle } from '../data/corpus';
import type { ArtStatus } from '../learn/articleStatus';

export const STATUS_LABEL: Record<ArtStatus, string> = { todo: 'sem resposta', ok: 'acertou tudo', mid: 'acertou em parte', bad: 'errou tudo' };

const short = (id: string) => getArticle(id)?.art.n.replace(/^[a-z]+\d*-/, '') ?? id.split('.').slice(1).join('.');

export function StatusLegend() {
  return (
    <div className="status-legend small muted" aria-hidden="true">
      <span><i className="sdot ok" />Acertou tudo</span>
      <span><i className="sdot mid" />Em parte</span>
      <span><i className="sdot bad" />Errou</span>
      <span><i className="sdot todo" />Sem resposta</span>
    </div>
  );
}

export function LawStatusGrid({ ids, status, current, onPick }: { ids: string[]; status: Map<string, ArtStatus>; current?: string; onPick?: (id: string) => void }) {
  const currentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { currentRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' }); }, [current]);
  return (
    <div className="mapgrid status-grid">
      {ids.map((id) => {
        const st = status.get(id) ?? 'todo';
        const isCurrent = id === current;
        return (
          <button key={id} ref={isCurrent ? currentRef : undefined} className={`cell s-${st}${isCurrent ? ' current' : ''}`}
            aria-current={isCurrent || undefined} aria-label={`${getArticle(id)?.art.lab ?? id}: ${STATUS_LABEL[st]}${isCurrent ? ' (atual)' : ''}`}
            onClick={onPick ? () => onPick(id) : undefined}>{short(id)}</button>
        );
      })}
    </div>
  );
}

/** Faixa compacta exibida durante o treino: artigos da sessão, com o atual centralizado. */
export function LawStatusStrip({ ids, status, current, onOpen }: { ids: string[]; status: Map<string, ArtStatus>; current?: string; onOpen: () => void }) {
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>('.current');
    if (el && rail.current) rail.current.scrollTo({ left: el.offsetLeft - rail.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [current, ids.length]);
  const done = ids.filter((id) => (status.get(id) ?? 'todo') !== 'todo').length;
  return (
    <button className="status-strip" onClick={onOpen} aria-label={`Mapa da legislação: ${done} de ${ids.length} artigos respondidos. Abrir mapa.`}>
      <div className="status-rail" ref={rail} aria-hidden="true">
        {ids.map((id) => <span key={id} className={`scell s-${status.get(id) ?? 'todo'}${id === current ? ' current' : ''}`}>{short(id)}</span>)}
      </div>
      <span className="status-strip-more small" aria-hidden="true">Mapa</span>
    </button>
  );
}
