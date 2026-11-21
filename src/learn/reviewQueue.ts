import { db, type ReviewRow } from '../data/db';
import { isCurrentDoctrineQuestion } from './doctrineCourses';
import { isDue } from './scheduler';

export const REVIEW_REASON = {
  saved: 'Salva por você',
  wrong: 'Você errou',
  guessed: 'Você chutou',
  due: 'Revisão de hoje',
} as const;

export async function latestReviews() {
  const latest = new Map<string, ReviewRow>();
  await db.reviews.orderBy('at').reverse().each((review) => {
    if (!latest.has(review.cardId)) latest.set(review.cardId, review);
  });
  return latest;
}

export async function reviewQueue() {
  const [cards, latest, saved] = await Promise.all([
    db.cards.toArray(),
    latestReviews(),
    db.marks.where('kind').equals('review').toArray(),
  ]);
  const marked = new Map(saved.map((mark) => [mark.target, mark.at]));
  const now = new Date();
  return cards.flatMap((card) => {
    const last = latest.get(card.id);
    if (!last || (!card.articleId && !card.conceptId && !card.id.startsWith('P:') && !isCurrentDoctrineQuestion(card.id))) return [];
    const savedAt = marked.get(card.id);
    const reason: keyof typeof REVIEW_REASON | null = savedAt !== undefined ? 'saved' : !last.correct ? 'wrong' : last.guessed ? 'guessed' : isDue(card.fsrs, now) ? 'due' : null;
    return reason ? [{ card, last, reason, at: savedAt ?? last.at }] : [];
  }).sort((a, b) => b.at - a.at);
}

export type ReviewItem = Awaited<ReturnType<typeof reviewQueue>>[number];

export function reviewMarkId(cardId: string) { return `review:${cardId}`; }

export async function setReviewMark(cardId: string, saved: boolean) {
  const id = reviewMarkId(cardId);
  if (saved) await db.marks.put({ id, kind: 'review', target: cardId, at: Date.now() });
  else await db.marks.delete(id);
}
