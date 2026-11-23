// Treino gramatical gerado: escolha do tema e desempenho por tema.
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { GRAM_TOPICS, grammarStats, type GramTopic } from '../learn/gramatica';
import type { AreaId } from '../core/areas';
import { IPlay } from '../ui/icons';
import { nav } from '../ui/nav';
import { haptic } from '../ui/settings';

type Stats = Awaited<ReturnType<typeof grammarStats>>;

export function startGrammar(topic?: GramTopic, area: AreaId = 'geral') {
  haptic('ok');
  const title = topic ? GRAM_TOPICS.find(({ id }) => id === topic)!.title : 'Treino gramatical';
  nav.push({ name: 'session', config: {
    area, focus: 'auto', mode: 'memorizar', minutes: 10, infinite: true, title,
    activity: 'gramatica', gramatica: { topic },
  } });
}

export function GrammarPanel({ area = 'geral' }: { area?: AreaId }) {
  const [stats, setStats] = useState<Stats>();
  useEffect(() => {
    const sub = liveQuery(grammarStats).subscribe({ next: setStats, error: () => {} });
    return () => sub.unsubscribe();
  }, []);
  return (
    <section className="contest-panel stack" aria-labelledby="grammar-title">
      <div className="row between" style={{ gap: 10, flexWrap: 'wrap' }}>
        <div className="grow">
          <h2 className="title-m" id="grammar-title">Treino gramatical</h2>
          <p className="small muted">Exercícios novos a cada rodada, com lacunas e alternativas. Os erros voltam até você fixar a regra.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => startGrammar(undefined, area)}><IPlay size={15} /> Misturado</button>
      </div>
      <div className="list">
        {GRAM_TOPICS.map((topic) => {
          const s = stats?.topics.find(({ id }) => id === topic.id);
          const total = (s?.right ?? 0) + (s?.wrong ?? 0);
          return (
            <button key={topic.id} className="list-item" onClick={() => startGrammar(topic.id, area)}>
              <span className="grow">
                <strong className="small">{topic.title}</strong>
                <small className="muted">{total ? `${Math.round((s!.right / total) * 100)}% de acerto em ${total} exercícios` : topic.detail}</small>
                {!!s?.weakest.length && <small className="contest-wrong">Reforçar: {s.weakest.slice(0, 2).join(', ')}</small>}
              </span>
              <IPlay size={15} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
