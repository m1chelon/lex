// Backup do progresso e restauração local.
import { db, type CardRow, type KV, type MarkRow, type ReviewRow } from './db';
import { setSettings, type Settings } from '../ui/settings';
import { clearPlan, isPlan, savePlan } from '../learn/plan';
import { readSavedSession, sessionInProgress } from '../learn/session';
import { CAPI_WARDROBE_KEY, mergeWardrobes } from '../learn/capiShop';
import { PROFILE_SETTINGS_KEY, profileStorageKey } from './profiles';
import { backupKey } from './profileBackup';
import { mergePontos } from '../learn/ponto';
import { readSavedSimulado } from '../learn/simulado';
import { readPlannerTask, readStudyPlanner } from '../learn/planner';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function rows(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(object)) throw new Error('Dados de progresso inválidos');
  return value as Record<string, unknown>[];
}

function parseBackup(value: unknown) {
  if (!object(value) || value.app !== 'LEX' || (value.version !== undefined && ![1, 2, 3].includes(value.version as number))) throw new Error('Arquivo de backup inválido');
  const cards = rows(value.cards).map((row) => {
    if (typeof row.id !== 'string' || !object(row.fsrs) || typeof row.dim !== 'string' || ![row.correct, row.wrong, row.stage, row.createdAt, row.fsrs.state, row.fsrs.reps].every(Number.isFinite)) throw new Error('Cartão inválido');
    const due = new Date(String(row.fsrs.due));
    const last_review = row.fsrs.last_review ? new Date(String(row.fsrs.last_review)) : undefined;
    if (!Number.isFinite(+due) || (last_review && !Number.isFinite(+last_review))) throw new Error('Data de revisão inválida');
    return { ...row, fsrs: { ...row.fsrs, due, last_review } } as unknown as CardRow;
  });
  const reviews = rows(value.reviews).map((row) => {
    if (typeof row.cardId !== 'string' || typeof row.correct !== 'boolean' || typeof row.type !== 'string' || ![row.at, row.ms, row.rating].every(Number.isFinite)) throw new Error('Revisão inválida');
    return row as unknown as ReviewRow;
  });
  const marks = rows(value.marks).map((row) => {
    if (typeof row.id !== 'string' || typeof row.target !== 'string' || !['fav', 'hl', 'note', 'termfav', 'review'].includes(String(row.kind)) || !Number.isFinite(row.at)) throw new Error('Marcação inválida');
    return row as unknown as MarkRow;
  });
  const kv = rows(value.kv).map((row) => {
    if (typeof row.key !== 'string' || !('value' in row)) throw new Error('Preferência inválida');
    if (row.key === 'session' && row.value != null && !readSavedSession(row.value)) throw new Error('Treino inválido');
    if (row.key === 'studyPlanner' && row.value != null && !readStudyPlanner(row.value)) throw new Error('Planner inválido');
    if (row.key.startsWith('plannerTask:') && row.value != null && !readPlannerTask(row.value, row.key)) throw new Error('Meta inválida');
    if (row.key.startsWith('sim:') && row.value != null && !readSavedSimulado(row.value, row.key.slice(4))) throw new Error('Simulado inválido');
    return row as unknown as KV;
  });
  return { cards, reviews, marks, kv: kv.filter(({ key }) => backupKey(key)),
    plan: isPlan(value.plan) ? value.plan : null, settings: object(value.settings) ? value.settings as Partial<Settings> : {} };
}

const reviewFingerprint = (r: ReviewRow) => JSON.stringify([r.cardId, r.at, r.correct, r.mode, r.type, r.ms, r.given, r.expected]);

