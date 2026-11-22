import { liveQuery } from 'dexie';
import { TucaLoading } from '../ui/TucaLoading';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PageHeader, Progress, Segmented, Sheet, CType, toast, useLiveAsync } from '../ui/primitives';
import { nav } from '../ui/nav';
import { haptic, reducedMotion, setSettings, useSettings } from '../ui/settings';
import { IChevR, IClock, ICheck, IClose, IX, IPlay } from '../ui/icons';
import { FocusList, focusLabel } from './Home';
import { Flag } from '../ui/Flags';
import { COURSE_NAME, getPlan, scopeToFocus } from '../learn/plan';
import type { AreaId } from '../core/areas';
import { corrigir, desempenhoDisciplinas, editalQuestionCount, EDITAL_SIMULADO, finishSimulado, gerarSimulado, gerarSimuladoEdital, isSimuladoAnswerCorrect, letra, listSimulados, loadSimulado, simuladoDeadline, simuladoErrors, updateSimulado, type Estilo, type Simulado } from '../learn/simulado';
import { getArticle, articleTitle } from '../data/corpus';
import { CONCEPTS } from '../content/concepts';
import { Mascot, MascotQuestion } from '../ui/Mascot';
import { LegalReference } from '../ui/LegalReference';
import { spring } from '../ui/primitives';
import { motion } from 'motion/react';

const ESTILOS: { id: Estilo; label: string; desc: string; minPorQ: number }[] = [
  { id: 'leiseca', label: 'Lei seca', desc: '5 alternativas sobre prazos, limites, requisitos, competências e exceções da legislação.', minPorQ: 2.5 },
  { id: 'cebraspe', label: 'Certo/Errado', desc: 'Julgue se o item preserva a regra do dispositivo. Uma errada anula uma certa.', minPorQ: 1.5 },
  { id: 'fgv', label: 'Casos (FGV)', desc: 'Estilo FGV: situação-problema com 4–5 alternativas — banco de casos verificados e casos gerados a partir dos tipos penais.', minPorQ: 3 },
];

export function useSimuladoSetup(area: AreaId, focus: string) {
  const available = area !== 'geral' && focus === 'auto' ? area : null;
  const [official, setOfficial] = useState(false);
  const edital = official ? available : null;
  const [estilo, setEstilo] = useState<Estilo>('leiseca');
  const [n, setN] = useState(10);
  const [tempo, setTempo] = useState<'prova' | 'livre' | number>('prova');
  const [busy, setBusy] = useState(false);
  const e = ESTILOS.find((x) => x.id === estilo)!;
  const count = edital ? editalQuestionCount(edital) : n;
  const defaultTime = Math.round(count * (edital ? 2.5 : e.minPorQ));
  const tempoMin = tempo === 'livre' ? null : tempo === 'prova' ? defaultTime : tempo;
  const start = async (onStart?: () => void) => {
    if (busy) return;
    const route = nav.get().stack.at(-1);
    setBusy(true);
    haptic('ok');
    try {
      const sim = edital
        ? await gerarSimuladoEdital(edital, tempoMin)
        : await gerarSimulado({ minutes: 0, mode: 'provar', focus, area }, estilo, n, tempoMin);
      if (nav.get().stack.at(-1) !== route) return;
      if (edital && sim.questoes.length !== count) { toast('O banco disponível não completa os blocos deste edital. Use o simulado livre.'); return; }
      if (!edital && sim.questoes.length < n) toast(`Banco disponível: ${sim.questoes.length} questões neste escopo`);
      if (!sim.questoes.length) return;
      onStart?.();
      nav.replace({ name: 'simulado-run', id: sim.id });
    } catch (err) {
      console.error(err);
      toast('Não foi possível gerar o simulado');
    } finally {
      setBusy(false);
    }
  };
  return { estilo, setEstilo, n, setN, tempo, setTempo, busy, start, available, edital, setOfficial, count, defaultTime };
}

