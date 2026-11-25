// Situação de cada artigo para o mapa da legislação: verde (acertou tudo), amarelo (acertou em parte),
// vermelho (errou tudo) e cinza (ainda sem resposta). Conta a última resposta de cada questão.
import { db } from '../data/db';
import type { SessionState } from './session';

export type ArtStatus = 'todo' | 'ok' | 'mid' | 'bad';

export function statusOf(answers: Iterable<boolean>): ArtStatus {
  let right = 0, wrong = 0;
  for (const correct of answers) correct ? right++ : wrong++;
  if (!right && !wrong) return 'todo';
  return !wrong ? 'ok' : !right ? 'bad' : 'mid';
}

/** Artigos da sessão, na ordem em que aparecem, com o resultado desta sessão. */
export function sessionArticleStatus(s: Pick<SessionState, 'items' | 'results'>): { order: string[]; status: Map<string, ArtStatus> } {
  const order: string[] = [];
  const answers = new Map<string, Map<string, boolean>>();
  s.items.forEach((item, index) => {
    const id = item.articleId;
    if (!id) return;
    if (!answers.has(id)) { answers.set(id, new Map()); order.push(id); }
    const result = s.results[index];
    if (result && result.correct !== null) answers.get(id)!.set(item.key, result.correct);
  });
  return { order, status: new Map(order.map((id) => [id, statusOf(answers.get(id)!.values())])) };
}

/** Histórico de todas as sessões: última resposta de cada questão, agrupada por artigo. */
export async function historyArticleStatus(articleIds: string[]): Promise<Map<string, ArtStatus>> {
  const latest = new Map<string, Map<string, { at: number; correct: boolean }>>();
  try {
    const rows = await db.reviews.where('articleId').anyOf(articleIds).toArray();
    for (const r of rows) {
      if (!r.articleId) continue;
      const byCard = latest.get(r.articleId) ?? new Map();
      const prev = byCard.get(r.cardId);
      if (!prev || prev.at <= r.at) byCard.set(r.cardId, { at: r.at, correct: r.correct });
      latest.set(r.articleId, byCard);
    }
  } catch { /* sem histórico */ }
  return new Map(articleIds.map((id) => [id, statusOf([...(latest.get(id)?.values() ?? [])].map((x) => x.correct))]));
}
