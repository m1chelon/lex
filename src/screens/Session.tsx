import { doctrineQuestion } from '../learn/doctrineCourses';
import { reviewMarkId, setReviewMark } from '../learn/reviewQueue';
import { TucaLoading } from '../ui/TucaLoading';
import { trapNote } from '../content/traps';
import { isDue, regradeAsGuess } from '../learn/scheduler';
import { getCareer, careerFor, xpFor } from '../learn/career';
import { motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BLITZ_SECONDS, buildSession, canConsultStudySource, extendSession, finishSession, isStudyQuestion, loadSequence, loadSession, questionCheckpoint, resumeSession, saveSession, type SessionConfig, type SessionState } from '../learn/session';
import { findTargets, type Exercise, type Seg } from '../learn/generators';
import { recordAnswer, markSeen } from '../learn/scheduler';
import { checkTyped, shuffle, rng, fold } from '../learn/text';
import { db, kvGet, kvSet, type CardRow } from '../data/db';
import { getArticle, articleTitle } from '../data/corpus';
import { CONCEPTS } from '../content/concepts';
import { TIPO_LABEL } from '../content/types';
import { nav } from '../ui/nav';
import { CType, Progress, Segmented, Sheet, spring, toast, useAsync } from '../ui/primitives';
import { haptic, reducedMotion, setSettings, useSettings } from '../ui/settings';
import { IClose, ICheck, IX, IChevR, ISparkle, IFlame, IBolt, IText, ILock } from '../ui/icons';
import { Mascot, MascotQuestion } from '../ui/Mascot';
import type { CapiReaction } from '../ui/capi';
import { LegalReference } from '../ui/LegalReference';
import { ArticleView, TermText, UnitView } from '../ui/LawText';
import { openTerm } from '../ui/termStore';
import { LEVELS, RefLine, TermBody } from './TermSheet';
import { LessonPlayer } from './Lesson';
import { useVerification, verItem } from '../data/verification';
import { getTerm } from '../learn/terms';
import { getPlannerTask, plannerProgress, plannerTaskKey, recordPlannerExercise } from '../learn/planner';
import { wordDiff } from '../learn/diff';
import { DoctrineQuestion } from './DoctrineQuestion';

type Answer = { correct: boolean | null; given?: string; doctrineChoices?: string[]; capiReaction?: CapiReaction };

function Segs({ segs, blankContent, lawId, terms }: { segs: Seg[]; blankContent?: React.ReactNode; lawId?: string; terms: boolean }) {
  const seen = new Set<string>();
  return (
    <>
      {segs.map((s, i) => s.blank ? <span key={i} className="blank">{blankContent ?? ' '}</span>
        : s.strong ? <strong key={i}>{s.t}</strong>
        : <span key={i}>{terms ? <TermText text={s.t} onTerm={openTerm} seen={seen} lawId={lawId} /> : s.t}</span>)}
    </>
  );
}

function Official({ ex, highlight }: { ex: Exercise; highlight?: string }) {
  const hit = ex.articleId ? getArticle(ex.articleId) : null;
  if (!hit) return null;
  const units = ex.unitId ? hit.art.units.filter((u) => u.id === ex.unitId) : hit.art.units.filter((u) => u.t).slice(0, 8);
  return (
    <div className="law-art" style={{ padding: 14 }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <CType k="oficial" />
        <button className="xsmall gold" onClick={() => nav.push({ name: 'article', id: hit.art.id, unitId: ex.unitId })}>{articleTitle(hit.law.id, hit.art)} ›</button>
      </div>
      <div className="law" style={{ fontSize: 16 }}>
        {units.map((u) => {
          if (!highlight || !u.t.includes(highlight)) return <UnitView key={u.id} u={u} lawId={hit.law.id} showNotes={false} />;
          const i = u.t.indexOf(highlight);
          return (
            <div key={u.id} className={`law-unit k-${u.k}`}>
              {u.k !== 'caput' && <span className="law-lab">{u.lab} –</span>}
              {u.k === 'caput' && <span className="law-lab">{hit.art.lab}</span>}{' '}
              <span>{u.t.slice(0, i)}<span className="law-hl">{highlight}</span>{u.t.slice(i + highlight.length)}</span>
            </div>
          );
        })}
      </div>
      <div className="xsmall faint" style={{ marginTop: 6 }}>{hit.law.provenance.sourceName} · {hit.law.provenance.versionLabel}</div>
    </div>
  );
}

function KindBadge({ ex }: { ex: Exercise }) {
  const fam = ex.doctrine ? 'Doutrina' : { literal: 'Literalidade', interpretacao: 'Interpretação', leitura: 'Leitura guiada', microaula: 'Microaula', glossario: 'Dicionário' }[ex.family];
  const c = ex.conceptId ? CONCEPTS.find((x) => x.id === ex.conceptId) : null;
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      <span className={`badge ${ex.family === 'interpretacao' ? 'badge-muted' : 'badge-gold'}`}>{fam}</span>
      {ex.practice && <span className="badge badge-muted">{{ revisao: 'Revisão', revanche: 'Revanche', nova: 'Questão nova' }[ex.practice]}</span>}
      {c && <span className="badge badge-muted">{TIPO_LABEL[c.tipo]}</span>}
      {ex.kind === 'case' && <span className="badge badge-muted">Caso prático</span>}
      {ex.kind === 'spot' && <span className="badge badge-muted">Encontre o erro</span>}
      {ex.kind === 'cloze-multi' && <span className="badge badge-muted">Várias lacunas</span>}
      {ex.family === 'literal' && ex.kind !== 'spot' && ex.kind !== 'cloze-multi' && <span className="badge badge-muted">{{ literal: 'texto exato', prazos: 'prazos', penas: 'penas', excecoes: 'exceções', conceitual: 'conceitos', aplicacao: 'aplicação' }[ex.dim]}</span>}
    </div>
  );
}

