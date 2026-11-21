// Treino por edital e acesso à legislação por matéria.
import { liveQuery } from 'dexie';
import { motion } from 'motion/react';
import { Fragment, useEffect, useState } from 'react';
import { areaLaws, getArea } from '../core/areas';
import { SOURCES } from '../core/sources';
import { articleTitle, coverage, ensureLaws, getArticle, getLaw, getManifest } from '../data/corpus';
import { COURSE_NAME, courseTopics, topicoLabel, usePlan } from '../learn/plan';
import { courseStats, loadCourseProgress, practiceArticles, type CourseProgress, type Practice } from '../learn/courseProgress';
import { loadSession, recentSequences } from '../learn/session';
import { CourseCover } from '../ui/CourseCover';
import { Flag } from '../ui/Flags';
import { TINT } from '../ui/IconTile';
import { lawStyle, SubjectGlyph } from '../ui/ramo';
import { useAmbient } from '../ui/ambient';
import { nav } from '../ui/nav';
import { PageHeader, SectionHeader, toast, useAsync } from '../ui/primitives';
import { haptic, setSettings } from '../ui/settings';
import { IStudy, IBrain, IColumns, IClipboard, IGraduation, IProgressChart, ICheck, IChevR, IExternal, IHistory, IMap, IPlay, ISearch, ITrophy, IX } from '../ui/icons';
import { useCorpusVersion } from '../App';
import { StudyMetrics } from '../ui/StudyMetrics';

export function ConcursosScreen() {
  const version = useCorpusVersion();
  const plan = usePlan();
  const general = plan?.scope.kind === 'geral' ? plan.scope : { kind: 'geral' as const, ramo: 'Constitucional' as const };
  const [coverageByArea, setCoverage] = useState<Partial<Record<'tjsp' | 'tjms', { seen: number; total: number }>>>({});
  useEffect(() => { void ensureLaws([...new Set([...areaLaws('tjsp'), ...areaLaws('tjms')])]); }, []);
  useEffect(() => {
    const sub = liveQuery(async () => {
      const rows = await Promise.all((['tjsp', 'tjms'] as const).map(async (id) => {
        const { required } = coverage(id);
        const data = await loadCourseProgress(id);
        return [id, { seen: courseStats(data, required).seen, total: required.size }] as const;
      }));
      return Object.fromEntries(rows);
    }).subscribe({ next: setCoverage, error: () => {} });
    return () => sub.unsubscribe();
  }, [version]);
  return (
    <div className="stack tab-content">
      <SectionHeader title="Concursos" description="Escolha um edital para montar seu treino." icon={<span className="section-icon contests"><IClipboard /></span>}
        right={<button className="icon-btn glass" aria-label="Buscar no LEX" onClick={() => nav.push({ name: 'search' })}><ISearch size={20} /></button>} />
      <div className="contest-catalog">
      {(['tjsp', 'tjms'] as const).map((id) => {
        const active = plan?.scope.kind === 'curso' && plan.scope.area === id;
        const progress = coverageByArea[id];
        return (
          <motion.button key={id} className={`course${active ? ' active' : ''}`} whileTap={{ scale: 0.98 }} onClick={() => { haptic('tap'); void ensureLaws(areaLaws(id)); nav.push({ name: 'curso', id }); }}>
            <CourseCover kind={id} />
            <span className="row contest-cover-flag"><Flag area={id} width={26} rounded={4} wave />{active && <span className="tag"><ICheck size={12} /> Em estudo</span>}</span>
            <span className="contest-cover-copy">
              <strong>{COURSE_NAME[id]}</strong>
              <small>{progress?.total ? `${Math.round(progress.seen / progress.total * 100)}% da legislação praticada` : `${courseTopics(id).length} disciplinas de legislação`}</small>
              <progress value={progress?.seen ?? 0} max={progress?.total || 1} aria-label="Progresso na legislação do edital" />
            </span>
          </motion.button>
        );
      })}
      <button className="course" onClick={() => { haptic('tap'); nav.push({ name: 'jogar', scope: general }); }}>
        <CourseCover kind="geral" />
        <span className="row contest-cover-flag"><Flag area="geral" width={26} rounded={4} wave /></span>
        <span className="contest-cover-copy">
          <strong>Direito em geral</strong>
          <small>Treine por matéria ou lei</small>
        </span>
      </button>
      </div>
    </div>
  );
}

