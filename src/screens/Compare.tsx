import { useMemo, useState } from 'react';
import { COMPARISONS } from '../content/comparisons';
import { PageHeader, Segmented, CType } from '../ui/primitives';
import { haptic } from '../ui/settings';
import { openTerm } from '../ui/termStore';
import { recordAnswer } from '../learn/scheduler';
import { rng, shuffle } from '../learn/text';
import { ICheck, IX } from '../ui/icons';
import { RefLine } from './TermSheet';
import { useVerification, verItem } from '../data/verification';

export function CompareScreen({ id }: { id: string }) {
  const cmp = COMPARISONS.find((c) => c.id === id)!;
  const [mode, setMode] = useState<'tabela' | 'exercicio'>('tabela');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const ver = useVerification();
  const vi = verItem(ver, 'comparativo', id);
  const toggle = (k: string) => { haptic('soft'); const n = new Set(hidden); n.has(k) ? n.delete(k) : n.add(k); setHidden(n); };
  const all = cmp.linhas.flatMap((l, i) => l.celulas.map((_, j) => `${i}:${j}`));
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title={cmp.titulo} sub="Estudo comparativo" />
      <Segmented label="Modo" value={mode} options={[{ id: 'tabela', label: 'Tabela' }, { id: 'exercicio', label: 'Exercício' }]} onChange={setMode} />
      {mode === 'tabela' ? (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="chip" onClick={() => setHidden(new Set(all))}>Ocultar tudo</button>
            <button className="chip" onClick={() => setHidden(new Set(shuffle(all, rng(Date.now())).slice(0, Math.ceil(all.length / 2))))}>Ocultar metade</button>
            <button className="chip" onClick={() => setHidden(new Set())}>Mostrar tudo</button>
          </div>
          <p className="xsmall muted">Toque em qualquer célula para ocultá-la ou revelá-la e teste sua memória.</p>
          <div className="hscroll">
            <table className={`cmp card${cmp.colunas.length <= 2 ? ' fit' : ''}`} style={{ padding: 0, minWidth: cmp.colunas.length > 2 ? 620 : undefined }}>
              <colgroup><col style={{ width: cmp.colunas.length <= 2 ? '27%' : 96 }} />{cmp.colunas.map((_, j) => <col key={j} />)}</colgroup>
              <thead><tr><th></th>{cmp.colunas.map((c, j) => <th key={j}>{c.termo ? <button className="gold" style={{ fontWeight: 650, textDecoration: 'underline', textDecorationColor: 'var(--gold-line)', textUnderlineOffset: 3 }} onClick={() => openTerm(c.termo!)}>{c.nome}</button> : c.nome}</th>)}</tr></thead>
              <tbody>
                {cmp.linhas.map((l, i) => (
                  <tr key={i}>
                    <td className="crit">{l.criterio}</td>
                    {l.celulas.map((c, j) => {
                      const k = `${i}:${j}`;
                      return <td key={j} onClick={() => toggle(k)} style={{ cursor: 'pointer' }}>{hidden.has(k) ? <span className="hidden-cell">{c}</span> : c}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row"><CType k="didatico" /><span className="xsmall muted">Síntese didática. Confira os dispositivos abaixo.</span></div>
          {cmp.refs.length > 0 && <div className="card" style={{ padding: '6px 14px' }}><div className="caps" style={{ margin: '6px 0 2px' }}>Dispositivos</div>{cmp.refs.map((r, i) => <RefLine key={i} r={r} status={vi?.refs[i]?.status} />)}</div>}
        </>
      ) : <CompareQuiz id={id} />}
    </div>
  );
}

function CompareQuiz({ id }: { id: string }) {
  const cmp = COMPARISONS.find((c) => c.id === id)!;
  const qs = useMemo(() => shuffle(cmp.linhas.flatMap((l, i) => l.celulas.map((c, j) => ({ i, j, crit: l.criterio, cell: c }))).filter((q) => q.cell !== '—' && cmp.linhas[q.i].celulas.filter((x) => x === q.cell).length === 1), rng(Date.now())), [id]); // eslint-disable-line
  const [k, setK] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [t0, setT0] = useState(Date.now());
  if (k >= qs.length) return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="title-l">{score}/{qs.length}</div>
      <p className="muted small" style={{ marginTop: 6 }}>associações corretas</p>
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => { setK(0); setScore(0); setChosen(null); }}>Refazer</button>
    </div>
  );
  const q = qs[k];
  const pick = (j: number) => {
    if (chosen !== null) return;
    const ok = j === q.j;
    setChosen(j); if (ok) setScore(score + 1); haptic(ok ? 'ok' : 'bad');
    void recordAnswer({ cardId: `X:${id}:${q.i}:${q.j}`, base: { dim: 'conceitual', type: 'compare' }, correct: ok, ms: Date.now() - t0, expectedMs: 15000, mode: 'aprender', type: 'compare' }).catch(() => {});
  };
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="xsmall muted">{k + 1} de {qs.length}</div>
      <div className="card elev"><div className="caps" style={{ marginBottom: 6 }}>{q.crit}</div><p style={{ fontSize: 17.5, lineHeight: 1.5 }}>{q.cell}</p></div>
      <p className="small muted">A qual instituto corresponde?</p>
      {cmp.colunas.map((c, j) => (
        <button key={j} className={`opt ${chosen !== null ? (j === q.j ? 'correct' : chosen === j ? 'wrong' : 'dim') : ''}`} onClick={() => pick(j)} disabled={chosen !== null}>
          <span className="opt-key">{chosen !== null && j === q.j ? <ICheck size={15} /> : chosen === j ? <IX size={15} /> : String.fromCharCode(65 + j)}</span>
          <span className="grow">{c.nome}</span>
        </button>
      ))}
      {chosen !== null && <button className="btn btn-primary btn-block" onClick={() => { setK(k + 1); setChosen(null); setT0(Date.now()); }}>Continuar</button>}
    </div>
  );
}