export function SimuladoFields({ setup }: { setup: ReturnType<typeof useSimuladoSetup> }) {
  const { estilo, setEstilo, n, setN, tempo, setTempo, available, edital, setOfficial, count, defaultTime } = setup;
  const e = ESTILOS.find((x) => x.id === estilo)!;
  return (<>
    {available && <Segmented label="Formato" value={edital ? 'edital' : 'livre'} options={[{ id: 'livre', label: 'Treino livre' }, { id: 'edital', label: 'Blocos jurídicos' }]} onChange={(choice) => setOfficial(choice === 'edital')} />}
    {edital ? (
      <div className="edital-note">
        <strong>{count} questões · {EDITAL_SIMULADO[edital].title}</strong>
        <p className="small muted">{EDITAL_SIMULADO[edital].detail}</p>
        <p className="xsmall muted">O Lex distribui as questões entre as disciplinas de cada bloco. O tempo é de treino.</p>
        <a className="small" href={EDITAL_SIMULADO[edital].url} target="_blank" rel="noreferrer">Consultar edital</a>
      </div>
    ) : <>
    <div className="caps" style={{ margin: '4px 4px 0' }}>Estilo</div>
    <Segmented label="Estilo" value={estilo} options={ESTILOS.map((x) => ({ id: x.id, label: x.label }))} onChange={setEstilo} />
    <p className="small muted" style={{ padding: '0 4px' }}>{e.desc}</p>
    <div className="caps" style={{ margin: '4px 4px 0' }}>Número de questões</div>
    <div className="chips">{[10, 30, 50, 100].map((x) => <button key={x} className="chip" aria-pressed={n === x} onClick={() => setN(x)}>{x}</button>)}</div>
    </>}
    <div className="caps" style={{ margin: '4px 4px 0' }}>Tempo</div>
    <div className="chips">
      <button className="chip" aria-pressed={tempo === 'prova'} onClick={() => setTempo('prova')}><IClock size={15} /> {edital ? 'Tempo sugerido' : 'Ritmo de prova'} ({defaultTime} min)</button>
        {[30, 60, 120, 240].map((m) => <button key={m} className="chip" aria-pressed={tempo === m} onClick={() => setTempo(m)}>{m} min</button>)}
      <button className="chip" aria-pressed={tempo === 'livre'} onClick={() => setTempo('livre')}>Sem limite</button>
    </div>
  </>);
}

export function SimuladoHistory({ collapsed = true }: { collapsed?: boolean }) {
  const hist = useLiveAsync(listSimulados, []);
  if (!hist?.length) return null;
  const list = (
    <div className="list">
      {hist.map((s) => { const c = corrigir(s); return (
        <button key={s.id} className="list-item" onClick={() => nav.push({ name: 'simulado-run', id: s.id })}>
          <div className="grow"><div className="small" style={{ fontWeight: 620 }}>{ESTILOS.find((x) => x.id === s.estilo)?.label} · {s.questoes.length} questões</div>
            <div className="xsmall muted">{new Date(s.createdAt).toLocaleString('pt-BR')} · {s.finishedAt ? `${c.certas}/${c.total} acertos${s.estilo === 'cebraspe' ? ` · líquida ${c.liquida}` : ''}` : 'em andamento'}</div></div>
          <IChevR className="chev" />
        </button>); })}
    </div>
  );
  return collapsed ? <details className="jg-history"><summary>Simulados anteriores</summary>{list}</details>
    : <section><h2 className="caps" style={{ margin: '8px 4px' }}>Simulados anteriores</h2>{list}</section>;
}

