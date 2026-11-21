import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { CONCEPTS } from '../content/concepts';
import { TIPO_LABEL, type Concept } from '../content/types';
import { recordAnswer } from '../learn/scheduler';
import { rng, shuffle } from '../learn/text';
import { CType, PageHeader, spring } from '../ui/primitives';
import { haptic, reducedMotion } from '../ui/settings';
import { ICheck, IX } from '../ui/icons';
import { TermText } from '../ui/LawText';
import { openTerm } from '../ui/termStore';
import { REQUIREMENTS } from '../core/edital';
import { RefLine } from './TermSheet';
import { useVerification, verItem } from '../data/verification';

export function ConceptQuiz({ c, onDone, mode = 'aprender' }: { c: Concept; onDone?: (correct: boolean) => void; mode?: string }) {
  const opts = useMemo(() => shuffle(c.opcoes.map((o, i) => ({ ...o, id: `o${i}` })), rng(c.id + Date.now().toString().slice(0, 7))), [c.id]);
  const [chosen, setChosen] = useState<string>();
  const [t0] = useState(Date.now());
  const ver = useVerification();
  const vi = verItem(ver, 'exercicio', c.id);
  const answered = !!chosen;
  const pick = (id: string) => {
    if (answered) return;
    setChosen(id);
    const ok = !!opts.find((o) => o.id === id)?.correta;
    haptic(ok ? 'ok' : 'bad');
    void recordAnswer({ cardId: `C:${c.id}`, base: { conceptId: c.id, dim: c.dims[0], type: 'concept' }, correct: ok, ms: Date.now() - t0, expectedMs: 40000, mode, type: 'concept' }).catch(() => {});
  };
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 6 }}><span className="badge badge-muted">Interpretação</span><span className="badge badge-muted">{TIPO_LABEL[c.tipo]}</span></div>
      {c.situacao && <div className="card elev"><CType k="hipotetico" /><p style={{ marginTop: 8, lineHeight: 1.55 }}><TermText text={c.situacao} onTerm={openTerm} seen={new Set()} /></p></div>}
      <h3 className="ex-stem" style={{ fontWeight: 620 }}>{c.pergunta}</h3>
      <div className="stack" style={{ gap: 10 }}>
        {opts.map((o, i) => {
          const cls = answered ? (o.correta ? 'correct' : chosen === o.id ? 'wrong' : 'dim') : '';
          return (
            <motion.button key={o.id} className={`opt ${cls}`} disabled={answered} onClick={() => pick(o.id)} initial={reducedMotion() ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: reducedMotion() ? 0 : i * 0.03 }}>
              <span className="opt-key">{answered ? (o.correta ? <ICheck size={15} /> : chosen === o.id ? <IX size={15} /> : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}</span>
              <span className="grow">{o.texto}</span>
            </motion.button>
          );
        })}
      </div>
      {answered && (
        <div className="stack" style={{ gap: 8 }}>
          <CType k="interpretacao" />
          {opts.map((o, i) => <p key={o.id} className="small" style={{ lineHeight: 1.45, color: o.correta ? 'var(--ok)' : 'var(--text-2)' }}><strong>{String.fromCharCode(65 + i)}.</strong> {o.porque}</p>)}
          {c.refs.length > 0 && <div className="card" style={{ padding: '6px 14px' }}><div className="caps" style={{ margin: '6px 0 2px' }}>Fundamentação</div>{c.refs.map((r, i) => <RefLine key={i} r={r} status={vi?.refs[i]?.status} />)}</div>}
          {onDone && <button className="btn btn-primary btn-block" onClick={() => onDone(!!opts.find((o) => o.id === chosen)?.correta)}>Continuar</button>}
        </div>
      )}
    </div>
  );
}

export function ConceptsScreen({ topic }: { topic?: string }) {
  const [t, setT] = useState(topic ?? 'all');
  const list = CONCEPTS.filter((c) => t === 'all' || c.topico === t);
  const [i, setI] = useState(0);
  const topics = [...new Set(CONCEPTS.map((c) => c.topico))];
  const c = list[i % Math.max(1, list.length)];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Exercícios de interpretação" sub="Compreensão dos institutos — separados da lei seca" />
      <div className="hscroll"><div className="chips" style={{ flexWrap: 'nowrap' }}>
        <button className="chip" aria-pressed={t === 'all'} onClick={() => { setT('all'); setI(0); }}>Todos</button>
        {topics.map((x) => <button key={x} className="chip" style={{ whiteSpace: 'nowrap' }} aria-pressed={t === x} onClick={() => { setT(x); setI(0); }}>{REQUIREMENTS.find((r) => r.id === x)?.topico.replace(/^\d+\.\s*/, '') ?? x}</button>)}
      </div></div>
      <div className="xsmall muted">{(i % Math.max(1, list.length)) + 1} de {list.length}</div>
      {c && <ConceptQuiz key={c.id + i} c={c} onDone={() => setI(i + 1)} />}
    </div>
  );
}