/** Mantém o histórico dos dois aparelhos e escolhe o cartão mais recente em caso de conflito. */
export async function importBackup(f: Pick<File, 'text'>) {
  const data = parseBackup(JSON.parse(await f.text()));
  await db.transaction('rw', db.cards, db.reviews, db.marks, db.kv, async () => {
    const [currentCards, currentReviews, currentMarks, currentKeys] = await Promise.all([
      db.cards.bulkGet(data.cards.map(({ id }) => id)),
      db.reviews.toArray(),
      db.marks.bulkGet(data.marks.map(({ id }) => id)),
      db.kv.bulkGet(data.kv.map(({ key }) => key)),
    ]);
    await db.cards.bulkPut(data.cards.filter((card, i) => {
      const current = currentCards[i];
      return !current || +(card.fsrs.last_review ?? new Date(card.createdAt)) > +(current.fsrs.last_review ? new Date(current.fsrs.last_review) : new Date(current.createdAt));
    }));
    const fingerprints = new Map(currentReviews.map((review) => [reviewFingerprint(review), review]));
    const incoming: ReviewRow[] = [];
    for (const { id, ...review } of data.reviews) {
      const fingerprint = reviewFingerprint(review);
      const existing = fingerprints.get(fingerprint);
      if (!existing) {
        fingerprints.set(fingerprint, review);
        incoming.push(review);
      } else if (review.guessed && !existing.guessed) {
        const grade = { guessed: true, rating: review.rating };
        if (existing.id !== undefined) await db.reviews.update(existing.id, grade);
        Object.assign(existing, grade);
      }
    }
    await db.reviews.bulkAdd(incoming);
    await db.marks.bulkPut(data.marks.filter((mark, i) => !currentMarks[i] || mark.at > currentMarks[i]!.at));
    const importedKeys = data.kv.filter(({ key, value }, i) => {
      if (key === CAPI_WARDROBE_KEY || key === 'pontos' || key.startsWith('sim:')) return false;
      const current = currentKeys[i];
      if (!current) return true;
      if (key === 'session') return !sessionInProgress(readSavedSession(current.value))
        && sessionInProgress(readSavedSession(value));
      if (key === 'studyPlanner') return !readStudyPlanner(current.value) && !!readStudyPlanner(value);
      if (key.startsWith('plannerTask:')) return !readPlannerTask(current.value, key) && !!readPlannerTask(value, key);
      return false;
    });
    data.kv.forEach(({ key, value }, i) => {
      if (!key.startsWith('sim:')) return;
      const id = key.slice(4);
      const restored = readSavedSimulado(value, id);
      const local = readSavedSimulado(currentKeys[i]?.value, id);
      if (!restored || local?.finishedAt) return;
      if (!local || restored.finishedAt) {
        importedKeys.push({ key, value: restored });
        return;
      }
      // O histórico local tem precedência quando os dois aparelhos escolheram a mesma questão.
      if (local.startedAt === restored.startedAt && local.questoes.length === restored.questoes.length &&
        local.questoes.every((question, index) => question.id === restored.questoes[index].id)) {
        importedKeys.push({ key, value: { ...local, respostas: { ...restored.respostas, ...local.respostas } } });
      }
    });
    const restoredPontos = data.kv.find(({ key }) => key === 'pontos');
    if (restoredPontos) {
      const local = await db.kv.get('pontos');
      importedKeys.push({ key: 'pontos', value: mergePontos(local?.value, restoredPontos.value) });
    }
    const restoredWardrobe = data.kv.find(({ key }) => key === CAPI_WARDROBE_KEY);
    if (restoredWardrobe) {
      const current = await db.kv.get(CAPI_WARDROBE_KEY);
      importedKeys.push({ key: CAPI_WARDROBE_KEY, value: mergeWardrobes(current?.value, restoredWardrobe.value) });
    }
    for (const key of ['simulados', 'readArticles', 'termsIntroduced', 'lessonsDone']) {
      const fromBackup = data.kv.find((row) => row.key === key)?.value;
      if (!Array.isArray(fromBackup)) continue;
      const current = (await db.kv.get(key))?.value;
      const merged = [...new Set([...(Array.isArray(current) ? current : []), ...fromBackup].filter((id) => typeof id === 'string'))];
      const row = importedKeys.find((item) => item.key === key);
      if (row) row.value = merged;
      else importedKeys.push({ key, value: merged });
    }
    await db.kv.bulkPut(importedKeys);
  });
  setSettings(data.settings);
  if (data.plan) savePlan(data.plan);
}

/** A legislação pública baixada fica disponível após a limpeza. */
export async function eraseProfileData() {
  await db.transaction('rw', db.cards, db.reviews, db.marks, db.kv, async () => {
    await db.cards.clear(); await db.reviews.clear(); await db.marks.clear(); await db.kv.filter(({ key }) => key !== 'corpus-manifest').delete();
  });
  clearPlan();
  try { for (const key of [PROFILE_SETTINGS_KEY, 'lex.weather', 'lex.pomodoro']) localStorage.removeItem(profileStorageKey(key)); } catch { /* sem armazenamento */ }
}