export function SimuladoConfig({ area: areaProp, focus: focusProp }: { area?: AreaId; focus?: string } = {}) {
  const plan = getPlan();
  const fromPlan = plan ? scopeToFocus(plan.scope) : null;
  const area: AreaId = areaProp ?? fromPlan?.area ?? 'geral';
  const [focus, setFocus] = useState(focusProp ?? (fromPlan && fromPlan.area === area ? fromPlan.focus : 'auto'));
  const [pick, setPick] = useState(false);
  const setup = useSimuladoSetup(area, focus);
  const { busy, count: n } = setup;
  if (busy) return <TucaLoading msg={`Gerando ${n} questões`} full />;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Criar simulado" sub="Questões geradas a partir do texto oficial" />
      <div className="row" style={{ gap: 8 }}><Flag area={area} width={26} rounded={3} /><span className="small" style={{ fontWeight: 650 }}>{area === 'geral' ? 'Direito em geral' : COURSE_NAME[area]}</span></div>
      <SimuladoFields setup={setup} />
      <button className="list-item card tap" style={{ borderRadius: 18, display: 'flex' }} onClick={() => setPick(true)}>
        <div className="grow"><div className="xsmall muted">Conteúdo</div><div className="small" style={{ fontWeight: 600 }}>{focusLabel(focus, area)}</div></div><IChevR className="chev" />
      </button>
      <div className="thumb-dock"><button className="btn btn-primary btn-block" disabled={busy || (area === 'geral' && focus === 'auto')} onClick={() => void setup.start()} style={{ minHeight: 58 }}><IPlay size={17} /> {busy ? 'Gerando…' : `Gerar ${n} questões`}</button></div>
      <SimuladoHistory collapsed={false} />
      <Sheet open={pick} onClose={() => setPick(false)} label="Conteúdo do simulado" tall>
        <div className="title-m" style={{ marginBottom: 12 }}>Conteúdo</div>
        <FocusList area={area} value={focus} onPick={(f) => { setFocus(f); setPick(false); }} />
      </Sheet>
    </div>
  );
}