function OptionList({ options, answered, chosen, onPick }: { options: NonNullable<Exercise['options']>; answered: boolean; chosen?: string; onPick: (id: string) => void }) {
  return (
    <div className="study-options" role="radiogroup" aria-label="Alternativas">
      {options.map((o, i) => {
        const cls = answered ? (o.correct ? 'correct' : chosen === o.id ? 'wrong' : 'dim') : '';
        return (
          <motion.button key={o.id} role="radio" aria-checked={chosen === o.id} className={`opt ${cls}`} disabled={answered} onClick={() => onPick(o.id)}
            initial={reducedMotion() ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: reducedMotion() ? 0 : i * 0.03 }}>
            <span className="opt-key">{answered ? (o.correct ? <ICheck size={15} /> : chosen === o.id ? <IX size={15} /> : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}</span>
            <span className="grow">{o.text}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ExerciseView({ ex, mode, onAnswer, answer, feedback, onInspect }: {
  ex: Exercise; mode: string; onAnswer: (a: Answer) => void; answer: Answer | null; feedback: React.ReactNode;
  onInspect: (reading: boolean) => void;
}) {
  const [typed, setTyped] = useState('');
  const [chosen, setChosen] = useState<string>();
  const [order, setOrder] = useState<string[]>([]);
  const terms = mode !== 'provar' && canConsultStudySource(ex, answer?.correct);
  const lawId = ex.lawId;
  const answered = !!answer;
  const selected = chosen ?? ex.options?.find((option) => option.text === answer?.given)?.id;
  useEffect(() => { setTyped(''); setChosen(undefined); setOrder([]); }, [ex.key]);
  const shuffledOrder = useMemo(() => ex.orderItems ? shuffle(ex.orderItems, rng(ex.key + 'o')) : [], [ex.key]); // eslint-disable-line

  const pick = (id: string) => {
    if (answered) return;
    setChosen(id);
    const o = ex.options!.find((x) => x.id === id)!;
    onAnswer({ correct: o.correct, given: o.text });
  };

  if (ex.kind === 'read') {
    const hit = ex.articleId ? getArticle(ex.articleId) : null;
    if (!hit) return null;
    return (
      <div className="stack" style={{ gap: 14 }}>
        <p className="small muted">{ex.prompt}</p>
        <div className="law-art">
          <div className="row between" style={{ marginBottom: 10 }}><CType k="oficial" /><span className="xsmall gold">{articleTitle(hit.law.id, hit.art)}</span></div>
          <ArticleView art={hit.art} onTerm={openTerm} showNotes={false} />
          <div className="xsmall faint" style={{ marginTop: 8 }}>{hit.law.provenance.sourceName} · {hit.law.provenance.versionLabel}</div>
        </div>
      </div>
    );
  }
  if (ex.kind === 'term') {
    return <TermBody id={ex.termId!} />;
  }
  if (ex.kind === 'doctrine' && ex.doctrine) {
    const selectedOption = ex.options?.find((item) => item.id === selected);
    const correctOption = ex.options?.find((item) => item.correct);
    return (
      <div className="stack" style={{ gap: 14 }}>
        <MascotQuestion text={ex.prompt} />
        <OptionList options={ex.options!} answered={answered} chosen={selected} onPick={pick} />
        {answered && <details className="contest-panel answer-explanation" onToggle={(event) => onInspect(event.currentTarget.open)}>
          <summary>Ver explicação</summary>
          <h3 className="title-s">Por que essa resposta?</h3>
          <p>{correctOption?.why}</p>
          {selectedOption?.why && !selectedOption.correct && <p className="small muted"><strong>{selectedOption.text}</strong> · {selectedOption.why}</p>}
        </details>}
        {feedback}
      </div>
    );
  }
  if (ex.kind === 'case') {
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="card elev">
          <CType k="hipotetico" />
          {ex.context?.length ? <p style={{ marginTop: 8, lineHeight: 1.55 }}>{ex.context.map((c) => c.t).join(' ')}</p> : null}
          {ex.stem.length ? <p className="law" style={{ marginTop: 8, fontSize: 16 }}>{ex.stem.map((c) => c.t).join('')}</p> : null}
        </div>
        <MascotQuestion text={ex.prompt} />
        <OptionList options={ex.options!} answered={answered} chosen={selected} onPick={pick} />
        {feedback}
        {answered && (
          <details className="contest-panel answer-explanation" onToggle={(event) => onInspect(event.currentTarget.open)}>
            <summary>Ver explicação</summary>
            {ex.options!.map((o, i) => <div key={o.id} className="small" style={{ lineHeight: 1.45, color: o.correct ? 'var(--ok)' : 'var(--text-2)' }}><strong>{String.fromCharCode(65 + i)}.</strong> {o.why}</div>)}
            <Official ex={ex} />
          </details>
        )}
      </div>
    );
  }
  if (ex.kind === 'concept') {
    const c = CONCEPTS.find((x) => x.id === ex.conceptId)!;
    return (
      <div className="stack" style={{ gap: 14 }}>
        {c.situacao && (
          <div className="card elev">
            <CType k="hipotetico" />
            <p style={{ marginTop: 8, lineHeight: 1.55 }}>{terms ? <TermText text={c.situacao} onTerm={openTerm} seen={new Set()} /> : c.situacao}</p>
          </div>
        )}
        <MascotQuestion text={ex.prompt} />
        <OptionList options={ex.options!} answered={answered} chosen={selected} onPick={pick} />
        {feedback}
        {answered && (
          <details className="contest-panel answer-explanation" onToggle={(event) => onInspect(event.currentTarget.open)}>
            <summary>Ver explicação</summary>
            <CType k="interpretacao" />
            {ex.options!.map((o, i) => (
              <div key={o.id} className="small" style={{ lineHeight: 1.45, color: o.correct ? 'var(--ok)' : 'var(--text-2)' }}>
                <strong>{String.fromCharCode(65 + i)}.</strong> {o.why}
              </div>
            ))}
            <ConceptRefs id={c.id} />
          </details>
        )}
      </div>
    );
  }
  if (ex.kind === 'tf') {
    const isAltered = ex.answer === 'F';
    return (
      <div className="stack" style={{ gap: 14 }}>
        <MascotQuestion text={ex.prompt} />
        <div className="law-art law">
          {ex.context?.length ? <div className="muted" style={{ fontSize: '0.92em', marginBottom: 10, whiteSpace: 'pre-line' }}><Segs segs={ex.context} lawId={lawId} terms={false} /></div> : null}
          {ex.stem.map((s, i) => <span key={i} className={answered && s.altered ? 'altered' : undefined} style={s.strong ? { fontWeight: 680 } : undefined}>{s.t}</span>)}
        </div>
        {!answered ? (
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-quiet grow" onClick={() => onAnswer({ correct: !isAltered, given: 'V' })}>Igual à lei</button>
            <button className="btn btn-quiet grow" onClick={() => onAnswer({ correct: isAltered, given: 'F' })}>Há alteração</button>
          </div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {feedback}
            <Official ex={ex} highlight={isAltered ? ex.altered!.from : undefined} />
          </div>
        )}
      </div>
    );
  }
  if (ex.kind === 'order') {
    const done = order.length === ex.orderItems!.length;
    return (
      <div className="stack" style={{ gap: 12 }}>
        <MascotQuestion text={ex.prompt} />
        {ex.context?.length ? <div className="law-art law" style={{ fontSize: 15.5 }}><Segs segs={ex.context} lawId={lawId} terms={terms} /></div> : null}
        <div className="stack" style={{ gap: 8 }}>
          {shuffledOrder.map((it) => {
            const pos = order.indexOf(it.id);
            const right = answered ? ex.orderItems!.findIndex((x) => x.id === it.id) : -1;
            return (
              <button key={it.id} className={`opt ${answered ? (pos === right ? 'correct' : 'wrong') : ''}`} disabled={answered || pos >= 0}
                onClick={() => { haptic('soft'); const next = [...order, it.id]; setOrder(next); if (next.length === ex.orderItems!.length) onAnswer({ correct: next.join('|') === ex.answer, given: next.join('|') }); }}>
                <span className="opt-key">{pos >= 0 ? pos + 1 : '·'}</span>
                <span className="grow" style={{ fontSize: 15 }}>{answered ? <><strong>{it.lab} – </strong></> : null}{it.t}</span>
              </button>
            );
          })}
        </div>
        {!answered && order.length > 0 && !done && <button className="btn btn-sm btn-ghost" onClick={() => setOrder([])}>Recomeçar</button>}
        {feedback}
        {answered && <Official ex={ex} />}
      </div>
    );
  }
  if (ex.kind === 'spot') return <SpotView ex={ex} answered={answered} onAnswer={onAnswer} lawId={lawId} feedback={feedback} />;
  if (ex.kind === 'cloze-multi') return <MultiView ex={ex} answered={answered} onAnswer={onAnswer} feedback={feedback} />;
  // cloze-mc, cloze-type, which-article, rubric
  const blankShown = ex.kind === 'cloze-type' && answered ? (answer?.correct ? ex.answer : answer?.given || '—') : ex.kind === 'cloze-mc' && answered ? ex.answer : undefined;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <MascotQuestion text={ex.prompt} />
      <div className="law-art law">
        {ex.context?.length ? <div className="muted" style={{ fontSize: '0.92em', marginBottom: 10, whiteSpace: 'pre-line' }}><Segs segs={ex.context} lawId={lawId} terms={terms} /></div> : null}
        <Segs segs={ex.stem} lawId={lawId} terms={terms && ex.kind !== 'which-article' && ex.kind !== 'rubric'} blankContent={blankShown} />
      </div>
      {ex.kind === 'cloze-type' ? (
        !answered ? (
          <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); const r = checkTyped(typed, ex.answer!); onAnswer({ correct: r.ok, given: typed }); }}>
            <input className="input" autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Digite a lacuna" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Resposta" />
            <button className="btn btn-primary btn-block" type="submit" disabled={!typed.trim()}>Verificar</button>
          </form>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {feedback}
            <Official ex={ex} highlight={ex.answer} />
          </div>
        )
      ) : (
        <>
          <OptionList options={ex.options!} answered={answered} chosen={selected} onPick={pick} />
          {feedback}
          {answered && <Official ex={ex} highlight={ex.kind === 'cloze-mc' ? ex.answer : undefined} />}
        </>
      )}
    </div>
  );
}

function ConceptRefs({ id }: { id: string }) {
  const ver = useVerification();
  const c = CONCEPTS.find((x) => x.id === id)!;
  const vi = verItem(ver, 'exercicio', id);
  if (!c.refs.length) return null;
  return <div className="card" style={{ padding: '6px 14px' }}><div className="caps" style={{ margin: '6px 0 2px' }}>Fundamentação</div>{c.refs.map((r, i) => <RefLine key={i} r={r} status={vi?.refs[i]?.status} />)}</div>;
}

function Summary({ s, onClose, onNext, startXp }: { s: SessionState; onClose: () => void; onNext: (cfg: SessionConfig) => void; startXp?: number }) {
  const graded = s.results.filter((r) => r.correct !== null);
  const ok = graded.filter((r) => r.correct).length;
  const missed = graded.length - ok;
  const resultTitle = missed ? `${missed} ${missed === 1 ? 'ponto' : 'pontos'} para revisar`
    : graded.length ? `${ok} ${ok === 1 ? 'acerto' : 'acertos'} no treino`
      : s.results.length ? 'Estudo concluído' : 'Sessão encerrada';
  const mins = Math.max(1, Math.round(s.results.reduce((a, r) => a + Math.min(r.ms, 120000), 0) / 60000));
  const wrong = s.items.filter((it) => s.results.find((r) => r.key === it.key && r.correct === false));
  const followup = useAsync(async () => {
    const { config } = s;
    if (config.planner) {
      const task = await getPlannerTask(plannerTaskKey(config.planner.day, config.planner.goal));
      if (task && plannerProgress(task, config.planner.goal.target).remaining.length) {
        return { label: 'Continuar meta de hoje', config: { ...config, minutes: 15, planner: { ...config.planner, quick: false } } };
      }
      return null;
    }
    if (config.activity === 'doctrine' && config.doctrine?.filter === 'study') return { label: 'Continuar curso', config };
    const next = await loadSequence(config);
    if (!next) return null;
    const hit = getArticle(next.articleId);
    return { label: `Continuar de ${hit ? articleTitle(hit.law.id, hit.art) : next.articleId}`,
      config: { ...config, startArticleId: next.articleId, sequenceSkip: next.practiced } };
  }, [s.id]);
  const pct = graded.length ? ok / graded.length : 0;
  const gained = s.results.reduce((a, r) => a + (r.correct ? xpFor(s.items.find((it) => it.key === r.key)?.kind ?? '') : 0), 0);
  const before = startXp !== undefined ? careerFor(startXp) : undefined;
  const after = startXp !== undefined ? careerFor(startXp + gained) : undefined;
  const promoted = !!before && !!after && after.rank > before.rank;
  let best = 0, run = 0;
  for (const r of s.results) { if (r.correct === null) continue; run = r.correct ? run + 1 : 0; best = Math.max(best, run); }
  const blitz = !!s.config.blitz;
  const record = useAsync(async () => { if (!blitz) return null; const prev = await kvGet<number>('blitzBest', 0); if (ok > prev) await kvSet('blitzBest', ok); return { prev, isNew: ok > prev }; }, [s.id]);
  const avg = graded.length ? (graded.reduce((a, r) => a + Math.min(r.ms, BLITZ_SECONDS * 1000), 0) / graded.length / 1000).toFixed(1).replace('.', ',') : '0';
  return (
    <div className="stack" style={{ gap: 16, paddingTop: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center', alignItems: 'flex-end', gap: 4 }}>
          <motion.div initial={reducedMotion() ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} style={{ display: 'inline-grid', placeItems: 'center', position: 'relative' }}>
            <div className="orb-glow" style={{ inset: '-20%' }} />
            <Mascot mood={pct >= 0.6 ? 'cheer' : pct >= 0.4 ? 'happy' : 'think'} size={118} />
          </motion.div>
          <Gavel />
        </div>
        <div className="caps" style={{ marginTop: 6 }}>{blitz ? 'Relâmpago' : s.timedOut ? 'Tempo esgotado' : 'Resultado do treino'}</div>
        {blitz && record && <div className={`blitz-score${record.isNew ? ' new' : ''}`}><IBolt size={18} /> {ok} de {graded.length}{record.isNew ? ' · novo recorde!' : ` · recorde: ${record.prev}`}</div>}
        <h1 className="display" style={{ marginTop: 4, fontSize: 32 }}>{resultTitle}</h1>
        {gained > 0 && <div className="xp-gain">+<CountUp to={gained} /> pontos</div>}
        {promoted && after && (
          <motion.div className="promo" initial={reducedMotion() ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.9 }}>
            <span className="caps" style={{ color: '#fff' }}>Promoção!</span>
            <strong>A Capi agora é {after.name}</strong>
          </motion.div>
        )}
        <p className="muted" style={{ marginTop: 6 }}>{blitz ? `${avg} s por resposta` : `${mins} min`} · {s.results.length} {s.results.length === 1 ? 'atividade' : 'atividades'}{best >= 3 ? ` · melhor sequência: ${best}` : ''}</p>
        {wrong[0] && <p className="bubble summary-tip">Capi sugere revisar {wrong[0].where || (wrong[0].articleId && getArticle(wrong[0].articleId)?.art.lab) || 'as questões em que você errou'}.</p>}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{graded.length ? Math.round((ok / graded.length) * 100) : 0}%</div><div className="xsmall muted">acertos</div></div>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{ok}</div><div className="xsmall muted">{ok === 1 ? 'correta' : 'corretas'}</div></div>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{missed}</div><div className="xsmall muted">a revisar</div></div>
      </div>
      {wrong.length > 0 && (
        <div className="list">
          <div className="caps" style={{ padding: '12px 16px 4px' }}>Revise estes pontos</div>
          {wrong.filter((w, i, arr) => arr.findIndex((x) => (x.where ?? x.key) === (w.where ?? w.key)) === i).slice(0, 8).map((w) => {
            const a = w.articleId ? getArticle(w.articleId) : null;
            const doctrine = doctrineQuestion(w.key);
            const c = w.conceptId ? CONCEPTS.find((x) => x.id === w.conceptId) : null;
            return (
              <button key={w.key} className="list-item" disabled={!a && !doctrine} onClick={() => {
                if (a) nav.push({ name: 'article', id: a.art.id, unitId: w.unitId });
                else if (doctrine) nav.push({ name: 'doutrina-curso', id: doctrine.course.id });
              }}>
                <div className="grow small">{w.where ?? (a ? articleTitle(a.law.id, a.art) : c ? c.pergunta : w.prompt)}</div>
                {(a || doctrine) && <IChevR className="chev" />}
              </button>
            );
          })}
        </div>
      )}
      <div className="answer-dock summary-dock">
        {!!wrong.length && <button className="btn btn-primary btn-block" onClick={() => onNext({
          area: s.config.area, focus: s.config.focus, mode: 'memorizar', minutes: 10, title: 'Refazer erros', activity: 'review',
          practiceCardIds: [...new Set(wrong.map(({ key }) => key))],
        })}>Refazer {wrong.length} {wrong.length === 1 ? 'erro' : 'erros'}</button>}
        {followup && <button className={`btn btn-block ${wrong.length ? 'btn-quiet' : 'btn-primary'}`} onClick={() => onNext(followup.config)}>{followup.label}</button>}
        <button className={`btn btn-block ${wrong.length || followup ? 'btn-quiet' : 'btn-primary'}`} onClick={onClose}>Concluir</button>
      </div>
    </div>
  );
}

function Timer({ startedAt, limitMin, onTimeout }: { startedAt: number; limitMin?: number; onTimeout?: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const elapsed = Math.floor((now - startedAt) / 1000);
  const remaining = limitMin ? limitMin * 60 - elapsed : null;
  const fired = useRef(false);
  useEffect(() => { if (remaining !== null && remaining <= 0 && !fired.current) { fired.current = true; onTimeout?.(); } }, [remaining, onTimeout]);
  const v = remaining !== null ? Math.max(0, remaining) : elapsed;
  const mm = String(Math.floor(v / 60)).padStart(2, '0'), ss = String(v % 60).padStart(2, '0');
  return <span className={`timer glass${remaining !== null && remaining <= 60 ? ' low' : ''}`} role="timer" aria-label={remaining !== null ? `Tempo restante ${mm}:${ss}` : `Tempo decorrido ${mm}:${ss}`}>{remaining !== null ? '⏳' : '⏱'} {mm}:{ss}</span>;
}

/** Relâmpago: anel de 10 s por questão; ao zerar, conta como erro. */
function BlitzClock({ onTimeout }: { onTimeout: () => void }) {
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const fn = useRef(onTimeout); fn.current = onTimeout;
  useEffect(() => {
    const t0 = Date.now();
    const i = setInterval(() => { const l = BLITZ_SECONDS - Math.floor((Date.now() - t0) / 1000); setLeft(Math.max(0, l)); if (l <= 3 && l > 0) haptic('soft'); }, 250);
    const t = setTimeout(() => fn.current(), BLITZ_SECONDS * 1000);
    return () => { clearInterval(i); clearTimeout(t); };
  }, []);
  return (
    <span className={`blitz-clock${left <= 3 ? ' low' : ''}`} role="timer" aria-label={`${left} segundos`}>
      <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" className="bc-track" /><circle cx="18" cy="18" r="15.5" className="bc-ring" style={{ animationDuration: `${BLITZ_SECONDS}s` }} /></svg>
      <b>{left}</b>
    </span>
  );
}

export function SessionScreen({ active, resume, config }: { active: boolean; resume?: boolean; config?: SessionConfig }) {
  const [s, setS] = useState<SessionState | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [seconds, setSeconds] = useState(3);
  const [autoPaused, setAutoPaused] = useState(false);
  const [levelSheet, setLevelSheet] = useState(false);
  const [lawSheet, setLawSheet] = useState(false);
  const [readingExplanation, setReadingExplanation] = useState(false);
  const settings = useSettings();
  const shownAt = useRef(Date.now());
  const [err, setErr] = useState<string | null>(null);
  const [previous, setPrevious] = useState<SessionState | null>(null);

  const opening = useRef<Promise<{ state: SessionState | null; interrupted?: boolean }>>();
  const acting = useRef(false);
  const questionBody = useRef<HTMLDivElement>(null);
  const reader = useRef<HTMLDivElement>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const openSaved = async () => {
    const saved = await resumeSession();
    const item = saved?.items[saved.index];
    if (!saved || !item || saved.results.length <= saved.index || saved.results.at(-1)?.key !== item.key) return saved;
    let next = { ...saved, index: saved.index + 1, draft: undefined } as SessionState;
    if (next.config.infinite && next.index >= next.items.length - 3) next = await extendSession(next);
    if (next.index >= next.items.length) return finishSession(next);
    await saveSession(next);
    return next;
  };
  const openNew = async (options: SessionConfig, interrupted?: SessionState) => {
    const next = await buildSession(options, false);
    if (!next.items.length) return next;
    if (interrupted) await finishSession(interrupted);
    await saveSession(next);
    return next;
  };
  const show = (st: SessionState | null) => {
    if (!st?.items.length) {
      setErr(st?.config.planner ? 'Sem atividades pendentes na meta de hoje.' : 'Nenhuma atividade disponível neste recorte. Escolha outro conteúdo ou modo.');
      return;
    }
    setS(st);
    shownAt.current = Date.now();
  };
  useEffect(() => {
    let mounted = true;
    opening.current ??= resume ? openSaved().then((state) => ({ state })) : (async () => {
      const saved = await loadSession();
      if (saved && !saved.finishedAt && saved.index < saved.items.length) return { state: saved, interrupted: true };
      return { state: config ? await openNew(config) : null };
    })();
    void opening.current.then(({ state, interrupted }) => {
      if (!mounted) return;
      if (interrupted && state) setPrevious(state);
      else show(state);
    }).catch((error) => {
      if (!mounted) return;
      console.error(error);
      setErr('Não foi possível montar a sessão.');
    });
    return () => { mounted = false; };
  }, [resume, config]);

  const chooseSession = async (keep: boolean) => {
    if (!previous || acting.current) return;
    acting.current = true;
    try {
      show(keep ? await openSaved() : config ? await openNew(config, previous) : null);
      setPrevious(null);
    } catch (error) {
      console.error(error);
      toast('Não foi possível abrir o treino. Sua sessão anterior continua salva.');
    } finally { acting.current = false; }
  };

  const ex = s && s.index < s.items.length ? s.items[s.index] : null;
  const taskId = s?.config.planner && plannerTaskKey(s.config.planner.day, s.config.planner.goal);
  useLayoutEffect(() => { questionBody.current?.scrollTo({ top: 0 }); }, [ex?.key, s?.index]);
  useEffect(() => {
    if (!lawSheet) return;
    const frame = requestAnimationFrame(() => reader.current?.querySelector('.law-unit.selected')?.scrollIntoView({ block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [lawSheet]);

  const updateDraft = useCallback((draft: string[]) => {
    if (!s || acting.current) return;
    const { id, index } = s;
    setS((current) => current?.id === id && current.index === index ? { ...current, draft } : current);
    void db.transaction('rw', db.kv, async () => {
      const stored = (await db.kv.get('session'))?.value as SessionState | null;
      if (stored?.id === id && stored.index === index && !stored.finishedAt && stored.results.length <= index) {
        await db.kv.put({ key: 'session', value: { ...stored, draft } });
      }
    }).catch(() => {});
  }, [s]);

  const prevCard = useRef<CardRow | undefined>(undefined);
  const reviewId = useRef<number>();
  const career = useAsync(getCareer, []);
  const [guess, setGuess] = useState<'sabia' | 'chutei' | null>(null);
  useEffect(() => setGuess(null), [ex?.key, s?.index]);
  const submit = useCallback(async (a: Answer) => {
    if (!s || !ex || answer || acting.current) return;
    acting.current = true;
    haptic(a.correct ? 'ok' : a.correct === false ? 'bad' : 'tap');
    const ms = Date.now() - shownAt.current;
    const base = { articleId: ex.articleId, unitId: ex.unitId, conceptId: ex.conceptId, dim: ex.dim, type: ex.kind };
    const next = { ...s, draft: undefined, results: [...s.results, { key: ex.key, correct: a.correct, ms }] };
    let capiReaction: CapiReaction | undefined;
    try {
      reviewId.current = undefined;
      prevCard.current = undefined;
      await db.transaction('rw', db.cards, db.reviews, db.kv, async () => {
        const submitted = a.given?.split(' | ') ?? [];
        const missedBlank = ex.blanks?.find((blank, i) => fold(blank.answer) !== fold(submitted[i] ?? ''));
        if (a.correct !== null) {
          if (a.correct) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [latest, firstToday] = await Promise.all([
              db.reviews.where('cardId').equals(ex.key).reverse().first(),
              db.reviews.where('at').aboveOrEqual(today.getTime()).filter((review) => review.correct).first(),
            ]);
            capiReaction = latest?.correct === false ? 'recovered' : firstToday ? 'correct' : 'first';
          }
          const recorded = await recordAnswer({ cardId: ex.key, base, correct: !!a.correct, ms, expectedMs: ex.expectedMs, mode: s.config.mode, type: ex.kind, given: a.given, expected: ex.answer, target: missedBlank?.answer ?? ex.altered?.from ?? ex.stem.find((part) => part.blank)?.t });
          prevCard.current = recorded.previous;
          reviewId.current = recorded.reviewId;
          if (taskId) await recordPlannerExercise(taskId, ex.key);
        }
        await db.kv.put({ key: 'session', value: next });
      });
    } catch (error) {
      console.error(error);
      reviewId.current = undefined;
      toast('A resposta pôde ser corrigida, mas não foi salva no histórico.');
    }
    setS(next);
    setSeconds(3);
    setAutoPaused(false);
    setReadingExplanation(false);
    setAnswer({ ...a, capiReaction });
    acting.current = false;
  }, [s, ex, answer, taskId]);

  const advance = useCallback(async () => {
    if (!s || !ex || acting.current || (isStudyQuestion(ex) && !answer)) return;
    acting.current = true;
    haptic('tap');
    let results = s.results;
    if (!answer) {
      // itens não avaliados: leitura, termo, microaula
      const ms = Date.now() - shownAt.current;
      if (ex.kind === 'read' && ex.articleId) {
        const read = await kvGet<string[]>('readArticles', []);
        await kvSet('readArticles', [...new Set([...read, ex.articleId])]);
        const hit = getArticle(ex.articleId);
        for (const u of hit?.art.units ?? []) for (const d of new Set(findTargets(u).map((t) => t.dim))) {
          const key = `L:${u.id}:${d}`;
          await markSeen(key, { articleId: ex.articleId, unitId: u.id, dim: d, type: 'read' }).catch(() => {});
          const c = await db.cards.get(key).catch(() => undefined);
          if (c && c.stage < 1) await db.cards.update(key, { stage: 1 }).catch(() => {});
        }
      }
      if (ex.kind === 'term') { const seen = await kvGet<string[]>('termsIntroduced', []); await kvSet('termsIntroduced', [...new Set([...seen, ex.termId!])]); }
      if (ex.kind === 'lesson') { const done = await kvGet<string[]>('lessonsDone', []); await kvSet('lessonsDone', [...new Set([...done, ex.lessonId!])]); }
      results = [...results, { key: ex.key, correct: null, ms }];
    }
    let next: SessionState = { ...s, results, draft: undefined, index: s.index + 1, finishedAt: !s.config.infinite && s.index + 1 >= s.items.length ? Date.now() : undefined };
    if (taskId && !answer) {
      try {
        await db.transaction('rw', db.kv, async () => {
          await recordPlannerExercise(taskId, ex.key);
          await db.kv.put({ key: 'session', value: next });
        });
      } catch { toast('Não foi possível registrar esta leitura na meta.'); }
    }
    if (s.config.infinite && next.index >= next.items.length - 3) { try { next = await extendSession(next); } catch { /* sem mais itens */ } }
    if (next.finishedAt) next = await finishSession(next);
    else await saveSession(next);
    setS(next); setAnswer(null); setLawSheet(false); setReadingExplanation(false); shownAt.current = Date.now();
    acting.current = false;
  }, [s, ex, answer, taskId]);

  const end = useCallback(async (timedOut = false) => {
    if (!s || s.finishedAt || acting.current) return;
    acting.current = true;
    try {
      setS(await finishSession(s, timedOut));
      setAnswer(null);
    } finally {
      acting.current = false;
    }
  }, [s]);
  useEffect(() => { if (timeExpired) void end(true); }, [timeExpired, end]);

  useEffect(() => {
    if (!active || !answer?.correct || autoPaused || levelSheet || lawSheet || readingExplanation) return;
    const tick = setTimeout(() => {
      if (seconds === 1) void advance();
      else setSeconds(seconds - 1);
    }, 1000);
    return () => clearTimeout(tick);
  }, [active, answer, autoPaused, levelSheet, lawSheet, readingExplanation, seconds, advance]);
  useEffect(() => {
    if (!active) return;
    const k = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      if (e.key === 'Enter' && target?.closest('button, a, summary, [role="button"]')) return;
      if (e.key === 'Enter' && (answer || (ex && ['read', 'term'].includes(ex.kind)))) { e.preventDefault(); void advance(); }
      if (!answer && ex?.options && !ex.doctrineParts && /^[1-9a-e]$/i.test(e.key)) {
        const i = /\d/.test(e.key) ? +e.key - 1 : e.key.toLowerCase().charCodeAt(0) - 97;
        const o = ex.options[i]; if (o) void submit({ correct: o.correct, given: o.text });
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [active, answer, ex, advance, submit]);

  const close = async () => {
    if (acting.current) return;
    haptic('soft');
    if (s && !s.finishedAt) {
      acting.current = true;
      await saveSession({ ...s, pausedAt: Date.now() });
    }
    nav.back();
  };
  if (err) return <div className="stack" style={{ paddingTop: 40 }}>
    <div className="empty" role="status">{err}</div>
    {config?.activity === 'daily' && <button className="btn btn-primary" onClick={() => nav.replace({ name: 'jogar', adjust: true })}>Escolher outro treino</button>}
    <button className="btn btn-quiet" onClick={close}>Voltar</button>
  </div>;
  if (previous) return (
    <div className="stack" style={{ paddingTop: 40 }}>
      <h1 className="title-m">Você tem uma sessão em andamento</h1>
      <p className="small muted">Começar um novo treino encerra a sessão anterior. Suas respostas registradas ficam no histórico.</p>
      <button className="btn btn-primary" onClick={() => void chooseSession(false)}>{config?.title ? `Começar ${config.title}` : 'Encerrar a anterior e começar'}</button>
      <button className="btn btn-quiet" onClick={() => void chooseSession(true)}>Retomar treino anterior</button>
      <button className="btn btn-quiet" onClick={close}>Voltar</button>
    </div>
  );
  if (!s) return <TucaLoading msg="Montando sua sessão" full />;
  if (!ex) return <Summary s={s} startXp={career?.xp}
    onClose={async () => { await saveSession(null); await close(); }}
    onNext={(next) => nav.replace({ name: 'session', config: next, reenter: s.id })} />;

  const progress = s.config.infinite ? (s.index % 20) / 20 : s.index / s.items.length;
  const question = s.items.slice(0, s.index + 1).filter(isStudyQuestion).length;
  const total = s.items.filter(isStudyQuestion).length;
  const position = isStudyQuestion(ex) ? `Questão ${question}${s.config.infinite ? '' : ` de ${total}`}` : `Etapa ${s.index + 1}`;
  const checkpoint = isStudyQuestion(ex) ? questionCheckpoint(question, s.config.infinite ? undefined : total, !!answer && answer.correct !== null) : null;
  const needsContinue = !!answer || ex.kind === 'read' || ex.kind === 'term';
  const article = ex.articleId ? getArticle(ex.articleId) : undefined;
  const where = ex.where ?? (article ? articleTitle(article.law.id, article.art) : undefined);
  const canConsult = !!article && canConsultStudySource(ex, answer?.correct);
  const countdownPaused = autoPaused || lawSheet || levelSheet || readingExplanation;
  const feedback = answer && answer.correct !== null && (
    <div className="stack answer-feedback">
      <TucaReact correct={answer.correct} reaction={answer.capiReaction} combo={answer.correct ? trailing(s.results) : 0}
        method={ex.doctrineParts ? undefined : ex.kind === 'cloze-type' ? 'Sem alternativas' : ex.options || ex.kind === 'cloze-multi' || ex.kind === 'tf' ? 'Com alternativas' : undefined}
        review={ex.practice === 'revisao' || ex.practice === 'revanche' || !!(prevCard.current?.fsrs.reps && isDue(prevCard.current.fsrs))}
        confidence={answer.correct && reviewId.current !== undefined && !s.config.blitz ? { value: guess, onPick: (v) => {
          if (guess !== null) return;
          setGuess(v);
          haptic('soft');
          if (v === 'chutei') void regradeAsGuess(prevCard.current, ex.key, reviewId.current).catch(() => toast('Não foi possível salvar o chute.'));
        } } : undefined} />
      {!ex.doctrine && <AnswerCorrection ex={ex} answer={answer} />}
      {!s.config.blitz && reviewId.current !== undefined && <SaveReview key={ex.key} cardId={ex.key} />}
    </div>
  );

  return (
    <div className="ex-wrap study-layout">
      <header className="question-head">
        <div className="row question-toolbar">
          <button className="icon-btn glass" aria-label="Pausar e voltar" onClick={close}><IClose /></button>
          <div className="question-progress"><span className="small muted">{position}</span><Progress value={progress} /></div>
          {s.config.blitz ? (answer ? <span className="blitz-clock done"><IBolt size={16} /></span> : <BlitzClock key={ex.key + s.index} onTimeout={() => void submit({ correct: false, given: '(tempo esgotado)' })} />) : <Timer startedAt={s.startedAt} limitMin={s.config.timed && !s.config.infinite ? s.config.minutes : undefined} onTimeout={() => setTimeExpired(true)} />}
          <button className="btn btn-quiet btn-sm focus-toggle" aria-label="Modo foco" aria-pressed={settings.studyFocus} onClick={() => setSettings({ studyFocus: !settings.studyFocus })}>Foco</button>
          {s.config.mode !== 'provar' && !s.config.blitz && <button className="icon-btn glass" onClick={() => setLevelSheet(true)} aria-label="Opções de leitura"><IText size={19} /></button>}
        </div>
        {checkpoint && <p className="question-checkpoint small" role="status">
          <strong>Bloco {checkpoint.block}</strong>
          {checkpoint.remaining === 0 ? ' concluído' : checkpoint.remaining === 1 ? ' · falta 1 questão' : ` · faltam ${checkpoint.remaining} questões`}
        </p>}
        {where && (!answer && ex.kind === 'which-article' ? null : ex.doctrine
          ? <p className="question-module"><span className="muted">Doutrina</span> · {where}</p>
          : <div className="question-reference">
            <LegalReference key={where + ':' + (ex.unitId ?? '')} where={where} unitId={ex.unitId} onOpen={canConsult ? () => {
              setAutoPaused(true);
              setLawSheet(true);
            } : undefined} />
            {article && !canConsult && <span className="reference-lock"><ILock size={14} /> Texto após responder</span>}
          </div>)}
      </header>
      <div className="question-body" ref={questionBody}>
        <motion.div key={ex.key + s.index} initial={settings.studyFocus || reducedMotion() ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
          transition={spring} className="stack question-content">
          {ex.kind === 'lesson' ? (
            <LessonPlayer id={ex.lessonId!} onDone={advance} embedded />
          ) : ex.doctrineParts ? (
            <>
              <DoctrineQuestion parts={ex.doctrineParts} draft={s.draft ?? []} result={answer?.doctrineChoices}
                active={active && !lawSheet && !levelSheet} onDraft={updateDraft} onInspect={setReadingExplanation}
                onAnswer={(correct, choices) => void submit({
                  correct, doctrineChoices: choices,
                  given: choices.map((id, i) => ex.doctrineParts?.[i].options.find((option) => option.id === id)?.text ?? '').join(' | '),
                })} />
              {feedback}
            </>
          ) : (
            <>
              <KindBadge ex={ex} />
              <ExerciseView ex={ex} mode={s.config.mode} onAnswer={submit} answer={answer} feedback={feedback}
                onInspect={setReadingExplanation} />
            </>
          )}
        </motion.div>
      </div>
      {ex.kind !== 'lesson' && (
        <footer className="answer-dock">
          {answer?.correct && <div className="auto-countdown">
            <span className="row" role="timer" aria-label={countdownPaused ? 'Avanço automático pausado' : `Avanço automático em ${seconds} segundos`}>
              <span className="auto-clock" data-seconds={seconds} aria-hidden="true">{countdownPaused ? 'Ⅱ' : seconds}</span>
              {countdownPaused ? 'Avanço pausado' : 'Avanço automático'}
            </span>
            <button className="btn btn-quiet btn-sm" onClick={() => setAutoPaused(!autoPaused)}>{autoPaused ? 'Retomar avanço' : 'Pausar avanço'}</button>
          </div>}
          {needsContinue && <button className="btn btn-primary btn-block" onClick={advance}>{!s.config.infinite && s.index + 1 >= s.items.length ? 'Ver resumo' : ex.kind === 'read' || ex.kind === 'term' ? 'Entendi' : 'Próxima questão'}</button>}
          <button className="exit-link" onClick={() => void end()}>Encerrar e ver resumo</button>
        </footer>
      )}
      {canConsult && article && <Sheet key={s.index + ':' + ex.key} open={lawSheet} onClose={() => setLawSheet(false)} label="Consultar texto legal" tall>
        <div ref={reader} className="stack legal-peek">
          <div className="row between"><h2 className="title-m">{articleTitle(article.law.id, article.art)}</h2>
            <button className="btn btn-quiet btn-sm" onClick={() => setLawSheet(false)}>Voltar à pergunta</button></div>
          <ArticleView art={article.art} selectedUnit={ex.unitId} highlights={ex.unitId ? new Set([ex.unitId]) : undefined} showNotes={false} />
          <p className="small muted">{article.law.provenance.sourceName} · {article.law.provenance.versionLabel}</p>
        </div>
      </Sheet>}
      <Sheet open={levelSheet} onClose={() => setLevelSheet(false)} label="Opções de leitura">
        <div className="stack">
          <h2 className="title-m">Opções de leitura</h2>
          <Segmented label="Tamanho da letra" value={settings.textSize} options={[{ id: 'm', label: 'Padrão' }, { id: 'l', label: 'Grande' }, { id: 'xl', label: 'Maior' }]} onChange={(textSize) => setSettings({ textSize })} />
          <h3 className="title-s">Nível de explicação</h3>
          <Segmented label="Nível" value={settings.level} options={LEVELS} onChange={(l) => setSettings({ level: l })} />
          {LEVELS.map((l) => <p key={l.id} className="small muted"><strong style={{ color: 'var(--text)' }}>{l.label}:</strong> {{ simples: 'explicação curta, para quem nunca estudou Direito.', tecnico: 'conceito jurídico com fundamentação e distinções.', concurso: 'diferenças, exceções e pontos cobrados em prova.' }[l.id]}</p>)}
        </div>
      </Sheet>
    </div>
  );
}
void getTerm;

/** Acertos seguidos no fim da lista de resultados. */
function trailing(results: SessionState['results']) {
  let n = 0;
  for (let i = results.length - 1; i >= 0; i--) { const r = results[i]; if (r.correct === null) continue; if (!r.correct) break; n++; }
  return n;
}

function TucaReact({ correct, reaction, combo, method, review, confidence }: { correct: boolean; reaction?: CapiReaction; combo: number; method?: string; review: boolean; confidence?: { value: 'sabia' | 'chutei' | null; onPick: (v: 'sabia' | 'chutei') => void } }) {
  const mood = correct ? 'cheer' : 'sad';
  const say = confidence?.value === 'chutei'
    ? 'Vou trazer esta questão mais cedo na revisão.'
    : [method, correct && (review || reaction === 'recovered') ? 'Acertou na revisão' : null].filter(Boolean).join(' · ');
  return (
    <motion.div className={`tuca-react verdict ${correct ? 'ok' : 'bad'}`} role="status" initial={reducedMotion() ? false : { y: 10, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={spring}>
      <Mascot mood={mood} size={58} reaction={reaction ?? (correct ? 'correct' : 'incorrect')} />
      <Stamp ok={correct} />
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>{correct ? <ICheck size={18} /> : <IX size={18} />}<strong>{correct ? 'Correto' : 'Não foi dessa vez'}</strong>{combo >= 3 && <span className="combo"><IFlame size={13} /> {combo}</span>}</div>
        {say && <div className="say" style={{ color: 'var(--text)' }}>{say}</div>}
        {confidence && (
          <div className="row" style={{ gap: 6, marginTop: 6 }} role="group" aria-label="Você tinha certeza?">
            <span className="xsmall muted">Tinha certeza?</span>
            <button className="conf" disabled={confidence.value !== null} aria-pressed={confidence.value === 'sabia'} onClick={() => confidence.onPick('sabia')}>Sabia</button>
            <button className="conf" disabled={confidence.value !== null} aria-pressed={confidence.value === 'chutei'} onClick={() => confidence.onPick('chutei')}>Chutei</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** "Encontre o erro": cada palavra é tocável; a trocada é a resposta. */
function SpotView({ ex, answered, onAnswer, lawId, feedback }: { ex: Exercise; answered: boolean; onAnswer: (a: Answer) => void; lawId?: string; feedback: React.ReactNode }) {
  const [tapped, setTapped] = useState<number | null>(null);
  useEffect(() => setTapped(null), [ex.key]);
  const tokens = useMemo(() => {
    const out: { t: string; alt?: boolean; lab?: boolean }[] = [];
    for (const sg of ex.stem) {
      if (sg.strong) { out.push({ t: sg.t, lab: true }); continue; }
      for (const part of sg.t.split(/(\s+)/)) if (part) out.push({ t: part, alt: sg.altered });
    }
    return out;
  }, [ex.key]); // eslint-disable-line
  const tap = (i: number) => { if (answered) return; setTapped(i); haptic('tap'); onAnswer({ correct: !!tokens[i].alt, given: tokens[i].t }); };
  return (
    <div className="stack" style={{ gap: 14 }}>
      <MascotQuestion text={ex.prompt} />
      {ex.context?.length ? <div className="law-art law muted" style={{ fontSize: '0.92em', whiteSpace: 'pre-line' }}><Segs segs={ex.context} lawId={lawId} terms={false} /></div> : null}
      <div className="law-art law spot-text">
        {tokens.map((tk, i) => tk.lab ? <strong key={i}>{tk.t}</strong> : /^\s+$/.test(tk.t) ? <span key={i}>{tk.t}</span> : (
          <button key={i} className={`spot-w${answered && tk.alt ? ' is-alt' : ''}${answered && tapped === i && !tk.alt ? ' is-wrong' : ''}${!answered && tapped === i ? ' is-tapped' : ''}`} onClick={() => tap(i)} disabled={answered}>
            {tk.t}{answered && tk.alt && !tokens[i + 1]?.alt && <span className="spot-fix"> {ex.altered?.from}</span>}
          </button>
        ))}
      </div>
      {feedback}
      {answered && <Official ex={ex} highlight={ex.altered?.from} />}
    </div>
  );
}

/** Várias lacunas: preencha uma por vez, tocando nas alternativas. */
function MultiView({ ex, answered, onAnswer, feedback }: { ex: Exercise; answered: boolean; onAnswer: (a: Answer) => void; feedback: React.ReactNode }) {
  const [filled, setFilled] = useState<string[]>([]);
  useEffect(() => setFilled([]), [ex.key]);
  const blanks = ex.blanks ?? [];
  const cur = filled.length;
  const choose = (w: string) => {
    if (answered) return;
    haptic('soft');
    const next = [...filled, w];
    setFilled(next);
    if (next.length === blanks.length) onAnswer({ correct: next.every((x, i) => fold(x) === fold(blanks[i].answer)), given: next.join(' | ') });
  };
  let bi = -1;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <MascotQuestion text={ex.prompt} />
      {ex.context?.length ? <div className="law-art law muted" style={{ fontSize: '0.92em', whiteSpace: 'pre-line' }}>{ex.context.map((c, i) => c.strong ? <strong key={i}>{c.t}</strong> : <span key={i}>{c.t}</span>)}</div> : null}
      <div className="law-art law">
        {ex.stem.map((sg, i) => {
          if (sg.strong) return <strong key={i}>{sg.t}</strong>;
          if (!sg.blank) return <span key={i}>{sg.t}</span>;
          bi++;
          const v = filled[bi]; const ok = answered && v !== undefined && fold(v) === fold(blanks[bi].answer);
          return <span key={i} className={`mblank${bi === cur && !answered ? ' current' : ''}${answered ? (ok ? ' ok' : ' bad') : ''}`}><sup>{bi + 1}</sup>{v ?? '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}{answered && !ok && <span className="mfix"> {blanks[bi].answer}</span>}</span>;
        })}
      </div>
      {!answered && blanks[cur] && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="xsmall muted">Lacuna {cur + 1} de {blanks.length}</div>
          <div className="chips">{blanks[cur].options.map((o) => <button key={o} className="chip" style={{ fontSize: 15, minHeight: 42 }} onClick={() => choose(o)}>{o}</button>)}</div>
          {cur > 0 && <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setFilled(filled.slice(0, -1))}>Desfazer</button>}
        </div>
      )}
      {feedback}
      {answered && <Official ex={ex} />}
    </div>
  );
}

function SaveReview({ cardId }: { cardId: string }) {
  const [saved, setSaved] = useState<boolean>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void db.marks.get(reviewMarkId(cardId)).then((mark) => { if (active) setSaved(!!mark); }).catch(() => {});
    return () => { active = false; };
  }, [cardId]);
  return (
    <button className="btn btn-quiet save-review" aria-pressed={saved} disabled={busy || saved === undefined} onClick={async () => {
      setBusy(true);
      try { await setReviewMark(cardId, !saved); setSaved(!saved); }
      catch { toast('Não foi possível atualizar sua lista de revisão'); }
      finally { setBusy(false); }
    }}>{saved ? 'Salva para revisão' : 'Salvar para revisar'}</button>
  );
}

function AnswerCorrection({ ex, answer }: { ex: Exercise; answer: Answer }) {
  const timedOut = answer.given === '(tempo esgotado)';
  const option = ex.options?.find((o) => o.correct);
  let right = option?.text ?? ex.answer ?? '';
  let given = timedOut ? 'Tempo esgotado' : answer.given?.trim() || 'Em branco';
  let change = '';
  let note: ReturnType<typeof trapNote>;
  let label = ex.family === 'literal' && ex.articleId ? 'A lei diz' : 'Resposta esperada';
  if (ex.kind === 'which-article') label = 'Dispositivo correto';
  if (ex.kind === 'rubric') label = 'Rubrica correta';
  if (ex.kind === 'tf' || ex.kind === 'spot') {
    if (ex.kind === 'tf') {
      given = answer.given === 'V' ? 'Igual à lei' : answer.given === 'F' ? 'Há alteração' : given;
      right = ex.altered?.from ?? 'O trecho está igual à lei';
    } else {
      right = ex.altered?.from ?? '';
    }
    if (ex.altered) {
      change = `O enunciado trazia “${ex.altered.to}”.`;
      note = trapNote(ex.altered.from, ex.altered.to);
    }
  } else if (ex.kind === 'cloze-multi') {
    const submitted = (answer.given ?? '').split(' | ');
    const index = ex.blanks?.findIndex((b, i) => fold(b.answer) !== fold(submitted[i] ?? '')) ?? -1;
    if (index < 0) return null;
    right = ex.blanks![index].answer;
    given = submitted[index]?.trim() || 'Em branco';
    label = `A lei diz na lacuna ${index + 1}`;
  } else if (ex.kind === 'order') {
    const order = (answer.given ?? '').split('|');
    const index = ex.orderItems?.findIndex((item, i) => item.id !== order[i]) ?? -1;
    if (index < 0) return null;
    right = ex.orderItems![index].t;
    given = ex.orderItems?.find((item) => item.id === order[index])?.t ?? given;
    label = `Na posição ${index + 1}`;
  }
  if (!right) return null;
  if (ex.family === 'literal' && !timedOut && !answer.correct) {
    if (!ex.altered && ex.kind !== 'tf' && ex.kind !== 'order') note = trapNote(right, given);
    if (!change && ex.kind !== 'tf' && ex.kind !== 'order' && !note) {
      const hasNegation = (value: string) => /\b(?:nao|nunca|nem)\b/.test(fold(value));
      if (hasNegation(right) !== hasNegation(given)) change = 'A negação inverte o sentido deste trecho.';
      else if (ex.dim === 'prazos') change = 'O prazo depende do número e da unidade de tempo do dispositivo.';
      else if (ex.dim === 'excecoes') change = 'A expressão indica em que condição a regra do artigo se aplica.';
      else change = 'Confira a redação no trecho destacado abaixo.';
    }
  }
  const explanation = [change, note?.texto ?? option?.why].filter(Boolean).join(' ');
  const comparison = ex.altered?.to ?? (ex.kind === 'tf' || ex.kind === 'spot' ? '' : given);
  const diff = ex.family === 'literal' && !timedOut && comparison && fold(comparison) !== fold(right)
    ? wordDiff(comparison, right) : [];
  return (
    <div className="trap-card small">
      {(!answer.correct || ex.kind === 'tf' || ex.kind === 'spot' || fold(given) !== fold(right)) && <p><strong>Sua resposta</strong> · {given}</p>}
      <p><strong>{label}</strong> · {diff.length ? diff.map((part, index) => part.op === 'del' ? null
        : part.op === 'add' ? <mark className="answer-change" key={index}>{part.t}</mark> : <span key={index}>{part.t}</span>) : right}</p>
      {explanation && <p className="muted"><strong>O que muda</strong> · {explanation}</p>}
    </div>
  );
}

/** Carimbo de decisão: DEFERIDO (acerto, com faíscas) ou INDEFERIDO (erro). */
function Stamp({ ok }: { ok: boolean }) {
  const rm = reducedMotion();
  return (
    <div className={`stamp ${ok ? 'ok' : 'bad'}`} aria-hidden="true">
      <motion.span className="stamp-ink" initial={rm ? false : { scale: 2.4, opacity: 0, rotate: -4 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>{ok ? 'DEFERIDO' : 'INDEFERIDO'}</motion.span>
      {ok && !rm && Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <motion.i key={i} className="spark" initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 30, opacity: 0, scale: 0.4 }} transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }} />;
      })}
    </div>
  );
}

/** Martelo que bate no fim da sessão. */
function Gavel() {
  const rm = reducedMotion();
  return (
    <div className="gavel-wrap" aria-hidden="true">
      <motion.svg width="92" height="92" viewBox="0 0 92 92" initial={rm ? false : { rotate: -55, x: 6, y: -10 }} animate={{ rotate: [-55, 8, -2, 0], x: 0, y: 0 }} transition={{ duration: 0.75, times: [0, 0.55, 0.8, 1], ease: 'easeIn' }} style={{ originX: '78%', originY: '78%' }}>
        <defs><linearGradient id="gw" x1="0" x2="1"><stop offset="0" stopColor="#a8714a" /><stop offset="1" stopColor="#6b4329" /></linearGradient></defs>
        <g transform="rotate(-40 46 46)"><rect x="18" y="26" width="44" height="20" rx="5" fill="url(#gw)" /><rect x="14" y="24" width="8" height="24" rx="2.5" fill="#f1d99a" /><rect x="58" y="24" width="8" height="24" rx="2.5" fill="#f1d99a" /><rect x="37" y="44" width="7" height="40" rx="3" fill="#7a4d30" /></g>
      </motion.svg>
      <motion.div className="gavel-base" initial={rm ? false : { scaleX: 0.6, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.45 }} />
      {!rm && <motion.div className="gavel-bang" initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ delay: 0.42, duration: 0.6 }} />}
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(reducedMotion() ? to : 0);
  useEffect(() => { if (reducedMotion()) return; let raf = 0; const t0 = performance.now(); const tick = (t: number) => { const k = Math.min(1, (t - t0) / 900); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [to]);
  return <>{v.toLocaleString('pt-BR')}</>;
}
