// Disciplina não jurídica do edital (Português, Informática) ligada ao curso de questões.
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { PUBLISHED_DOCTRINE_COURSES } from '../content/doctrineCatalog';
import type { EditalSubject } from '../content/editalBasico';
import { doctrineProgress, type DoctrineFilter } from '../learn/doctrineCourses';
import { IBook, IChevR, IPlay, IX } from '../ui/icons';
import { nav } from '../ui/nav';
import { SubjectGlyph } from '../ui/ramo';
import { haptic } from '../ui/settings';
import { StudyMetrics } from '../ui/StudyMetrics';

type Progress = Awaited<ReturnType<typeof doctrineProgress>>;

export function EditalSubjectCard({ area, subject }: { area: 'tjsp' | 'tjms'; subject: EditalSubject }) {
  const course = PUBLISHED_DOCTRINE_COURSES.find(({ id }) => id === subject.courseId);
  const [progress, setProgress] = useState<Progress>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sub = liveQuery(() => doctrineProgress(subject.courseId)).subscribe({ next: setProgress, error: () => setProgress([]) });
    return () => sub.unsubscribe();
  }, [subject.courseId]);
  if (!course) return null;
  const chapters = course.books.flatMap((book) => book.chapters);
  const total = chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0);
  const answered = progress?.filter((q) => q.answered).length ?? 0;
  const firstCorrect = progress?.filter((q) => q.firstCorrect).length ?? 0;
  const wrong = progress?.filter((q) => q.correct === false).length ?? 0;
  const byModule = (ids: string[]) => {
    const rows = progress?.filter((q) => ids.includes(q.moduleId)) ?? [];
    const count = chapters.filter((chapter) => ids.includes(chapter.id)).reduce((sum, chapter) => sum + chapter.questions.length, 0);
    return { count, answered: rows.filter((q) => q.answered).length };
  };
  const start = (filter: DoctrineFilter, moduleId?: string) => {
    haptic('ok');
    nav.push({ name: 'session', config: {
      area, focus: 'auto', mode: 'memorizar', minutes: 7, title: subject.topico,
      activity: 'doctrine', doctrine: { courseId: course.id, filter, moduleId },
    } });
  };
  // Treina o primeiro bloco do tópico que ainda tem questões novas.
  const trainTopic = (ids: string[]) => {
    const pending = ids.find((id) => (progress ?? []).some((q) => q.moduleId === id && !q.answered));
    start('study', pending ?? ids[0]);
  };
  return (
    <section className="contest-panel contest-subject">
      <div className="row between contest-subject-head">
        <SubjectGlyph title={subject.topico} />
        <div className="grow">
          <h4 className="title-s">{subject.topico}</h4>
          <p className="xsmall muted">{answered} de {total} questões praticadas · {subject.topics.length} tópicos do edital</p>
        </div>
        <button className="btn btn-sm btn-primary" aria-label={`Treinar ${subject.topico}`} onClick={() => start('study')}><IPlay size={14} /> Treinar</button>
      </div>
      <progress aria-label={`Progresso em ${subject.topico}`} value={answered} max={Math.max(1, total)} />
      {answered > 0 && <StudyMetrics seen={answered} total={total} correct={firstCorrect} attempts={answered} label="Questões praticadas" />}
      <div className="chips" role="group" aria-label={`Ações de ${subject.topico}`}>
        <button className="chip" aria-expanded={open} onClick={() => setOpen(!open)}>Tópicos do edital</button>
        {wrong > 0 && <button className="chip" onClick={() => start('errors')}><IX size={12} /> Refazer erros ({wrong})</button>}
        <button className="chip" onClick={() => nav.push({ name: 'doutrina-curso', id: course.id })}><IBook size={12} /> Abrir curso</button>
      </div>
      {open && <div className="list">
        {subject.topics.map((topic) => {
          const { count, answered: done } = byModule(topic.chapters);
          return (
            <button key={topic.id} className="list-item" onClick={() => trainTopic(topic.chapters)}>
              <span className="grow"><strong className="small">{topic.texto}</strong><small className="muted">{done} de {count} questões praticadas</small></span>
              <IChevR size={16} />
            </button>
          );
        })}
      </div>}
    </section>
  );
}