function Countdown({ s, onEnd }: { s: Simulado; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const el = Math.max(0, Math.floor((now - s.startedAt) / 1000));
  const deadline = simuladoDeadline(s);
  const rem = deadline === null ? null : Math.ceil((deadline - now) / 1000);
  const expired = rem !== null && rem <= 0;
  const fired = useRef(false);
  useEffect(() => { if (expired && !fired.current) { fired.current = true; onEnd(); } }, [expired, onEnd]);
  const v = rem !== null ? Math.max(0, rem) : el;
  const hh = Math.floor(v / 3600), mm = String(Math.floor((v % 3600) / 60)).padStart(2, '0'), ss = String(v % 60).padStart(2, '0');
  return <span className={`timer glass${rem !== null && rem < 300 ? ' low' : ''}`} role="timer">{rem !== null ? '⏳' : '⏱'} {hh ? `${hh}:` : ''}{mm}:{ss}</span>;
}

export function SimuladoRun({ id }: { id: string }) {
  const [s, setS] = useState<Simulado | null>();
  const [grid, setGrid] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [exit, setExit] = useState(false);
  const [saving, setSaving] = useState(false);
  const finishing = useRef(false);
  const deadlineReached = useRef(false);
  const body = useRef<HTMLDivElement>(null);
  const { studyFocus } = useSettings();
  useLayoutEffect(() => { body.current?.scrollTo({ top: 0 }); }, [s?.position]);
  useEffect(() => {
    const subscription = liveQuery(() => loadSimulado(id)).subscribe({
      next: setS,
      error: () => setS(null),
    });
    return () => subscription.unsubscribe();
  }, [id]);
  if (s === undefined) return <TucaLoading msg="Preparando o simulado" full />;
  if (!s?.questoes.length) return <div className="stack"><PageHeader title="Simulado indisponível" /><button className="btn btn-primary" onClick={() => nav.replace({ name: 'jogar', mode: 'simulado' })}>Criar simulado</button></div>;
  if (s.finishedAt) return <SimuladoResult s={s} />;
  const i = Math.max(0, Math.min(s.questoes.length - 1, typeof s.position === 'number' && Number.isInteger(s.position) ? s.position : 0));
  const q = s.questoes[i];
  const saveProgress = (change: Parameters<typeof updateSimulado>[1]) => {
    if (finishing.current || deadlineReached.current) return;
    void updateSimulado(id, change).catch(() => toast('Não foi possível salvar o progresso do simulado'));
  };
  const setI = (position: number) => saveProgress({ position });
  const answer = (optionId: string) => {
    haptic('soft');
    saveProgress({ questionId: q.id, optionId });
  };
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setSaving(true);
    try {
      const result = await finishSimulado(id);
      setS(result);
      haptic('ok');
    } catch {
      toast('Não foi possível finalizar. Você pode tentar de novo.');
    } finally {
      finishing.current = false;
      setSaving(false);
    }
  };
  const answered = Object.values(s.respostas).filter(Boolean).length;
  const blank = s.questoes.length - answered;
  return (
    <div className="study-layout exam-layout">
      <header className="question-head">
        <div className="row question-toolbar">
          <button className="icon-btn glass" aria-label="Sair do simulado" onClick={() => setExit(true)}><IClose size={19} /></button>
          <button className="btn btn-sm glass" aria-label={`Questão ${i + 1} de ${s.questoes.length}. Abrir lista de questões`} onClick={() => setGrid(true)}>{i + 1}/{s.questoes.length}</button>
          <div className="question-progress"><Progress value={answered / s.questoes.length} /></div>
          <Countdown s={s} onEnd={() => { deadlineReached.current = true; toast('Tempo esgotado'); void finish(); }} />
          <button className="btn btn-quiet btn-sm focus-toggle" aria-label="Modo foco" aria-pressed={studyFocus} onClick={() => setSettings({ studyFocus: !studyFocus })}>Foco</button>
        </div>
        {q.where && q.estilo !== 'fgv' && <LegalReference key={q.where + (q.unitId ?? '')} where={q.where} unitId={q.unitId} />}
      </header>
      <div className="question-body" ref={body}>
        <motion.div key={q.id} initial={reducedMotion() ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={spring} className="stack question-content">
          {q.contexto && <div className="card elev"><CType k="hipotetico" /><p style={{ marginTop: 8, lineHeight: 1.55 }}>{q.contexto}</p></div>}
          <MascotQuestion text={q.enunciado} />
          {q.contextoLegal && <div className="law-art law muted" style={{ whiteSpace: 'pre-line' }}>{q.contextoLegal}</div>}
          {q.texto && <div className="law-art law">{q.texto}</div>}
          <div className="study-options" role="group" aria-label="Alternativas">
            {q.estilo === 'cebraspe'
              ? (['C', 'E'] as const).map((v) => <button key={v} className={`opt ${s.respostas[q.id] === v ? 'selected' : ''}`} aria-pressed={s.respostas[q.id] === v} onClick={() => answer(v)}><strong>{v === 'C' ? 'Certo' : 'Errado'}</strong></button>)
              : q.options!.map((o, k) => <button key={o.id} className={`opt ${s.respostas[q.id] === o.id ? 'selected' : ''}`} aria-pressed={s.respostas[q.id] === o.id} onClick={() => answer(o.id)}><span className="opt-key">{letra(k)}</span><span className="grow">{o.text}</span></button>)}
          </div>
        </motion.div>
      </div>
      <div className="answer-dock row" style={{ gap: 10 }}>
        <button className="btn btn-quiet" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
        {i < s.questoes.length - 1 ? <button className="btn btn-primary grow" onClick={() => setI(i + 1)}>Próxima</button> : <button className="btn btn-primary grow" disabled={saving} onClick={() => setConfirm(true)}>{saving ? 'Calculando…' : 'Finalizar'}</button>}
      </div>
      <Sheet open={grid} onClose={() => setGrid(false)} label="Questões">
        <div className="title-m" style={{ marginBottom: 10 }}>Questões</div>
        <div className="mapgrid">{s.questoes.map((qq, k) => <button key={qq.id} className={`cell ${s.respostas[qq.id] ? 'l4' : 'l0'}`} onClick={() => { setI(k); setGrid(false); }}>{k + 1}</button>)}</div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => { setGrid(false); setConfirm(true); }}>Finalizar simulado</button>
      </Sheet>
      <Sheet open={exit} onClose={() => setExit(false)} label="Sair do simulado">
        <div className="title-m">Sair do simulado?</div>
        <p className="small muted" style={{ margin: '8px 0 14px' }}>Suas respostas ficam em Simulados anteriores.{s.tempoMin ? ' O relógio da prova continua correndo.' : ''}</p>
        <button className="btn btn-primary btn-block" onClick={() => nav.back()}>Sair e voltar depois</button>
      </Sheet>
      <Sheet open={confirm} onClose={() => setConfirm(false)} label="Finalizar">
        <div className="title-m">Finalizar o simulado?</div>
        <p className="small muted" style={{ margin: '8px 0 14px' }}>{blank} {blank === 1 ? 'questão' : 'questões'} em branco.</p>
        <button className="btn btn-primary btn-block" onClick={() => { setConfirm(false); void finish(); }}>Ver resultado</button>
      </Sheet>
    </div>
  );
}

