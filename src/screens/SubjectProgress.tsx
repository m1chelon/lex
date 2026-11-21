import { useState } from 'react';
import { useCorpusVersion } from '../App';
import { CONCEPTS } from '../content/concepts';
import { RAMOS, type AreaId } from '../core/areas';
import { SOURCES, type Ramo } from '../core/sources';
import { articleTitle, coverage, getArticle, getManifest } from '../data/corpus';
import { courseStats, loadArticleProgress } from '../learn/courseProgress';
import { REVIEW_REASON, reviewQueue, type ReviewItem } from '../learn/reviewQueue';
import { Carousel } from '../ui/Carousel';
import { IPlay } from '../ui/icons';
import { nav } from '../ui/nav';
import { Sheet, useAsync } from '../ui/primitives';
import { RAMO_STYLE } from '../ui/ramo';
import { haptic } from '../ui/settings';

const subjects = new Map(SOURCES.map((law) => [law.id, law.ramo]));
const conceptArticles = new Map(CONCEPTS.map(({ id, refs }) => [id, refs.map(({ law, art }) => law + '.' + art)]));
const lawOf = (id: string) => id.split('.')[0];
const subjectOf = (id: string) => subjects.get(lawOf(id));
const countFormat = new Intl.NumberFormat('pt-BR');

async function subjectProgress(area: AreaId) {
  const required = area === 'geral' ? undefined : coverage(area).required;
  const [progress, queue] = await Promise.all([loadArticleProgress(required), reviewQueue()]);
  const articles = [...progress.keys()];
  const manifest = getManifest()?.laws ?? [];
  return RAMOS.flatMap((ramo) => {
    const ids = articles.filter((id) => subjectOf(id) === ramo);
    const { seen, firstCorrect, firstTotal } = courseStats(progress, ids);
    const total = required ? ids.length : manifest.reduce((sum, law) => {
      if (law.status !== 'ok' || subjects.get(law.id) !== ramo) return sum;
      return sum + Math.max(0, (law.articles ?? law.stats?.articles ?? 0) - (law.stats?.revoked ?? 0));
    }, 0);
    if (!total && !seen) return [];
    const reviews = queue.filter(({ card }) => {
      const references = card.articleId ? [card.articleId] : conceptArticles.get(card.conceptId ?? '') ?? [];
      return references.some((id) => (!required || required.has(id)) && subjectOf(id) === ramo);
    });
    return [{ ramo, seen, total: Math.max(total, seen), firstCorrect, firstTotal, reviews }];
  }).sort((a, b) => b.reviews.length - a.reviews.length || b.seen - a.seen);
}

function reviewLabel(item: ReviewItem) {
  const id = item.card.articleId ?? conceptArticles.get(item.card.conceptId ?? '')?.[0];
  if (!id) return 'Questão';
  const hit = getArticle(id);
  if (hit) return articleTitle(hit.law.id, hit.art);
  const law = SOURCES.find((source) => source.id === lawOf(id));
  return (law?.short ?? lawOf(id).toUpperCase()) + ' · Art. ' + id.slice(id.indexOf('.') + 1);
}

export function SubjectProgress({ area }: { area: AreaId }) {
  const version = useCorpusVersion();
  const [selected, setSelected] = useState<Ramo>();
  const rows = useAsync(() => subjectProgress(area), [area, version]);
  const current = rows?.find((row) => row.ramo === selected);
  const start = (items: ReviewItem[]) => {
    setSelected(undefined);
    nav.push({ name: 'session', config: {
      mode: 'memorizar', minutes: 10, area, focus: 'auto', activity: 'review',
      practiceCardIds: items.slice(0, 12).map(({ card }) => card.id), title: 'Revisão · ' + selected,
    } });
  };

  if (!rows?.length) return null;
  return <section className="subject-progress" aria-labelledby="subject-progress-title">
    <h2 id="subject-progress-title" className="title-m">Progresso por matéria</h2>
    <Carousel label="Gráficos por matéria">
      {rows.map(({ ramo, seen, total, firstCorrect, firstTotal, reviews }) => {
        return <button className="subject-metrics glass" key={ramo} onClick={() => { haptic('soft'); setSelected(ramo); }} aria-label={'Revisão e progresso de ' + ramo}>
          <strong>{RAMO_STYLE[ramo].icon(17)} {ramo}</strong>
          <span className="subject-measure">
            <span>Artigos estudados</span>
            <meter min={0} max={Math.max(1, total)} value={seen} aria-label="Artigos estudados" />
            <span>{countFormat.format(seen)} de {countFormat.format(total)}</span>
          </span>
          <span className="subject-measure accuracy">
            <span>Acertos de primeira</span>
            <meter min={0} max={Math.max(1, firstTotal)} value={firstCorrect} aria-label="Acertos na primeira tentativa" />
            <span>{firstTotal ? Math.round(100 * firstCorrect / firstTotal) + '%' : 'Sem respostas'}</span>
          </span>
          {!!reviews.length && <span className="subject-review-count">{reviews.length} para revisar</span>}
        </button>;
      })}
    </Carousel>
    <Sheet open={!!current} label={selected ? 'Revisão · ' + selected : 'Revisão por matéria'} onClose={() => setSelected(undefined)}>
      {current && <div className="stack planner-sheet">
        <h2 className="title-m">{current.ramo}</h2>
        {current.reviews.length ? <>
          <button className="btn btn-primary btn-block" onClick={() => start(current.reviews)}><IPlay size={18} /> Revisar {Math.min(12, current.reviews.length)} {current.reviews.length === 1 ? 'questão' : 'questões'}</button>
          <ul className="subject-review-list">{current.reviews.slice(0, 12).map((item) => <li key={item.card.id}>
            <button className="btn btn-quiet btn-block" onClick={() => start([item])}><span>{reviewLabel(item)}</span><small>{REVIEW_REASON[item.reason]}</small></button>
          </li>)}</ul>
        </> : <p className="muted">Você está em dia com as revisões desta matéria.</p>}
      </div>}
    </Sheet>
  </section>;
}
