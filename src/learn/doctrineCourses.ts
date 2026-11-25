import { COURSE_BOOKS, DOCTRINE_COURSES, type CourseBookId } from '../content/courseBank';
import { PUBLISHED_DOCTRINE_COURSES } from '../content/doctrineCatalog';
import { db, type ReviewRow } from '../data/db';
import type { DoctrinePart, Exercise } from './generators';
import { isDue } from './scheduler';
import { fold, rng, shuffle } from './text';

export const DOCTRINE_BATCH_SIZE = 8;
export type DoctrineFilter = 'study' | 'errors' | 'due';
export interface DoctrineScope {
  courseId: string;
  moduleId?: string;
  book?: CourseBookId;
  filter: DoctrineFilter;
}

const legacyCards = DOCTRINE_COURSES.flatMap((course) => course.modules.flatMap((module) =>
  ['case', 'criterion'].flatMap((format) => module.facts.map((fact) => ({
    key: `D:${course.id}:${module.id}:${fact[0]}:${format}`,
    course, module, fact, format,
  })))));
const currentCards = PUBLISHED_DOCTRINE_COURSES.flatMap((course) => course.books.flatMap(({ id: book, chapters }) => chapters.flatMap((module) => module.questions.map((question) => ({
  key: `D:${course.id}:${module.id}:${question.id}`,
  course, module, book, question,
})))));
const byKey = new Map([...legacyCards, ...currentCards].map((card) => [card.key, card]));
const byModule = new Map<string, (typeof currentCards)[number][]>();
for (const card of currentCards) {
  const id = card.course.id + ':' + card.module.id;
  const group = byModule.get(id) ?? [];
  group.push(card);
  byModule.set(id, group);
}

function questionPart({ question, key }: (typeof currentCards)[number], seed: string): DoctrinePart {
  const correct = { id: 'correct', text: question.answer, correct: true, why: question.explanation };
  const options = question.distractors
    ? shuffle([correct, ...question.distractors.map((choice, index) => ({ id: `d${index}`, text: choice, correct: false }))], rng(`${key}:${seed}`))
    : [{ id: 'C', text: 'Certo' }, { id: 'E', text: 'Errado' }].map(({ id, text }) => ({
      id, text, correct: id === question.answer, why: id === question.answer ? question.explanation : undefined,
    }));
  return { prompt: question.prompt, options };
}

const topicWords = (text: string) => new Set(fold(text).match(/\b[a-z]{5,}\b/g) ?? []);
function companionQuestions(card: (typeof currentCards)[number]) {
  const module = byModule.get(card.course.id + ':' + card.module.id) ?? [];
  const words = topicWords(card.question.prompt);
  // Repetir o desafio mantém o mesmo conteúdo para revisar o erro cometido.
  const random = rng(card.key + ':parts');
  const peers = module.length >= 3 ? module : currentCards.filter((peer) => peer.course.id === card.course.id && peer.book === card.book);
  return peers.filter((peer) => peer.key !== card.key).map((peer) => ({
    peer, rank: (peer.module === card.module ? 5 : 0)
      + [...topicWords(peer.question.prompt)].filter((word) => words.has(word)).length + random(),
  })).sort((a, b) => b.rank - a.rank).slice(0, 2).map(({ peer }) => peer);
}

export function doctrinePlannerGroups(courseId: string, unit: 'questions' | 'modules') {
  const cards = currentCards.filter((card) => card.course.id === courseId);
  if (unit === 'questions') return cards.map(({ key }) => ({ id: key, keys: [key] }));
  return [...new Set(cards.map(({ module }) => module.id))].map((id) => ({
    id, keys: (byModule.get(courseId + ':' + id) ?? []).map(({ key }) => key),
  }));
}

export function gradeDoctrineParts(parts: DoctrinePart[], answers: string[]) {
  return parts.length === answers.length && parts.every(({ options }, index) =>
    options.some(({ id, correct }) => id === answers[index] && correct));
}

export const doctrineQuestion = (key: string) => byKey.get(key);
/** Rótulo da questão de curso: "Doutrina" nos cursos jurídicos, o nome da disciplina nos demais. */
export const doctrineLabel = (courseId: string) =>
  PUBLISHED_DOCTRINE_COURSES.find(({ id }) => id === courseId)?.subject ?? 'Doutrina';
export function isCurrentDoctrineQuestion(key: string) {
  const card = byKey.get(key);
  return !!card && 'question' in card;
}

export function doctrineExercise(key: string, seed: string): Exercise | null {
  const card = byKey.get(key);
  if (!card) return null;
  const random = rng(`${key}:${seed}`);
  if ('question' in card) {
    const { question, book, course, module } = card;
    const first = questionPart(card, seed);
    const parts = [first, ...companionQuestions(card).map((peer) => questionPart(peer, seed))];
    return {
      key, kind: 'doctrine', family: 'interpretacao', dim: 'conceitual',
      prompt: first.prompt, stem: [], options: first.options, doctrineParts: parts, expectedMs: 30_000 * parts.length, stage: 1, where: module.title,
      doctrine: { courseId: course.id, module: module.title, source: COURSE_BOOKS[book], pages: question.pages },
    };
  }
  const { fact, format, course, module } = card;
  const byCase = format === 'case';
  const distractors = shuffle(module.facts.filter((entry) => entry !== fact), random).slice(0, 3);
  const option = (entry: typeof fact, correct: boolean) => ({
    id: entry[0], text: byCase ? entry[1] : entry[2], correct,
    why: correct ? entry[2] : byCase ? entry[2] : `Esse critério corresponde a ${entry[1]}.`,
  });
  return {
    key, kind: 'doctrine', family: 'interpretacao', dim: byCase ? 'aplicacao' : 'conceitual',
    prompt: byCase ? fact[3] : `Qual critério identifica “${fact[1]}”?`,
    stem: [], options: shuffle([option(fact, true), ...distractors.map((entry) => option(entry, false))], random),
    expectedMs: 35_000, stage: 1, where: module.title,
    doctrine: { courseId: course.id, module: module.title, source: COURSE_BOOKS[module.book], pages: fact[4] },
  };
}