const PRACTICE = {
  review: { title: 'Revisar', detail: 'Artigos com revisão vencida', Icon: IHistory },
  errors: { title: 'Refazer erros', detail: 'Artigos com erro na última tentativa de algum exercício', Icon: IX },
  memory: { title: 'Memorizar', detail: 'Artigos sem literalidade firme', Icon: IBrain },
} as const;

const COURSE_BLOCKS: Record<string, string> = {
  I: 'Bloco I · Língua Portuguesa',
  II: 'Bloco II · Conhecimentos em Direito',
  III: 'Bloco III · Conhecimentos Gerais',
};

export function CursoScreen({ id }: { id: 'tjsp' | 'tjms' }) {
  const version = useCorpusVersion();
  const { now } = useAmbient();
  const a = getArea(id);
  const cov = coverage(id);
  const manifest = getManifest();
  const nextSequence = useAsync(async () => (await recentSequences()).find(({ config }) => config.area === id) ?? null, [id]);
  const pending = useAsync(loadSession, []);
  const unfinished = pending && !pending.finishedAt && pending.index < pending.items.length;
  const resumeHere = unfinished && pending.config.area === id;
  const nextArticle = nextSequence && getArticle(nextSequence.articleId);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [chosen, setActivity] = useState<Practice>();
  const [limit, setLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [checklist, setChecklist] = useState<{ topico: string; filter: 'pending' | 'seen' | 'review'; limit: number }>();
  useEffect(() => {
    let active = true;
    void ensureLaws(areaLaws(id)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    const subscription = liveQuery(() => loadCourseProgress(id)).subscribe({
      next: (data) => { setProgress(data); setStatsError(false); },
      error: (error) => { console.error(error); setStatsError(true); },
    });
    return () => subscription.unsubscribe();
  }, [id, version, Math.floor(now.getTime() / 60_000)]);
  const stats = progress ? courseStats(progress, cov.required) : null;
  const queues = {
    review: practiceArticles(stats?.articles ?? [], 'review'),
    errors: practiceArticles(stats?.articles ?? [], 'errors'),
    memory: practiceArticles(stats?.articles ?? [], 'memory'),
  };
  const activity = chosen ?? (queues.review.length ? 'review' : queues.errors.length ? 'errors' : 'memory');
  const selected = queues[activity];
  const train = (topico?: string, law?: string) => { haptic('ok'); nav.push({ name: 'jogar', scope: { kind: 'curso', area: id, topico, law }, mode: 'memorizar' }); };
  const practice = (target?: string) => {
    const entries = target ? selected.filter((entry) => entry.id === target) : selected;
    if (!entries.length) return;
    haptic('ok');
    nav.push({ name: 'session', config: {
      area: id,
      mode: 'memorizar',
      focus: 'auto',
      minutes: 10,
      order: 'linear',
      articleIds: entries.slice(0, 64).map((entry) => entry.id),
      practiceCardIds: [...new Set(entries.slice(0, 64).flatMap((entry) => activity === 'memory' ? [] : entry[activity === 'review' ? 'due' : 'errors'].map((card) => card.id)))],
      revenge: activity === 'errors',
      title: PRACTICE[activity].title,
    } });
  };
  const openLaw = async (law: string) => {
    if (!getLaw(law)) await ensureLaws([law]);
    if (!getLaw(law)) { toast('Norma indisponível neste aparelho'); return; }
    nav.push({ name: 'law', id: law });
  };
  const studied = stats?.seen ?? 0;
  const count = cov.required.size;
  const totalAnswers = (stats?.correct ?? 0) + (stats?.wrong ?? 0);
  const available = areaLaws(id).filter((law) => !getLaw(law)).length;
  const subjects = [
    { topico: 'Língua Portuguesa', bloco: id === 'tjsp' ? 'I' : 'Conhecimentos Básicos', laws: [] },
    ...courseTopics(id),
    ...(id === 'tjsp' ? [
      ...['Matemática', 'Informática', 'Raciocínio Lógico'].map((topico) => ({ topico, bloco: 'III', laws: [] })),
      { topico: 'Redação', bloco: 'Prova discursiva', laws: [] },
    ] : []),
  ];
  return (
    <div className="stack contest-detail">
      <PageHeader title={COURSE_NAME[id]} sub={a.subtitle} right={<Flag area={id} width={36} rounded={5} wave />} />

      <section className="contest-cover-header" aria-label="Seu próximo treino">
        <CourseCover kind={id} />
        <div className="contest-cover-copy">
          <strong>{resumeHere ? 'Sessão em andamento' : nextArticle ? `A seguir · ${articleTitle(nextArticle.law.id, nextArticle.art)}` : 'Treine por disciplina'}</strong>
          {resumeHere ? <button className="catalog-primary" onClick={() => nav.push({ name: 'session', resume: true })}><IPlay size={17} /> Retomar sessão</button>
            : nextSequence && nextArticle && !unfinished ? <button className="catalog-primary" onClick={() => nav.push({ name: 'session', config: { ...nextSequence.config, startArticleId: nextSequence.articleId, sequenceSkip: nextSequence.practiced } })}><IPlay size={17} /> Continuar do artigo</button>
            : <a className="catalog-primary" href="#contest-subjects">Ver disciplinas</a>}
        </div>
      </section>

      <section className="contest-panel" aria-labelledby="contest-progress">
        <div className="row between">
          <h2 className="title-m heading-with-icon" id="contest-progress"><IProgressChart size={19} />Seu desempenho</h2>
          {totalAnswers > 0 && <span className="contest-rate">{Math.round((stats!.correct / totalAnswers) * 100)}% de acerto</span>}
        </div>
        {statsError ? <p className="small muted" role="status">Histórico indisponível neste aparelho.</p> : loading || !stats ? <p className="small muted" role="status">Carregando o progresso do edital…</p> : (
          <>
            <div className="contest-metrics">
              <div><strong className="contest-right">{stats.correct}</strong><span>Acertos</span></div>
              <div><strong className="contest-wrong">{stats.wrong}</strong><span>Erros</span></div>
              <div><strong>{stats.firm}</strong><span>Literalidade firme</span></div>
            </div>
            <div className="contest-coverage">
              <label htmlFor="contest-coverage">{studied.toLocaleString('pt-BR')} de {count.toLocaleString('pt-BR')} artigos estudados</label>
              <progress id="contest-coverage" value={studied} max={Math.max(1, count)} />
              {available > 0 && <p className="xsmall muted">{available} {available === 1 ? 'norma indisponível no aparelho' : 'normas indisponíveis no aparelho'}</p>}
              <p className="xsmall muted">Inclui seu histórico nos artigos disponíveis deste edital.</p>
            </div>
          </>
        )}
      </section>

      <button className="pill-cta" onClick={() => train()}>Treinar legislação do edital<span className="go"><IPlay size={16} /></span></button>
      <div className="row">
        <button className="btn btn-quiet grow" onClick={() => { haptic('tap'); setSettings({ area: id }); nav.tab('map'); }}><IMap size={17} /> Mapa do edital</button>
        <button className="btn btn-quiet grow" onClick={() => { haptic('tap'); nav.push({ name: 'jogar', scope: { kind: 'curso', area: id }, mode: 'simulado' }); }}><ITrophy size={17} /> Simulado</button>
      </div>
      {a.edital && (
        <section className="contest-panel" aria-labelledby="contest-edital">
          <div className="row between" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h2 className="title-m heading-with-icon" id="contest-edital"><IClipboard size={19} /> Cobertura do edital</h2>
            <a className="btn btn-sm btn-quiet" href={a.edital.url} target="_blank" rel="noreferrer"><IExternal size={15} /> Edital oficial</a>
          </div>
          {id === 'tjsp' ? <>
            <p className="small muted">O treino cobre os recortes de Direito e do Estatuto da Pessoa com Deficiência previstos no Anexo VIII.</p>
            <details>
              <summary className="small">Data de corte da legislação</summary>
              <p className="small muted">{a.edital.regra}</p>
              <p className="small muted">O Regimento Interno do app inclui os Assentos 597/2026 e 598/2026, posteriores ao edital. O Tomo I das Normas da Corregedoria usa a compilação de 22/10/2026.</p>
            </details>
          </> : <>
            <p className="small muted">O treino de lei seca usa os textos integrais das normas associadas às disciplinas do Anexo I, conforme o edital com a 2ª retificação.</p>
            <p className="small muted">O programa da FGV inclui Língua Portuguesa e tópicos de doutrina e jurisprudência além da lei seca.</p>
          </>}
        </section>
      )}

      {!loading && stats && !statsError && (
        <section className="contest-panel" aria-labelledby="contest-practice">
          <h2 className="title-m" id="contest-practice">O que treinar</h2>
          <div className="contest-queues" role="group" aria-label="Tipo de prática">
            {(Object.keys(PRACTICE) as Practice[]).map((key) => {
              const { title, Icon } = PRACTICE[key];
              return (
                <button key={key} aria-pressed={key === activity} onClick={() => { setActivity(key); setLimit(3); }}>
                  <Icon size={17} /><strong>{queues[key].length.toLocaleString('pt-BR')}</strong><span>{title}</span>
                </button>
              );
            })}
          </div>
          <p className="small muted">{PRACTICE[activity].detail}</p>
          {selected.length ? (
            <>
              <button className="btn btn-primary btn-block" onClick={() => practice()}><IPlay size={17} /> {activity === 'review' ? 'Iniciar revisão' : activity === 'errors' ? 'Treinar pontos fracos' : 'Praticar lei seca'}</button>
              <div className="list">
                {selected.slice(0, limit).map((entry) => {
                  const hit = getArticle(entry.id);
                  if (!hit) return null;
                  const label = activity === 'review' ? `${entry.due.length} a revisar` : activity === 'errors' ? `${entry.errors.length} ${entry.errors.length === 1 ? 'exercício com erro recente' : 'exercícios com erro recente'}` : entry.seen ? 'Em memorização' : 'Não iniciado';
                  return (
                    <button key={entry.id} className="list-item" onClick={() => practice(entry.id)}>
                      <span className="grow"><strong>{articleTitle(hit.law.id, hit.art)}</strong><small className="muted">{label}</small></span><IPlay size={15} />
                    </button>
                  );
                })}
              </div>
              {selected.length > limit && <button className="btn btn-quiet btn-block" onClick={() => setLimit(limit + 8)}>Mostrar mais artigos</button>}
            </>
          ) : <p className="contest-empty">{activity === 'review' ? 'Você está em dia com as revisões.' : activity === 'errors' ? 'Nenhum erro recente para reforçar.' : 'Nenhum artigo pendente de memorização.'}</p>}
        </section>
      )}

      <section className="stack" aria-labelledby="contest-subjects">
        <h2 className="title-m" id="contest-subjects">Disciplinas</h2>
        {subjects.map((d, index) => {
          const title = topicoLabel(d.topico);
          const articles = new Set(cov.items.filter((i) => i.req.topico === d.topico).flatMap((i) => i.articles));
          const hasPractice = d.laws.length > 0;
          const subject = hasPractice && progress ? courseStats(progress, articles) : null;
          const pct = articles.size ? (subject?.seen ?? 0) / articles.size : 0;
          const activeChecklist = checklist?.topico === d.topico ? checklist : undefined;
          const pending = subject?.articles.filter((entry) => !entry.seen) ?? [];
          const toReview = subject?.articles.filter((entry) => entry.due.length || entry.errors.length) ?? [];
          const rows = activeChecklist?.filter === 'pending' ? pending
            : activeChecklist?.filter === 'review' ? toReview : subject?.articles.filter((entry) => entry.seen) ?? [];
          const openChecklist = (filter: NonNullable<typeof checklist>['filter']) => setChecklist(
            activeChecklist?.filter === filter ? undefined : { topico: d.topico, filter, limit: 8 },
          );
          return (
            <Fragment key={d.topico}>
            {subjects[index - 1]?.bloco !== d.bloco && <h3 className="contest-block-title">{COURSE_BLOCKS[d.bloco] ?? d.bloco}</h3>}
            <section className="contest-panel contest-subject">
              <div className="row between contest-subject-head">
                <SubjectGlyph title={title} law={d.laws[0]} />
                <div className="grow">
                  <h4 className="title-s">{title}</h4>
                  <p className="xsmall muted">{hasPractice ? `${subject?.seen ?? 0} de ${articles.size.toLocaleString('pt-BR')} artigos estudados` : 'Ainda sem exercícios no LEX'}</p>
                  {d.topico === 'Atualidades — item 2' && <p className="xsmall muted">Estatuto da Pessoa com Deficiência. Notícias ainda sem treino.</p>}
                </div>
                {hasPractice && <button className="btn btn-sm btn-primary" aria-label={`Treinar ${title}`} disabled={!articles.size} onClick={() => train(d.topico)}><IPlay size={14} /> Treinar</button>}
              </div>
              {hasPractice && <progress aria-label={`Cobertura de ${title}`} value={pct} />}
              {subject && <>
                <StudyMetrics seen={subject.seen} total={articles.size} correct={subject.firstCorrect} attempts={subject.firstTotal} label="Cobertura da disciplina" />
                <div className="chips" role="group" aria-label={`Checklist de ${topicoLabel(d.topico)}`}>
                  <button className="chip" aria-pressed={activeChecklist?.filter === 'pending'} onClick={() => openChecklist('pending')}>Pendentes {pending.length}</button>
                  <button className="chip" aria-pressed={activeChecklist?.filter === 'seen'} onClick={() => openChecklist('seen')}>Praticados {subject.seen}</button>
                  <button className="chip" aria-pressed={activeChecklist?.filter === 'review'} onClick={() => openChecklist('review')}>A revisar {toReview.length}</button>
                </div>
                {activeChecklist && <div className="stack contest-checklist">
                  {rows.length ? <>
                    {activeChecklist.filter !== 'seen' && <button className="btn btn-quiet" onClick={() => nav.push({ name: 'session', config: {
                      area: id, focus: 'auto', mode: 'memorizar', minutes: 10, order: 'linear', title: topicoLabel(d.topico),
                      articleIds: rows.map((entry) => entry.id),
                      ...(activeChecklist.filter === 'review' ? { activity: 'review' as const,
                        practiceCardIds: [...new Set(rows.flatMap((entry) => [...entry.errors, ...entry.due].map((card) => card.id)))].slice(0, 12) } : {}),
                    } })}><IPlay size={16} /> {activeChecklist.filter === 'pending' ? 'Treinar artigos pendentes' : 'Revisar esta disciplina'}</button>}
                    <div className="list">{rows.slice(0, activeChecklist.limit).map((entry) => {
                      const hit = getArticle(entry.id);
                      return <button className="list-item" key={entry.id} onClick={() => nav.push({ name: 'article', id: entry.id })}>
                        <span className="grow">{hit ? articleTitle(hit.law.id, hit.art) : entry.id}</span><IChevR size={16} />
                      </button>;
                    })}</div>
                    {rows.length > activeChecklist.limit && <button className="btn btn-quiet" onClick={() => setChecklist({ ...activeChecklist, limit: activeChecklist.limit + 12 })}>Mostrar mais artigos</button>}
                  </> : <p className="small muted" role="status">Nenhum artigo neste filtro.</p>}
                </div>}
              </>}
              {hasPractice && <details>
                <summary>Normas do edital ({d.laws.length})</summary>
                <div className="list">
                  {d.laws.map((law) => {
                    const s = SOURCES.find((x) => x.id === law);
                    const st = lawStyle(law);
                    const ok = !!getLaw(law) || manifest?.laws.some((m) => m.id === law && m.status === 'ok');
                    return (
                      <div key={law} className="contest-law">
                        <button className="list-item grow" disabled={!ok} onClick={() => void openLaw(law)}>
                          <span className="law-glyph sm" style={{ '--tint': TINT[st.color] } as React.CSSProperties}>{st.icon(16)}</span>
                          <span className="grow"><strong>{s?.short ?? law}</strong><small className="muted">{ok ? s?.title : 'Aguardando importação'}</small></span>
                          <IChevR className="chev" />
                        </button>
                        {ok && <button className="icon-btn" aria-label={`Treinar ${s?.short ?? law} em ${topicoLabel(d.topico)}`} onClick={() => train(d.topico, law)}><IPlay size={16} /></button>}
                      </div>
                    );
                  })}
                </div>
              </details>}
            </section>
            </Fragment>
          );
        })}
      </section>
    </div>
  );
}
