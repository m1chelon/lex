import { PUBLISHED_DOCTRINE_COURSES } from '../content/doctrineCatalog';
import { getArea } from '../core/areas';
import { SOURCES } from '../core/sources';
import type { Article, LawDoc, Unit } from '../core/types';
import { COURSE_NAME } from './plan';
import { fold, normAnswer } from './text';

const aliases: Record<string, string[]> = {
  cf: ['cf 88', 'constituicao', 'constituicao federal'],
  cc: ['cc 02', 'codigo civil'],
  cdc: ['codigo do consumidor', 'codigo de defesa do consumidor', 'cdc 90'],
  cpc: ['cpc 15', 'codigo de processo civil'],
  cp: ['codigo penal'],
  cpp: ['codigo de processo penal'],
};

export function parseArticleQuery(query: string) {
  const lower = fold(query.trim());
  const article = /\bart(?:igo)?\.?\s*(\d{1,4})(?:[º°])?(?:\s*-\s*([a-z]))?(?!\d|[a-z])/i.exec(lower);
  if (!article) return null;
  const lawName = normAnswer(lower.slice(0, article.index) + ' ' + lower.slice(article.index + article[0].length))
    .replace(/^(?:da|do|de)\s+/, '').replace(/\s+(?:da|do|de)$/, '');
  const law = SOURCES.find(({ id, short, title }) =>
    [id, normAnswer(short), normAnswer(title), ...(aliases[id] ?? [])].includes(lawName));
  const number = article[1] + (article[2] ? '-' + article[2].toUpperCase() : '');
  return { number, lawId: law?.id, unknownLaw: !!lawName && !law };
}

export function searchArticles(laws: LawDoc[], query: string, limit = 50) {
  const exact = parseArticleQuery(query);
  const terms = fold(query.trim()).split(/\s+/);
  const results: { law: LawDoc; art: Article; unit?: Unit; snippet?: string }[] = [];
  if (exact?.unknownLaw) return results;
  for (const law of laws) {
    if (exact?.lawId && exact.lawId !== law.id) continue;
    for (const art of law.articles) {
      if (exact) {
        if (art.n === exact.number) results.push({ law, art });
      } else {
        const unit = art.units.find((entry) => {
          const text = fold(entry.t);
          return terms.every((term) => text.includes(term));
        });
        if (unit) {
          const start = fold(unit.t).indexOf(terms[0]);
          const snippet = (start > 40 ? '…' : '') + unit.t.slice(Math.max(0, start - 40), start + 120) + (unit.t.length > start + 120 ? '…' : '');
          results.push({ law, art, unit, snippet });
        }
      }
      if (results.length >= limit) return results;
    }
  }
  return results;
}

const contests = (['tjsp', 'tjms'] as const).map((id) => ({
  id, title: COURSE_NAME[id], index: normAnswer(COURSE_NAME[id] + ' ' + getArea(id).title + ' ' + getArea(id).subtitle + ' ' + getArea(id).edital?.title),
}));
let chapters: { id: string; moduleId: string; title: string; course: string; haystack: string }[] | undefined;

export function searchCatalog(query: string) {
  const terms = normAnswer(query).split(' ').filter(Boolean);
  const matches = (text: string) => terms.length > 0 && terms.every((word) => text.includes(word));
  const courseResults = PUBLISHED_DOCTRINE_COURSES.filter(({ title }) => matches(normAnswer(title)));
  const contestResults = contests.filter(({ index }) => matches(index));
  chapters ??= PUBLISHED_DOCTRINE_COURSES.flatMap((course) => course.books.flatMap((book) => book.chapters.map((chapter) => ({
    id: course.id, moduleId: chapter.id, title: chapter.title, course: course.title,
    haystack: normAnswer(chapter.title + ' ' + chapter.questions.map(({ prompt }) => prompt).join(' ')),
  }))));
  const topics = chapters.filter(({ haystack }) => matches(haystack))
    .sort((a, b) => Number(matches(normAnswer(b.title))) - Number(matches(normAnswer(a.title)))).slice(0, 12);
  return { courseResults, contestResults, topics };
}
