import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import type { DoctrineChapter } from '../content/doctrineBooks';
import { PUBLISHED_DOCTRINE_COURSES } from '../content/doctrineCatalog';
import { doctrineCatalogCounts, doctrineProgress, isCurrentDoctrineQuestion, type DoctrineScope } from '../learn/doctrineCourses';
import { loadSession, type SessionState } from '../learn/session';
import { fold } from '../learn/text';
import { CourseCover } from '../ui/CourseCover';
import { IBook, IHistory, IPlay, ISearch } from '../ui/icons';
import { nav } from '../ui/nav';
import { PageHeader, SectionHeader } from '../ui/primitives';
import { haptic } from '../ui/settings';
import { SubjectGlyph } from '../ui/ramo';
import { StudyMetrics } from '../ui/StudyMetrics';

const countFor = (chapters: readonly DoctrineChapter[]) =>
  chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
const courseCatalog = PUBLISHED_DOCTRINE_COURSES.map((course) => {
  const bookTotals = course.books.map((book) => countFor(book.chapters));
  return {
    ...course,
    bookTotals,
    total: bookTotals.reduce((sum, count) => sum + count, 0),
    chapterCount: course.books.reduce((sum, book) => sum + book.chapters.length, 0),
  };
});

const quantity = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

export function DoctrineCatalog() {
  const [progress, setProgress] = useState(new Map<string, number>());
  useEffect(() => {
    const sub = liveQuery(doctrineCatalogCounts).subscribe({ next: setProgress, error: () => {} });
    return () => sub.unsubscribe();
  }, []);
  return (
    <section className="stack tab-content">
      <SectionHeader title="Cursos" description="Questões comentadas por matéria: doutrina jurídica, Português e Informática." icon={<span className="section-icon courses"><IBook /></span>}
        right={<button className="icon-btn glass" aria-label="Buscar no LEX" onClick={() => nav.push({ name: 'search' })}><ISearch size={20} /></button>} />
      <div className="contest-catalog doctrine-catalog">
        {courseCatalog.map((course) => (
          <button key={course.id} className="course" onClick={() => { haptic('tap'); nav.push({ name: 'doutrina-curso', id: course.id }); }}>
            <CourseCover kind={course.cover} />
            <span className="contest-cover-copy">
              <strong className="heading-with-icon"><SubjectGlyph title={course.title} small />{course.title}</strong><small>{course.total.toLocaleString('pt-BR')} questões</small>
              <progress value={progress.get(course.id) ?? 0} max={course.total} aria-label={`${progress.get(course.id) ?? 0} questões praticadas`} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function DoctrineCourseScreen({ id, moduleId }: { id: string; moduleId?: string }) {
  const course = courseCatalog.find((item) => item.id === id);
  return course ? <DoctrineCourseDetail key={id} course={course} initialModule={moduleId} /> : <PageHeader title="Curso em reformulação" />;
}

function DoctrineCourseDetail({ course, initialModule }: { course: (typeof courseCatalog)[number]; initialModule?: string }) {
  const { id, total, bookTotals, chapterCount } = course;
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof doctrineProgress>>>();
  const [progressError, setProgressError] = useState(false);
  const [bookIndex, setBookIndex] = useState(() => Math.max(0, course.books.findIndex((book) => book.chapters.some((chapter) => chapter.id === initialModule))));
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<SessionState | null>(null);
  const canResume = pending?.config.doctrine?.courseId === id && !pending.finishedAt && pending.index < pending.items.length
    && isCurrentDoctrineQuestion(pending.items[pending.index].key);
  const resumableModule = canResume && pending.config.doctrine?.filter === 'study' ? pending.config.doctrine.moduleId : undefined;
  useEffect(() => {
    const subscription = liveQuery(() => Promise.all([doctrineProgress(id), loadSession()])).subscribe({
      next: ([data, session]) => { setProgress(data); setPending(session); setProgressError(false); },
      error: () => setProgressError(true),
    });
    return () => subscription.unsubscribe();
  }, [id]);
  const answered = progress?.filter((question) => question.answered).length ?? 0;
  const correct = progress?.filter((question) => question.correct).length ?? 0;
  const wrong = progress?.filter((question) => question.correct === false).length ?? 0;
  const due = progress?.filter((question) => question.due).length ?? 0;
  const firstCorrect = progress?.filter((question) => question.firstCorrect).length ?? 0;
  useEffect(() => {
    if (!initialModule) return;
    const frame = requestAnimationFrame(() => document.getElementById(`modulo-${id}-${initialModule}`)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [id, initialModule]);
  const seenByChapter = new Map<string, number>();
  for (const question of progress ?? []) {
    if (question.answered) seenByChapter.set(question.moduleId, (seenByChapter.get(question.moduleId) ?? 0) + 1);
  }
  const seenIn = (chapters: readonly DoctrineChapter[]) =>
    chapters.reduce((sum, chapter) => sum + (seenByChapter.get(chapter.id) ?? 0), 0);
  const start = (scope: Omit<DoctrineScope, 'courseId'>) => {
    haptic('ok');
    if (resumableModule && scope.moduleId === resumableModule && scope.filter === 'study') {
      nav.push({ name: 'session', resume: true });
      return;
    }
    nav.push({ name: 'session', config: {
      area: 'geral', focus: 'auto', mode: 'memorizar', minutes: 7, title: course.title,
      activity: 'doctrine', doctrine: { courseId: id, ...scope },
    } });
  };
  const book = course.books[bookIndex];
  const normalized = fold(query.trim());
  const groups = book.parts.map((part) => ({
    ...part,
    chapters: part.chapters.filter((chapter) => !normalized
      || fold(part.title).includes(normalized) || fold(chapter.title).includes(normalized)
      || chapter.questions.some((question) => fold(question.prompt).includes(normalized))),
  })).filter((part) => part.chapters.length);

  return (
    <div className="stack contest-detail">
      <PageHeader title={course.title} sub={`Doutrina · ${chapterCount} módulos · ${total} questões`} />
      <section className="contest-cover-header" aria-label="Praticar o curso">
        <CourseCover kind={book.id === 'teoriaConstituicao' ? 'hermeneutica' : course.cover} />
        <div className="contest-cover-copy">
          <strong>{progress ? `${answered} de ${total} questões praticadas` : 'Prática por capítulos'}</strong>
          {progress && <progress value={answered} max={total} aria-label="Questões praticadas no curso" />}
          <button className="catalog-primary" onClick={() => canResume ? nav.push({ name: 'session', resume: true }) : start({ filter: 'study' })}>
            <IPlay size={17} /> {canResume ? 'Retomar sessão' : answered === total ? 'Praticar novamente' : answered ? 'Continuar curso' : 'Começar curso'}
          </button>
        </div>
      </section>
      {progressError && <p className="small muted" role="status">O histórico do curso está indisponível neste aparelho.</p>}
      {progress && answered > 0 && <section className="contest-panel">
        <h2 className="title-m">Seu desempenho</h2>
        <StudyMetrics seen={answered} total={total} correct={firstCorrect} attempts={answered} />
        <p className="small">{quantity(correct, 'acerto', 'acertos')} · {quantity(wrong, 'erro', 'erros')} na última tentativa</p>
        <div className="row doctrine-actions">
          <button className="btn btn-quiet" disabled={!wrong} onClick={() => start({ filter: 'errors' })}>Refazer erros ({wrong})</button>
          <button className="btn btn-quiet" disabled={!due} onClick={() => start({ filter: 'due' })}><IHistory size={17} /> Revisar agora ({due})</button>
        </div>
      </section>}
      <section className="stack doctrine-syllabus" aria-label="Plano de estudo">
        <h2 className="title-m">Escolha a trilha</h2>
        <div className="doctrine-books" role="group" aria-label="Trilhas do curso">
          {course.books.map((entry, index) => (
            <button key={entry.id} className="contest-panel doctrine-book" aria-pressed={index === bookIndex}
              onClick={() => { haptic('tap'); setBookIndex(index); setQuery(''); }}>
              <strong className="heading-with-icon"><IBook size={17} className="doctrine-book-icon" />{entry.trackTitle}</strong>
              <span className="small muted">{quantity(entry.chapters.length, entry.kind, `${entry.kind}s`)} · {bookTotals[index]} questões</span>
              {progress && <span className="small">{seenIn(entry.chapters)} de {bookTotals[index]} praticadas</span>}
            </button>
          ))}
        </div>
        <div className="contest-panel doctrine-plan">
          <div className="row between doctrine-actions">
            <h3 className="title-s">Capítulos e temas</h3>
            <button className="btn btn-quiet btn-sm" onClick={() => start({ filter: 'study', book: book.id })}><IPlay size={16} /> Praticar esta trilha</button>
          </div>
          <label className="doctrine-search">
            <ISearch size={18} />
            <span className="sr-only">Buscar tema</span>
            <input className="input" type="search" placeholder="Buscar tema" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          {!groups.length && <p className="small muted" role="status">Nenhum capítulo corresponde à busca.</p>}
          {groups.map((part, index) => (
            <details className="doctrine-part" key={`${book.id}:${part.title}:${!!normalized}`} open={!!normalized || index === 0 || part.chapters.some((chapter) => chapter.id === initialModule)}>
              <summary>
                <span>{part.title}</span>
                <small>{quantity(part.chapters.length, 'tema', 'temas')}</small>
              </summary>
              <ul className="doctrine-chapters">
                {part.chapters.map((chapter) => (
                  <li key={chapter.id} id={`modulo-${id}-${chapter.id}`} className={`doctrine-module${chapter.id === initialModule ? ' highlighted' : ''}`}>
                    <div>
                      <h4 className="title-s">{chapter.number}. {chapter.title}</h4>
                      <p className="small muted">{chapter.questions.length} questões</p>
                      {!!seenByChapter.get(chapter.id) && <p className="small">{seenByChapter.get(chapter.id)} praticadas</p>}
                    </div>
                    <button className="btn btn-quiet btn-sm" aria-label={`${resumableModule === chapter.id ? 'Retomar' : 'Praticar'} ${chapter.title}`}
                      onClick={() => start({ filter: 'study', moduleId: chapter.id })}>{resumableModule === chapter.id ? 'Retomar' : 'Praticar'}</button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