async function readProgress({ courseId, moduleId, book }: Omit<DoctrineScope, 'filter'>) {
  const candidates = currentCards.filter((card) => card.course.id === courseId
    && (!moduleId || card.module.id === moduleId) && (!book || card.book === book));
  const keys = candidates.map(({ key }) => key);
  const [reviews, schedules] = keys.length
    ? await Promise.all([db.reviews.where('cardId').anyOf(keys).toArray(), db.cards.bulkGet(keys)])
    : [[], []];
  const latest = new Map<string, ReviewRow>();
  const first = new Map<string, ReviewRow>();
  for (const row of reviews) {
    if ((latest.get(row.cardId)?.at ?? -1) <= row.at) latest.set(row.cardId, row);
    if ((first.get(row.cardId)?.at ?? Infinity) > row.at) first.set(row.cardId, row);
  }
  const at = new Date();
  return candidates.map((candidate, index) => {
    const last = latest.get(candidate.key);
    const schedule = schedules[index];
    return { ...candidate, last, first: first.get(candidate.key), due: !!schedule && isDue(schedule.fsrs, at) };
  });
}

export async function doctrineProgress(courseId: string) {
  const entries = await readProgress({ courseId });
  return entries.map(({ key, module, last, first, due }) => ({ key, moduleId: module.id, answered: !!last, correct: last?.correct, firstCorrect: first?.correct, due }));
}

export async function doctrineCatalogCounts() {
  const answered = await db.reviews.where('cardId').startsWith('D:').uniqueKeys();
  const counts = new Map<string, number>();
  for (const key of answered) {
    if (typeof key !== 'string') continue;
    const card = byKey.get(key);
    if (!card || !('question' in card)) continue;
    counts.set(card.course.id, (counts.get(card.course.id) ?? 0) + 1);
  }
  return counts;
}

export async function buildDoctrineSession(scope: DoctrineScope, seed: string) {
  const { filter } = scope;
  const entries = await readProgress(scope);
  const filtered = entries.filter(({ last, due }) => filter === 'study' || (filter === 'errors' ? last?.correct === false : due));
  const unanswered = filter === 'study' ? filtered.filter(({ last }) => !last) : [];
  const batch = unanswered.length ? unanswered : filtered.sort((a, b) => (a.last?.at ?? 0) - (b.last?.at ?? 0));
  return batch.slice(0, DOCTRINE_BATCH_SIZE).flatMap(({ key }) => {
    const exercise = doctrineExercise(key, seed);
    return exercise ? [{ ...exercise, practice: filter === 'errors' ? 'revanche' as const : filter === 'due' ? 'revisao' as const : undefined }] : [];
  });
}

export interface DoctrineExamItem {
  key: string; prompt: string; chapterId: string; module: string; source: string; pages: string;
  options: { id: string; text: string; correct: boolean; why?: string }[];
}

/**
 * Questões de múltipla escolha de um curso para o simulado do edital (5 alternativas, como na VUNESP).
 * Distribui as questões entre os blocos indicados e prefere as ainda não respondidas.
 */
export async function doctrineExamQuestions(courseId: string, n: number, seed: string, chapterIds?: string[]): Promise<DoctrineExamItem[]> {
  const random = rng(`exame:${courseId}:${seed}`);
  const cards = currentCards.filter((card) => card.course.id === courseId && card.question.distractors?.length === 4
    && (!chapterIds || chapterIds.includes(card.module.id)));
  const answered = new Set(cards.length ? (await db.reviews.where('cardId').anyOf(cards.map(({ key }) => key)).toArray()).map(({ cardId }) => cardId) : []);
  const groups = new Map<string, typeof cards>();
  for (const card of shuffle(cards, random).sort((a, b) => Number(answered.has(a.key)) - Number(answered.has(b.key)))) {
    groups.set(card.module.id, [...groups.get(card.module.id) ?? [], card]);
  }
  // Um bloco por vez, em rodízio, para cobrir o maior número de tópicos do edital.
  const picked: typeof cards = [];
  const queues = shuffle([...groups.values()], random);
  while (picked.length < n && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < n) picked.push(next);
    }
  }
  return picked.map((card) => {
    const { options } = questionPart(card, seed);
    return { key: card.key, prompt: card.question.prompt, chapterId: card.module.id, module: card.module.title,
      source: COURSE_BOOKS[card.book], pages: card.question.pages, options };
  });
}

/** Cursos praticados recentemente, com o próximo módulo ainda não feito (para "Continuar de onde parou"). */
export async function recentDoctrineCourses(limit = 4) {
  const lastAt = new Map<string, number>();
  await db.reviews.where('cardId').startsWith('D:').each((row) => {
    const card = byKey.get(row.cardId);
    if (!card || !('question' in card)) return;
    if ((lastAt.get(card.course.id) ?? 0) < row.at) lastAt.set(card.course.id, row.at);
  });
  const recent = [...lastAt].sort((a, b) => b[1] - a[1]).slice(0, limit);
  return Promise.all(recent.map(async ([courseId, at]) => {
    const entries = await readProgress({ courseId });
    const next = entries.find((entry) => !entry.last);
    return {
      courseId, at, title: entries[0]?.course.title ?? doctrineLabel(courseId),
      answered: entries.filter((entry) => entry.last).length, total: entries.length,
      nextModule: next?.module.title,
    };
  }));
}
