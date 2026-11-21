import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useState } from 'react';
import { LESSONS } from '../content/lessons';
import { CONCEPTS } from '../content/concepts';
import type { LessonBlock } from '../content/types';
import { getArticle } from '../data/corpus';
import { SOURCES } from '../core/sources';
import { kvGet, kvSet } from '../data/db';
import { ArticleView, TermText } from '../ui/LawText';
import { openTerm } from '../ui/termStore';
import { CType, PageHeader, Progress, spring } from '../ui/primitives';
import { haptic, reducedMotion } from '../ui/settings';
import { IExternal, IClose } from '../ui/icons';
import { nav } from '../ui/nav';
import { ConceptQuiz } from './Concepts';

function Block({ b }: { b: LessonBlock }) {
  const seen = new Set<string>();
  switch (b.tipo) {
    case 'texto': return <div><CType k="didatico" /><p style={{ marginTop: 8, fontSize: 17, lineHeight: 1.6 }}><TermText text={b.texto} onTerm={openTerm} seen={seen} /></p></div>;
    case 'atencao': return <div className="card" style={{ borderColor: 'var(--gold-line)', background: 'var(--gold-soft)' }}><div className="caps gold" style={{ marginBottom: 4 }}>Atenção</div><p style={{ lineHeight: 1.5 }}>{b.texto}</p></div>;
    case 'exemplo': return <div className="card elev"><CType k="hipotetico" /><p style={{ marginTop: 8, lineHeight: 1.55 }}>{b.texto.replace(/^Exemplo hipotético[^:]*:\s*/i, '').replace(/^./, (c) => c.toUpperCase())}</p></div>;
    case 'esquema': return (
      <div className="scheme">
        {b.titulo && <div className="caps">{b.titulo}</div>}
        {b.nos.map((n, i) => (
          <div key={i}>
            <motion.div className="scheme-node" initial={reducedMotion() ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: reducedMotion() ? 0 : i * 0.06 }}>{n}</motion.div>
            {i < b.nos.length - 1 && <div className="scheme-arrow">↓</div>}
          </div>
        ))}
      </div>
    );
    case 'tabela': return (
      <div className="hscroll"><table className="cmp card" style={{ padding: 0 }}>
        <thead><tr>{b.cabecalho.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{b.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} className={j === 0 ? 'crit' : undefined} style={j === 0 ? { width: 'auto' } : undefined}>{c}</td>)}</tr>)}</tbody>
      </table></div>
    );
    case 'lei': {
      const hit = getArticle(`${b.ref.law}.${b.ref.art}`);
      const src = SOURCES.find((s) => s.id === b.ref.law);
      if (!hit) return (
        <div className="law-art">
          <CType k="oficial" />
          <p className="small muted" style={{ marginTop: 8 }}>{src?.short}, art. {b.ref.art} — texto oficial ainda não importado. Para não exibir texto não verificado, ele aparecerá aqui após a importação.</p>
          {src && <a className="small" href={src.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 4, marginTop: 8 }}>Abrir na fonte oficial <IExternal size={13} /></a>}
        </div>
      );
      return (
        <div className="law-art">
          <div className="row between" style={{ marginBottom: 8 }}><CType k="oficial" /><button className="xsmall gold" onClick={() => nav.push({ name: 'article', id: hit.art.id })}>{hit.law.short} ›</button></div>
          <ArticleView art={hit.art} onTerm={openTerm} showNotes={false} />
        </div>
      );
    }
  }
}

export function LessonPlayer({ id, onDone, embedded }: { id: string; onDone: () => void; embedded?: boolean }) {
  const lesson = LESSONS.find((l) => l.id === id)!;
  const checks = lesson.checks.map((c) => CONCEPTS.find((x) => x.id === c)!).filter(Boolean);
  const total = lesson.slides.length + checks.length;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (d: number) => { const n = i + d; if (n < 0) return; haptic('soft'); setDir(d); if (n >= total) { void finish(); return; } setI(n); };
  const finish = async () => { const done = await kvGet<string[]>('lessonsDone', []); await kvSet('lessonsDone', [...new Set([...done, id])]); haptic('ok'); onDone(); };
  const isSlide = i < lesson.slides.length;
  const rm = reducedMotion();
  return (
    <div className="stack" style={{ gap: 14, minHeight: embedded ? undefined : '100%' }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="badge badge-gold">Microaula · {lesson.minutos} min</span>
        <span className="xsmall muted">{isSlide ? `${i + 1}/${lesson.slides.length}` : `Compreensão ${i - lesson.slides.length + 1}/${checks.length}`}</span>
      </div>
      <Progress value={(i + 1) / total} />
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={i} className="slide stack" style={{ gap: 14 }}
          initial={rm ? false : { opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={rm ? undefined : { opacity: 0, x: -40 * dir }} transition={spring}
          drag={isSlide ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
          onDragEnd={(_e: unknown, info: PanInfo) => { if (info.offset.x < -80) go(1); else if (info.offset.x > 80) go(-1); }}>
          {isSlide ? (
            <>
              <h2 className="title-l">{i === 0 && <div className="caps" style={{ marginBottom: 6 }}>{lesson.titulo}</div>}{lesson.slides[i].titulo}</h2>
              {lesson.slides[i].blocos.map((b, k) => <Block key={k} b={b} />)}
            </>
          ) : (
            <ConceptQuiz c={checks[i - lesson.slides.length]} onDone={() => go(1)} />
          )}
        </motion.div>
      </AnimatePresence>
      {isSlide && (
        <div className="answer-dock row" style={{ gap: 10 }}>
          {i > 0 && <button className="btn btn-quiet" onClick={() => go(-1)}>Voltar</button>}
          <button className="btn btn-primary grow" onClick={() => go(1)}>{i === lesson.slides.length - 1 ? (checks.length ? 'Testar compreensão' : 'Concluir') : 'Avançar'}</button>
        </div>
      )}
    </div>
  );
}

export function LessonScreen({ id }: { id: string }) {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) return null;
  return (
    <div className="stack" style={{ gap: 10, minHeight: '100%' }}>
      <div className="row" style={{ gap: 10 }}>
        <button className="icon-btn glass" aria-label="Fechar microaula" onClick={() => nav.back()}><IClose /></button>
        <div className="grow"><div className="title-s">{lesson.titulo}</div><div className="xsmall muted">{lesson.subtitulo}</div></div>
      </div>
      <LessonPlayer id={id} onDone={() => nav.back()} />
    </div>
  );
}
void PageHeader;
