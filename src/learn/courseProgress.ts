import { findLawConcept } from '../content/lawCases';
import { SOURCES, type Ramo } from '../core/sources';
import { coverage, getArticle, getLaw, getManifest, lawIdOf } from '../data/corpus';
import { db, kvGet, type CardRow, type ReviewRow } from '../data/db';
import { computeMastery } from './mastery';
import { isDue } from './scheduler';

export type Practice = 'review' | 'errors' | 'memory';
type ArticleProgress = {
  id: string;
  seen: boolean;
  firm: boolean;
  due: CardRow[];
  errors: CardRow[];
  answers: Set<ReviewRow>;
};

export type CourseProgress = Awaited<ReturnType<typeof loadCourseProgress>>;

export function loadCourseProgress(area: 'tjsp' | 'tjms') {
  return loadArticleProgress(coverage(area).required);
}

function cardArticleIds({ articleId, conceptId }: CardRow) {
  if (articleId) return [articleId];
  return findLawConcept(conceptId ?? '')?.refs.map(({ law, art }) => `${law}.${art}`) ?? [];
}

export async function loadBranchCoverage() {
  const [cards, read] = await Promise.all([db.cards.toArray(), kvGet<string[]>('readArticles', [])]);
  const seen = new Set(read);
  for (const card of cards) cardArticleIds(card).forEach((id) => seen.add(id));

  const seenByLaw = new Map<string, number>();
  for (const id of seen) {
    const lawId = lawIdOf(id);
    if (getLaw(lawId)) {
      const article = getArticle(id)?.art;
      if (!article || article.rev) continue;
    }
    seenByLaw.set(lawId, (seenByLaw.get(lawId) ?? 0) + 1);
  }

  // O manifesto mantém o total da matéria mesmo antes de baixar todas as leis.
  const manifest = new Map(getManifest()?.laws.map((law) => [law.id, law]));
  const branches = new Map<Ramo, { seen: number; total: number }>();
  for (const { id, ramo } of SOURCES) {
    if (!ramo) continue;
    const entry = manifest.get(id);
    const published = entry?.status === 'ok' ? (entry.articles ?? entry.stats?.articles ?? 0) - (entry.stats?.revoked ?? 0) : 0;
    const total = getLaw(id)?.articles.filter(({ rev }) => !rev).length ?? published;
    if (total <= 0) continue;
    const row = branches.get(ramo) ?? { seen: 0, total: 0 };
    row.seen += Math.min(seenByLaw.get(id) ?? 0, total);
    row.total += total;
    branches.set(ramo, row);
  }
  return branches;
}

export async function loadArticleProgress(required?: ReadonlySet<string>) {
  const [cards, reviews, read] = await Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
    kvGet<string[]>('readArticles', []),
  ]);
  const now = new Date();
  const seen = new Set(read);
  const latest = new Map<string, ReviewRow>();
  const byCard = new Map<string, ReviewRow[]>();
  const byArticle = new Map<string, CardRow[]>();
  for (const answer of reviews) {
    const history = byCard.get(answer.cardId);
    if (history) history.push(answer);
    else byCard.set(answer.cardId, [answer]);
    if ((latest.get(answer.cardId)?.at ?? -1) <= answer.at) latest.set(answer.cardId, answer);
  }
  for (const card of cards) {
    for (const id of new Set(cardArticleIds(card))) {
      if (required && !required.has(id)) continue;
      const list = byArticle.get(id);
      if (list) list.push(card);
      else byArticle.set(id, [card]);
    }
  }
  const articles = new Map<string, ArticleProgress>();
  for (const id of required ?? new Set([...seen, ...byArticle.keys()])) {
    const scoped = byArticle.get(id) ?? [];
    const progress = scoped.length ? computeMastery(id, scoped, now) : null;
    articles.set(id, {
      id,
      seen: seen.has(id) || scoped.length > 0,
      firm: (progress?.level ?? 0) >= 3,
      due: scoped.filter((c) => isDue(c.fsrs, now)),
      errors: scoped.filter((c) => latest.get(c.id)?.correct === false),
      answers: new Set(scoped.flatMap((c) => byCard.get(c.id) ?? [])),
    });
  }
  return articles;
}

export function courseStats(progress: CourseProgress, ids: Iterable<string>) {
  const articles: ArticleProgress[] = [];
  const answers = new Set<ReviewRow>();
  let seen = 0;
  let firm = 0;
  for (const id of ids) {
    const entry = progress.get(id);
    if (!entry) continue;
    articles.push(entry);
    entry.answers.forEach((answer) => answers.add(answer));
    if (entry.seen) seen++;
    if (entry.firm) firm++;
  }
  let correct = 0;
  const first = new Map<string, ReviewRow>();
  answers.forEach((answer) => {
    if (answer.correct) correct++;
    if ((first.get(answer.cardId)?.at ?? Infinity) > answer.at) first.set(answer.cardId, answer);
  });
  const firstCorrect = [...first.values()].filter(({ correct }) => correct).length;
  return { articles, seen, firm, correct, wrong: answers.size - correct, firstCorrect, firstTotal: first.size };
}

export function practiceArticles(articles: ArticleProgress[], practice: Practice) {
  if (practice === 'review') return articles.filter((a) => a.due.length).sort((a, b) => b.due.length - a.due.length);
  if (practice === 'errors') return articles.filter((a) => a.errors.length).sort((a, b) => b.errors.length - a.errors.length);
  return articles.filter((a) => !a.firm).sort((a, b) => Number(b.seen) - Number(a.seen));
}