function SimuladoResult({ s }: { s: Simulado }) {
  const c = useMemo(() => corrigir(s), [s]);
  const errors = useMemo(() => simuladoErrors(s), [s]);
  const pct = c.total ? c.certas / c.total : 0;
  const groups = desempenhoDisciplinas(s);
  const weakest = groups.find((group) => group.erradas + group.branco > 0);
  const practiceSubject = (topic: string) => {
    if (!s.area || s.area === 'geral') return;
    const answers = s.questoes.filter((q) => q.disciplina === topic && !isSimuladoAnswerCorrect(q, s.respostas[q.id]));
    const articles = [...new Set(answers.flatMap((q) => q.articleId ? [q.articleId] : []))];
    nav.push({ name: 'session', config: {
      area: s.area, focus: `topico:${topic}`, mode: 'memorizar', minutes: 10, title: 'Treino da disciplina', order: 'linear',
      articleIds: articles.length ? articles : undefined,
      practiceCardIds: answers.filter((q) => !!s.respostas[q.id]).map((q) => q.conceptId ? `C:${q.conceptId}` : q.id), revenge: true,
    } });
  };
  const [only, setOnly] = useState<'todas' | 'erradas'>('erradas');
  const list = s.questoes.filter((q) => only === 'todas' || !isSimuladoAnswerCorrect(q, s.respostas[q.id]));
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Resultado do simulado" sub={`${s.title || ESTILOS.find((x) => x.id === s.estilo)?.label} · ${c.total} questões`} />
      <div className="row" style={{ gap: 12 }}>
        <Mascot mood={pct >= 0.7 ? 'cheer' : pct >= 0.5 ? 'happy' : 'think'} size={80} />
        <div className="bubble grow">{pct >= 0.7 ? 'Você acertou a maior parte deste treino.' : pct >= 0.5 ? 'Bom caminho. Revise os erros abaixo — eles já entraram na sua repetição espaçada.' : 'Os erros de hoje são os acertos da prova. Bora revisar com calma.'}</div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{c.certas}</div><div className="xsmall muted">acertos</div></div>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{c.erradas}</div><div className="xsmall muted">erros</div></div>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{s.estilo === 'cebraspe' ? c.liquida : `${Math.round(pct * 100)}%`}</div><div className="xsmall muted">{s.estilo === 'cebraspe' ? 'nota líquida' : 'aproveitamento'}</div></div>
      </div>
      {!!errors.length && <button className="btn btn-primary btn-block" onClick={() => nav.push({
        name: 'session', retryItems: errors, config: { area: s.area, focus: 'auto', mode: 'memorizar', minutes: 0, activity: 'retry', title: 'Revisão dos erros' },
      })}><IPlay size={17} /> Refazer {errors.length} {errors.length === 1 ? 'erro' : 'erros'} agora</button>}
      {s.edital && (
        <section className="contest-panel" aria-label="Critérios do recorte do edital">
          <h2 className="title-s">Resultado por bloco</h2>
          {EDITAL_SIMULADO[s.edital].blocks.map((block) => {
            const questions = s.questoes.filter((q) => q.bloco === block.id);
            const right = questions.filter((q) => q.options?.some((o) => o.correct && o.id === s.respostas[q.id])).length;
            return <div className="row between small" key={block.id}><span>{block.label}</span><strong>{right}/{questions.length}</strong>{block.minimum !== null && <span className={right >= block.minimum ? 'contest-right' : 'muted'}>Mínimo {block.minimum}</span>}</div>;
          })}
          <p className="xsmall muted">Referência da ampla concorrência no bloco coberto. A classificação depende da prova completa.</p>
        </section>
      )}
      {groups.length > 0 && (
        <section className="contest-panel" aria-label="Desempenho por disciplina">
          <h2 className="title-s">Desempenho por disciplina</h2>
          {weakest && (
            <div className="edital-note">
              <strong>Maior perda de pontos em {weakest.label}</strong>
              <button className="btn btn-primary btn-block" onClick={() => practiceSubject(weakest.topic)}><IPlay size={16} /> Treinar {weakest.label}</button>
            </div>
          )}
          <div className="list">
            {groups.map((group) => <div className="list-item" key={group.topic}>
              <div className="grow"><strong>{group.label}</strong><small className="muted">{group.certas}/{group.total} acertos · {group.erradas} {group.erradas === 1 ? 'erro' : 'erros'} · {group.branco} em branco</small></div>
              {group.erradas + group.branco > 0 && group.topic !== weakest?.topic && <button className="btn btn-sm btn-quiet" onClick={() => practiceSubject(group.topic)}>Treinar</button>}
            </div>)}
          </div>
        </section>
      )}
      <Segmented label="Filtrar" value={only} options={[{ id: 'erradas', label: 'Erros e brancos' }, { id: 'todas', label: 'Todas' }]} onChange={setOnly} />
      {list.map((q) => {
        const k = s.questoes.indexOf(q);
        const a = s.respostas[q.id];
        const art = q.articleId ? getArticle(q.articleId) : null;
        const ok = isSimuladoAnswerCorrect(q, a);
        return (
          <div key={q.id} className="card stack" style={{ gap: 8 }}>
            <div className="row between"><span className="badge badge-gold">Questão {k + 1}</span>{!a ? <span className="badge badge-muted">em branco</span> : ok ? <span className="badge badge-ok"><ICheck size={12} /> acertou</span> : <span className="badge badge-bad"><IX size={12} /> errou</span>}</div>
            {q.contexto && <p className="small muted">{q.contexto}</p>}
            <p className="small" style={{ fontWeight: 620 }}>{q.enunciado}</p>
            {q.contextoLegal && <p className="small muted" style={{ whiteSpace: 'pre-line' }}>{q.contextoLegal}</p>}
            {q.texto && <p className="small law" style={{ fontSize: 14.5 }}>{q.texto}</p>}
            {q.estilo === 'cebraspe' ? (
              <p className="small">Gabarito: <strong>{q.ce === 'C' ? 'Certo' : 'Errado'}</strong>{a ? ` · sua resposta: ${a === 'C' ? 'Certo' : 'Errado'}` : ''}{q.mutation && <><br /><CType k="incorreto" /> {q.mutation.note}</>}</p>
            ) : (
              q.options!.map((o, j) => <p key={o.id} className="small" style={{ color: o.correct ? 'var(--ok)' : o.id === a ? 'var(--bad)' : 'var(--text-2)', lineHeight: 1.45 }}><strong>{letra(j)})</strong> {o.text}{(o.correct || o.id === a) && o.why ? <span className="xsmall" style={{ display: 'block', opacity: 0.85 }}>{o.why}</span> : null}</p>)
            )}
            {q.officialText && <div className="law-art" style={{ padding: 12 }}><CType k="oficial" /><p className="law" style={{ fontSize: 15, marginTop: 6 }}>{q.officialText}</p></div>}
            {art && <button className="small gold" style={{ alignSelf: 'flex-start' }} onClick={() => nav.push({ name: 'article', id: art.art.id, unitId: q.unitId })}>{articleTitle(art.law.id, art.art)} ›</button>}
            {q.conceptId && <span className="xsmall muted">Fundamentação: {CONCEPTS.find((x) => x.id === q.conceptId)?.refs.map((r) => `${r.law} art. ${r.art}`).join(', ')}</span>}
          </div>
        );
      })}
      <button className="btn btn-primary btn-block" onClick={() => nav.replace({ name: 'jogar', mode: 'simulado' })}>Novo simulado</button>
    </div>
  );
}
