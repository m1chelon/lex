import type { CoverKind } from '../ui/CourseCover';
import type { CourseBookId } from './courseBank';

export interface DoctrineQuestion {
  id: number;
  pages: string;
  prompt: string;
  answer: string;
  explanation: string;
  distractors?: string[];
}

export interface DoctrineChapter {
  id: string;
  number: number;
  title: string;
  pages: string;
  questions: DoctrineQuestion[];
}

const readRange = (range: string): [number, number] => {
  const match = /^(\d+)(?:–(\d+))?$/.exec(range);
  if (!match) throw new Error(`Invalid doctrine page range: ${range}`);
  return [Number(match[1]), Number(match[2] ?? match[1])];
};

function readChapters(text: string, prefix: string, chapterCount: number, startPage: number, endPage: number) {
  const chapters: DoctrineChapter[] = [];
  let chapter: DoctrineChapter | undefined;

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const fields = line.split('|').map((part) => part.trim());
    if (line.startsWith('@')) {
      const [marker, title, pages] = fields;
      const number = chapters.length + 1;
      const id = `${prefix}${String(number).padStart(2, '0')}`;
      if (fields.length !== 3 || marker.toLowerCase() !== `@${id}` || !title) {
        throw new Error(`Invalid doctrine chapter header: ${line}`);
      }
      chapter = { id, number, title, pages, questions: [] };
      chapters.push(chapter);
      continue;
    }

    const [pages, prompt, answer, explanation, ...distractors] = fields;
    const trueFalse = fields.length === 4 && ['C', 'E'].includes(answer);
    if (!chapter || fields.some((field) => !field) || (!trueFalse && fields.length !== 7)) {
      throw new Error(`Invalid doctrine question: ${line}`);
    }
    const [first, last] = readRange(chapter.pages);
    const references = pages.split(', ').map(readRange);
    if (references.some(([start, end]) => start < startPage || end < start || end > endPage)
      || !references.some(([start, end]) => start <= last && end >= first)
      || new Set([answer, ...distractors].map((option) => option.toLowerCase())).size !== 1 + distractors.length) {
      throw new Error(`Invalid reference or options in ${chapter.id}: ${line}`);
    }

    // Append new questions to each chapter so existing review IDs stay stable.
    chapter.questions.push({
      id: chapter.questions.length + 1,
      pages, prompt, answer, explanation,
      distractors: trueFalse ? undefined : distractors,
    });
  }
  let previousEnd = startPage;
  for (const entry of chapters) {
    const [start, end] = readRange(entry.pages);
    const contiguous = start === previousEnd || (entry.number > 1 && start === previousEnd + 1);
    if (!contiguous || end < start || !entry.questions.length) {
      throw new Error(`Incomplete doctrine chapter: ${entry.id}`);
    }
    previousEnd = end;
  }
  if (chapters.length !== chapterCount || previousEnd !== endPage) {
    throw new Error(`Incomplete doctrine book: ${prefix}`);
  }
  return chapters;
}

interface DoctrineBookConfig {
  id: CourseBookId;
  trackTitle: string;
  prefix: string;
  startPage?: number;
  pageCount: number;
  chapterCount: number;
  kind?: 'capítulo' | 'bloco';
  sources: readonly string[];
  sections: readonly { title: string; end: number }[];
}

export function defineDoctrineBook({
  id, trackTitle, prefix, startPage = 1, pageCount, chapterCount, kind = 'capítulo', sources, sections,
}: DoctrineBookConfig) {
  const endPage = startPage + pageCount - 1;
  const chapters = readChapters(sources.join('\n'), prefix, chapterCount, startPage, endPage);
  let start = 0;
  const parts = sections.map(({ title, end }) => {
    if (end <= start || end > chapters.length) throw new Error(`Invalid study plan section: ${title}`);
    const group = { title, chapters: chapters.slice(start, end) };
    start = end;
    return group;
  });
  if (start !== chapters.length) throw new Error(`Incomplete study plan: ${id}`);
  return { id, trackTitle, startPage, endPage, pageCount, kind, chapters, parts };
}

export interface PublishedDoctrineCourse {
  id: string;
  title: string;
  cover: CoverKind;
  books: readonly ReturnType<typeof defineDoctrineBook>[];
}
