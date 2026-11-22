import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Progress, Segmented, Sheet, useAsync } from '../ui/primitives';
import { nav } from '../ui/nav';
import { haptic, setSettings, useSettings } from '../ui/settings';
import { ISliders, IPunch, ICheck, IChevR, IClock, IFlame, IPlay, ITarget, IHistory, IInfo, ILayers, IBell, IStudy, IBrain, IPuzzle, ITrophy, ICompare, IMap, IBolt, ITomato, ISearch, IClipboard, IBook, ICalendar, ICart } from '../ui/icons';
import { TILE } from '../ui/IconTile';
import { CourseCover, type CoverKind } from '../ui/CourseCover';
import { SubjectGlyph } from '../ui/ramo';
import { Flag } from '../ui/Flags';
import { WeatherChip, Clock } from '../ui/Weather';
import { getPending, updateAppBadge, type Pending } from '../learn/pending';
import { MoodSheet } from '../ui/Wellbeing';
import { COURSE_NAME, planLabel, planToConfig, usePlan } from '../learn/plan';
import { PomodoroSheet } from '../ui/Pomodoro';
import { dayKey } from '../learn/mood';
import { startTour } from '../ui/Tour';
import { LESSONS } from '../content/lessons';
import { COMPARISONS } from '../content/comparisons';
import { getStats } from '../learn/stats';
import { getCareer, careerLabel } from '../learn/career';
import { isStudyQuestion, loadSession, recentSequences, type Mode, type Order, type SessionConfig } from '../learn/session';
import { articleTitle, coverage, ensureLaws, getArticle, getLaw, getManifest } from '../data/corpus';
import { DIMS, kvGet, kvSet } from '../data/db';
import { doctrineQuestion } from '../learn/doctrineCourses';
import { REVIEW_REASON, reviewQueue, type ReviewItem } from '../learn/reviewQueue';
import { CONCEPTS } from '../content/concepts';
import { useCorpusVersion } from '../App';
import { AREAS, RAMOS, getArea, lawsByRamo, areaLaws, type AreaId } from '../core/areas';
import { SOURCES } from '../core/sources';
import { useAmbient, type Period } from '../ui/ambient';
import { Mascot } from '../ui/Mascot';
import { mascotLine } from '../ui/capi';
import { Carousel, FeaturedCarousel } from '../ui/Carousel';
import { plannerConfig, plannerGoalOn, plannerProgress, plannerQuantity, plannerSubject, usePlanner } from '../learn/planner';

export const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'aprender', label: 'Aprender', desc: 'Microaula, glossário e leitura guiada dos artigos.' },
  { id: 'memorizar', label: 'Memorizar', desc: 'Lei seca com lacunas e opções para tocar, com repetição espaçada.' },
  { id: 'casos', label: 'Casos', desc: 'Só situações hipotéticas: identifique o instituto, o crime, a pena ou a consequência.' },
  { id: 'provar', label: 'Provar', desc: 'Sem ajuda, no nível de prova. Escolha lei seca, casos ou ambos.' },
];
const MINUTES = [5, 10, 15, 20, 30];

export function focusLabel(id: string, area: AreaId) {
  if (id === 'auto') return area === 'geral' ? 'Escolha um ramo ou uma lei' : 'Legislação do edital';
  if (id.startsWith('ramo:')) return `Ramo: ${id.slice(5)}`;
  if (id.startsWith('topic-law:')) {
    const [, law, ...topic] = id.split(':');
    const title = SOURCES.find((source) => source.id === law)?.short ?? law;
    return `${topic.join(':').replace(/^\d+\.\s*/, '')} · ${title}`;
  }
  if (id.startsWith('law:')) return SOURCES.find((s) => s.id === id.slice(4))?.title ?? id;
  if (id.startsWith('topico:')) return `Disciplina: ${id.slice(7).replace(/^\d+\.\s*/, '')}`;
  const r = getArea(area === 'geral' ? 'tjsp' : area).requirements.find((x) => x.id === id);
  if (!r) return id;
  const src = SOURCES.find((s) => s.id === r.law);
  return `${r.topico.replace(/^\d+\.\s*/, '')} — ${src?.short ?? r.law}`;
}

const NICE: Record<string, string> = { cf: 'Constituição Federal', cp: 'Código Penal', cpp: 'Código de Processo Penal', cc: 'Código Civil', cpc: 'Código de Processo Civil', ce: 'Código Eleitoral', cdc: 'Código do Consumidor', ctb: 'Código de Trânsito', eca: 'ECA', lep: 'Execução Penal', l9504: 'Lei das Eleições', lc64: 'Lei das Inelegibilidades', efp: 'Estatuto dos Servidores de SP' };

const LAW_COVER: Record<string, CoverKind> = { cf: 'const', cp: 'penal', cpp: 'processoPenal', cpc: 'processoCivil',
  cc: 'civil', ce: 'eleit', cdc: 'consumidor', l14133: 'administrativo', l9784: 'administrativo' };

function displayArticle(id: string) {
  const hit = getArticle(id);
  if (hit) return articleTitle(hit.law.id, hit.art);
  const [law, number] = id.split('.');
  return `${SOURCES.find((source) => source.id === law)?.short ?? law.toUpperCase()}, art. ${number}`;
}

function reviewTitle(item: ReviewItem) {
  const { articleId, conceptId } = item.card;
  if (articleId) return displayArticle(articleId);
  const doctrine = doctrineQuestion(item.card.id);
  if (doctrine) return doctrine.module.title;
  return CONCEPTS.find((concept) => concept.id === conceptId)?.pergunta ?? 'Pegadinhas em dupla';
}

function StudyShelf({ title, children, onAll }: { title: string; children: ReactNode; onAll?: () => void }) {
  return (
    <section className="catalog-shelf" aria-label={title}>
      <div className="row between"><h2>{title}</h2>{onAll && <button className="catalog-text-btn" aria-label={`Ver tudo em ${title}`} onClick={onAll}>Ver tudo</button>}</div>
      {children}
    </section>
  );
}

function greeting(period: Period) {
  return period === 'manha' ? 'Bom dia' : period === 'tarde' ? 'Boa tarde' : 'Boa noite';
}

export function Home() {
  const v = useCorpusVersion();
  const settings = useSettings();
  const plan = usePlan();
  const planConfig = useMemo(() => plan ? planToConfig(plan) : null, [plan, settings.provarMix]);
  const recentPlans = useAsync(recentSequences, []) ?? [];
  const sequence = planConfig && !planConfig.blitz && plan?.mode !== 'simulado' && planConfig.order !== 'misturado'
    ? recentPlans.find(({ config }) => config.area === planConfig.area && config.focus === planConfig.focus
      && config.mode === planConfig.mode && (config.mode !== 'provar' || config.mix === planConfig.mix))
    : undefined;
  const { now, period } = useAmbient();
  const calendarDay = dayKey(now);
  const planner = usePlanner(calendarDay);
  const goal = planner?.plan && plannerGoalOn(planner.plan, calendarDay);
  const goalProgress = goal && planner.task ? plannerProgress(planner.task, goal.target) : null;
  const goalDone = !!goal && (goalProgress?.completed ?? 0) >= goal.target;
  const reviewMinute = Math.floor(now.getTime() / 60_000);
  const reviews = useAsync(() => reviewQueue().catch(() => null), [reviewMinute]);
  const [shelf, setShelf] = useState<'continue' | 'review'>();
  const [reviewLimit, setReviewLimit] = useState(24);
  const dailyConfig = useMemo<SessionConfig>(() => ({
    ...(plan ? planToConfig(plan) : { area: settings.area, focus: settings.area === 'geral' ? 'law:cf' : 'auto' }),
    mode: 'memorizar', minutes: 7, infinite: false, blitz: false, activity: 'daily', title: 'Treino de hoje',
  }), [plan, settings.area]);
  const stats = useAsync(getStats, [v]);
  const career = useAsync(getCareer, [v]);
  const pending = useAsync(() => loadSession().catch(() => null), []);
  const unfinished = pending && pending.index < pending.items.length && !pending.finishedAt ? pending : null;
  const answeredCount = unfinished?.results.filter((r) => r.correct !== null).length ?? 0;
  const questionCount = unfinished?.items.filter(isStudyQuestion).length ?? 0;
  const ready = pending !== undefined && planner !== undefined;
  const line = mascotLine({
    streak: stats?.streak ?? 0, due: stats?.due ?? 0, todayMin: Math.round((stats?.todayMs ?? 0) / 60_000),
    todayCount: stats?.todayCount ?? 0, goal: settings.dailyMinutes, lastPracticeAt: stats?.lastPracticeAt, studying: !!unfinished,
  }, now, period);

  const [notif, setNotif] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [pomo, setPomo] = useState(false);
  const [pv, setPv] = useState(0);
  const todo = useAsync(() => getPending(stats), [stats, v, pv]) ?? [];
  useEffect(() => { updateAppBadge(todo.filter((p) => p.id !== 'tour' && p.id !== 'weather').length); }, [todo]);
  // check-in do fim do dia: abre sozinho no máximo uma vez por dia, a partir das 19h
  useEffect(() => {
    if (new Date().getHours() < 19 || !todo.some((p) => p.id === 'mood')) return;
    void Promise.all([kvGet('moodAsked', ''), kvGet('tourDone', false)]).then(([d, tourDone]) => {
      if (d !== dayKey() && tourDone && !document.querySelector('.tour')) { void kvSet('moodAsked', dayKey()); setTimeout(() => setMoodOpen(true), 900); }
    });
  }, [todo.length]); // eslint-disable-line

  /** Começa com o plano atual (com ajustes); sem plano, abre a configuração do treino. */
  const play = (over: Partial<SessionConfig> = {}) => {
    haptic('ok');
    if (!plan) { nav.push({ name: 'jogar' }); return; }
    if (plan.mode === 'simulado' && !Object.keys(over).length) { nav.push({ name: 'jogar', scope: plan.scope, mode: 'simulado' }); return; }
    nav.push({ name: 'session', config: planToConfig(plan, over) });
  };
  const act = (p: Pending) => {
    haptic('tap'); setNotif(false);
    if (p.id === 'session') nav.push({ name: 'session', resume: true });
    else if (p.id === 'streak') play({ minutes: 5, infinite: false, blitz: false, mode: 'memorizar' });
    else if (p.id === 'due') showShelf('review');
    else if (p.id === 'goal') play({ minutes: Math.min(30, Math.max(5, settings.dailyMinutes - Math.round((stats?.todayMs ?? 0) / 60000))), infinite: false, blitz: false, mode: 'memorizar' });
    else if (p.id === 'mood') setMoodOpen(true);
    else if (p.id === 'ponto') nav.push({ name: 'ponto' });
    else if (p.id === 'doutrina') nav.tab('me');
    else if (p.id === 'weather') (document.querySelector('.weather-chip') as HTMLElement | null)?.click();
    else if (p.id === 'tour') startTour();
  };
  const today = Math.round((stats?.todayMs ?? 0) / 60000);
  const L = plan ? planLabel(plan) : null;
  const [sug, setSug] = useState<'aulas' | 'comparar'>('aulas');
  const resume = () => { haptic('tap'); nav.push({ name: 'session', resume: true }); };
  const startDaily = () => { haptic('ok'); nav.push({ name: 'session', config: dailyConfig }); };
  const startReview = (items: ReviewItem[]) => {
    if (unfinished || !items.length) return;
    haptic('ok');
    setShelf(undefined);
    nav.push({ name: 'session', config: { area: settings.area, focus: 'auto', minutes: 7, mode: 'memorizar', activity: 'review',
      practiceCardIds: items.slice(0, 8).map(({ card }) => card.id), title: 'Minha revisão' } });
  };
  const startSequence = (entry: typeof recentPlans[number]) => {
    if (unfinished) return;
    haptic('ok');
    setShelf(undefined);
    nav.push({ name: 'session', config: { ...entry.config, startArticleId: entry.articleId, sequenceSkip: entry.practiced } });
  };
  const showShelf = (next: 'continue' | 'review') => {
    haptic('tap');
    setReviewLimit(24);
    setShelf(next);
  };
  const nextStudy = (() => {
    if (unfinished) {
      const { config } = unfinished;
      const title = config.title || (config.focus === 'auto'
        ? config.area && config.area !== 'geral' ? COURSE_NAME[config.area] : 'Sessão em andamento'
        : focusLabel(config.focus, config.area ?? 'geral'));
      const detail = questionCount > 0 && !config.infinite ? `${answeredCount} de ${questionCount} questões respondidas`
        : `${unfinished.results.length} ${unfinished.results.length === 1 ? 'atividade feita' : 'atividades feitas'}`;
      return { title, detail, label: 'Continuar estudo', action: resume };
    }
    if (goal && !goalDone) return {
      title: plannerSubject(goal), detail: `Meta de hoje · ${goalProgress?.completed ?? 0} de ${plannerQuantity(goal)}`,
      label: 'Estudar meta de hoje', action: () => nav.push({ name: 'session', config: plannerConfig(calendarDay, goal) }),
    };
    if (sequence && planConfig) return {
      title: displayArticle(sequence.articleId), detail: L?.how ?? 'Treino sequencial',
      label: 'Continuar do artigo', action: () => startSequence({ ...sequence, config: planConfig }),
    };
    if (L) return { title: L.title, detail: `${L.sub} · ${L.how}`, label: 'Começar treino', action: () => play() };
    return { title: 'Treino de hoje', detail: 'Lei seca e revisão · até 7 minutos', label: 'Começar estudo', action: startDaily };
  })();
  const renderSequence = (entry: typeof recentPlans[number]) => {
    const label = displayArticle(entry.articleId);
    const [law] = entry.articleId.split('.');
    const area = entry.config.area;
    return (
      <button className="catalog-tile" key={JSON.stringify([entry.config.area, entry.config.focus, entry.config.mode, entry.config.mix])} disabled={!!unfinished} onClick={() => startSequence(entry)}>
        <span className="catalog-cover"><CourseCover kind={area === 'tjsp' || area === 'tjms' ? area : LAW_COVER[law] ?? 'geral'} /></span>
        <span className="catalog-tile-copy">
          <strong>{label}</strong>
          <small>{area && area !== 'geral' ? COURSE_NAME[area] : NICE[law] ?? 'Direito em geral'} · {MODES.find((mode) => mode.id === entry.config.mode)?.label}</small>
          <span className="catalog-tile-action">Continuar do artigo</span>
        </span>
      </button>
    );
  };
  const renderReview = (item: ReviewItem) => (
    <button className="catalog-tile catalog-review" key={item.card.id} disabled={!!unfinished} onClick={() => startReview([item])}>
      <span className="catalog-tile-copy">
        <span className={`catalog-reason ${item.reason}`}>{REVIEW_REASON[item.reason]}</span>
        <strong>{reviewTitle(item)}</strong>
        <small>{DIMS.find((dim) => dim.id === item.card.dim)?.label}</small>
      </span>
    </button>
  );

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-heading">
          <p className="home-greeting">{greeting(period)}, {settings.name || 'estudante'}</p>
          <h1 className="editorial-title">Seu estudo</h1>
          {career && <p className="home-rank">{careerLabel(career)} <span aria-hidden="true">·</span> {career.xp.toLocaleString('pt-BR')} pts</p>}
        </div>
        <div className="home-status">
          <div className="home-header-actions">
            <button className="glass row home-streak" aria-label={`${stats?.streak ?? 0} dias seguidos. Abrir a folha de ponto`} onClick={() => { haptic('tap'); nav.push({ name: 'ponto' }); }}><IFlame size={18} /><b>{stats?.streak ?? 0}</b></button>
            <button className="icon-btn glass bell" data-tour="bell" aria-label={todo.length ? `Avisos (${todo.length})` : 'Avisos'} onClick={() => { haptic('soft'); setNotif(true); }}>
              <IBell />{todo.filter((p) => p.id !== 'tour').length > 0 && <span className="dot">{Math.min(9, todo.filter((p) => p.id !== 'tour').length)}</span>}
            </button>
            <button className="avatar capi-player-avatar" onClick={() => { haptic('soft'); nav.tab('me'); }} aria-label="Abrir seu perfil"><Mascot size={42} avatar decorative /></button>
          </div>
          <div className="home-weather"><Clock /><WeatherChip /></div>
        </div>
      </header>

      <div className="home-board">
        <section className="home-next" aria-labelledby="home-study-title" data-tour="today">
          <div className="home-next-art" aria-hidden="true"><CourseCover kind="geral" eager /></div>
          <div className="home-next-main">
            <div className="home-next-copy">
              <div className="home-next-title">
                <span className="home-study-icon"><IStudy size={21} /></span>
                <h2 id="home-study-title">{nextStudy.title}</h2>
              </div>
              <p>{nextStudy.detail}</p>
              {unfinished && questionCount > 0 && !unfinished.config.infinite && <Progress value={answeredCount / questionCount} label="Questões respondidas" />}
            </div>
            <button className="btn btn-primary home-next-action" disabled={!ready} onClick={nextStudy.action}>
              <IPlay size={19} /> {nextStudy.label}
            </button>
            {goal && goalDone
              ? <p className="home-goal-status"><ICheck size={16} /> <span>Meta de hoje concluída · {plannerSubject(goal)}</span></p>
              : goal && unfinished
                ? <p className="home-goal-status">Meta de hoje · {plannerSubject(goal)} · {goalProgress?.completed ?? 0} de {plannerQuantity(goal)}</p>
                : !goal && !!stats && <p className="home-goal-status">{today} de {settings.dailyMinutes} min estudados hoje</p>}
          </div>
          <div className="home-next-links" role="group" aria-label="Organizar o estudo">
            <button onClick={() => nav.push({ name: 'planner' })}><ICalendar size={17} /> Planner</button>
            <button onClick={() => nav.push({ name: 'jogar', adjust: true })}><ISliders size={17} /> Ajustar treino</button>
            <button aria-label={reviews?.length ? `Revisões (${reviews.length})` : 'Revisões'} onClick={() => showShelf('review')}>
              <IHistory size={17} /> Revisões {!!reviews?.length && <span className="home-next-review-count">{reviews.length > 99 ? '99+' : reviews.length}</span>}
            </button>
          </div>
        </section>

        <div className="home-tools">
          <button className="home-search glass" onClick={() => nav.push({ name: 'search' })}><ISearch size={20} /><span>Buscar no LEX</span><IChevR size={16} /></button>
        </div>

        <FeaturedCarousel slides={[
        {
          id: 'capi', title: 'Capi', heading: 'Capi', description: line.text,
          action: <button className="featured-action" onClick={() => { haptic('soft'); nav.push({ name: 'capi-shop' }); }}><ICart size={16} /> Loja do Capi</button>,
          art: <div className="capi-study-scene">
            <div className="capi-window"><i /></div>
            <div className="capi-table"><i className="capi-lamp" /></div>
            <div className="capi-character"><Mascot mood={line.mood} size={180} scene decorative /></div>
          </div>,
        },
        {
          id: 'concursos', title: 'Concursos', heading: 'Treino por edital', description: 'Pratique os artigos do TJSP e do TJMS.',
          art: <div className="featured-cover">
            <CourseCover kind="tjsp" />
            <div className="featured-flags" aria-hidden="true"><Flag area="tjsp" width={26} wave /><Flag area="tjms" width={26} wave /></div>
          </div>,
          action: <button className="featured-action" onClick={() => nav.tab('cursos')}><IClipboard size={16} /> Ver concursos</button>,
        },
        {
          id: 'cursos', title: 'Cursos', heading: 'Cursos de doutrina', description: 'Pratique com questões comentadas por tema.',
          art: <div className="featured-cover"><CourseCover kind="civil" /></div>,
          action: <button className="featured-action" onClick={() => nav.tab('formacao')}><IBook size={16} /> Ver cursos</button>,
        },
        ]} />
      </div>

      {recentPlans.length > 0 && <StudyShelf title="Artigos recentes" onAll={() => showShelf('continue')}>
        <Carousel label="Continuar de um artigo">{recentPlans.slice(0, 6).map(renderSequence)}</Carousel>
      </StudyShelf>}

      {plan && (
        <div className="quick-row" data-tour="modes" role="group" aria-label="Atalhos com o seu estudo atual">
          <button className="quick" onClick={() => play({ blitz: true, minutes: 5, infinite: false, mode: 'memorizar' })}><IBolt size={17} /> Relâmpago</button>
          <button className="quick" onClick={() => { haptic('tap'); nav.push({ name: 'jogar', scope: plan.scope, mode: 'simulado' }); }}><ITrophy size={17} /> Simulado</button>
          <button className="quick" onClick={() => { haptic('tap'); setPomo(true); }}><ITomato size={17} /> Pomodoro</button>
        </div>
      )}

      <button className="list-item study-card pair-start" onClick={() => {
        haptic('ok');
        nav.push({ name: 'session', config: { area: 'geral', focus: 'auto', minutes: 5, mode: 'memorizar', title: 'Pegadinhas em dupla', activity: 'pairs' } });
      }}>
        <ICompare size={22} />
        <span className="grow"><strong>Pegadinhas em dupla</strong><small className="muted">Citação × intimação, suspensão × interrupção e reclusão × detenção</small></span>
        <IChevR size={17} />
      </button>
      <section className="home-learn" aria-labelledby="home-learn-title">
        <div className="home-learn-header">
          <h2 id="home-learn-title" className="title-m">Aprenda rápido</h2>
          <Segmented label="Tipo de conteúdo" value={sug} options={[{ id: 'aulas', label: 'Microaulas' }, { id: 'comparar', label: 'Comparativos' }]} onChange={setSug} />
        </div>
        <div className="hcards">
          {sug === 'aulas' && LESSONS.map((l, k) => (
            <button key={l.id} className="scard" onClick={() => nav.push({ name: 'lesson', id: l.id })}>
              <div className="scard-art" style={{ background: TILE[(['peri', 'teal', 'violet', 'orange', 'blue', 'rose'] as const)[k % 6]] }}><span className="scard-chip"><IClock size={12} /> {l.minutos} min</span><span className="big-ico"><ILayers size={46} /></span></div>
              <div className="scard-title">{l.titulo}</div><div className="scard-sub">{l.subtitulo}</div>
            </button>))}
          {sug === 'comparar' && COMPARISONS.map((c, k) => (
            <button key={c.id} className="scard" onClick={() => nav.push({ name: 'compare', id: c.id })}>
              <div className="scard-art" style={{ background: TILE[(['violet', 'blue', 'teal', 'rose', 'orange', 'peri'] as const)[k % 6]] }}><span className="scard-chip">Tabela</span><span className="big-ico"><ICompare size={46} /></span></div>
              <div className="scard-title">{c.titulo}</div>
            </button>))}
        </div>
      </section>

      {!!reviews?.length && <StudyShelf title="Revisar erros e questões salvas" onAll={() => showShelf('review')}>
        <Carousel label="Questões para revisar">{reviews.slice(0, 6).map(renderReview)}</Carousel>
      </StudyShelf>}

      <Sheet open={!!shelf} onClose={() => setShelf(undefined)} label={shelf === 'review' ? 'Minha revisão' : 'Continue estudando'} tall>
        <div className="stack">
          <h2 className="title-m">{shelf === 'review' ? 'Minha revisão' : 'Continue estudando'}</h2>
          {shelf === 'review' && (reviews === undefined
            ? <p className="muted small" role="status">Carregando revisões…</p>
            : reviews === null
              ? <p className="empty" role="status">Não foi possível carregar as revisões. Tente novamente ao voltar ao início.</p>
              : reviews.length === 0 && <p className="empty">Você está em dia. Seus erros e questões salvas aparecem aqui.</p>)}
          {unfinished && (shelf !== 'review' || !!reviews?.length) && <p className="small muted">Encerre a sessão em andamento para começar outro treino.</p>}
          {shelf === 'review' && !!reviews?.length && <button className="btn btn-quiet" disabled={!!unfinished} onClick={() => startReview(reviews)}>Revisar {Math.min(8, reviews.length)} {reviews.length === 1 ? 'questão' : 'questões'}</button>}
          <div className="catalog-all">{shelf === 'review' ? reviews?.slice(0, reviewLimit).map(renderReview) : recentPlans.map(renderSequence)}</div>
          {shelf === 'review' && reviews && reviews.length > reviewLimit && <button className="btn btn-quiet" onClick={() => setReviewLimit(reviewLimit + 24)}>Mostrar mais questões</button>}
        </div>
      </Sheet>

      <Sheet open={notif} onClose={() => setNotif(false)} label="Avisos" tall>
        <div className="stack" style={{ gap: 12 }}>
          <div className="title-m">Avisos</div>
          {!todo.length && <div className="empty small">Tudo em dia. A Capi está orgulhosa!</div>}
          <div className="list">
            {todo.map((p) => (
              <button key={p.id} className="list-item" onClick={() => act(p)}>
                <span className={`notif-dot${p.urgent ? ' urgent' : ''}`} />
                <div className="grow"><div style={{ fontWeight: 650 }}>{p.title}</div><div className="xsmall muted">{p.text}</div></div>
                <span className="small gold" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{p.cta}</span>
              </button>
            ))}
          </div>
          <BadgeToggle count={todo.filter((p) => p.id !== 'tour' && p.id !== 'weather').length} />
        </div>
      </Sheet>
      <PomodoroSheet open={pomo} onClose={() => setPomo(false)} />
      <MoodSheet open={moodOpen} onClose={() => setMoodOpen(false)} onSaved={() => setPv((x) => x + 1)} />
    </div>
  );
}

export function FocusList({ area, value, onPick }: { area: AreaId; value: string; onPick: (f: string) => void }) {
  const cov = coverage(area);
  if (area === 'geral') {
    return (
      <div className="stack" style={{ gap: 14 }}>
        {RAMOS.map((r) => (
          <section key={r}>
            <h3 className="caps heading-with-icon" style={{ margin: '0 4px 6px' }}><SubjectGlyph title={r} small />{r}</h3>
            <div className="list">
              <button className="list-item" onClick={() => onPick(`ramo:${r}`)} style={{ background: value === `ramo:${r}` ? 'var(--gold-soft)' : undefined }}><div className="grow small" style={{ fontWeight: 650 }}>Todo o ramo ({lawsByRamo(r).length} normas)</div></button>
              {lawsByRamo(r).map((id) => { const s = SOURCES.find((x) => x.id === id)!; const ok = getManifest()?.laws.find((m) => m.id === id)?.status === 'ok'; return (
                <button key={id} className="list-item" disabled={!ok} onClick={() => onPick(`law:${id}`)} style={{ background: value === `law:${id}` ? 'var(--gold-soft)' : undefined, opacity: ok ? 1 : 0.5 }}>
                  <div className="grow"><div className="small" style={{ fontWeight: 600 }}>{s.short}</div><div className="xsmall muted">{ok ? s.title : 'Aguardando importação'}</div></div>
                </button>); })}
            </div>
          </section>
        ))}
      </div>
    );
  }
  const reqs = getArea(area).requirements;
  const topics = [...new Set(reqs.map((r) => r.topico))];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="list"><button className="list-item" onClick={() => onPick('auto')} style={{ background: value === 'auto' ? 'var(--gold-soft)' : undefined }}><div className="grow small" style={{ fontWeight: 650 }}>Legislação do edital</div></button></div>
      {topics.map((t) => (
        <section key={t}>
          <h3 className="caps heading-with-icon" style={{ margin: '0 4px 6px' }}><SubjectGlyph title={t} small />{t.replace(/^\d+\.\s*/, '')}</h3>
          <div className="list">
            <button className="list-item" onClick={() => onPick(`topico:${t}`)} style={{ background: value === `topico:${t}` ? 'var(--gold-soft)' : undefined }}>
              <div className="grow small" style={{ fontWeight: 650 }}>Toda a disciplina</div>
            </button>
            {reqs.filter((r) => r.topico === t).map((r) => {
              const it = cov.items.find((x) => x.req.id === r.id);
              return (
                <button key={r.id} className="list-item" onClick={() => onPick(r.id)} style={{ background: value === r.id ? 'var(--gold-soft)' : undefined }}>
                  <div className="grow"><div className="small" style={{ fontWeight: 600 }}>{SOURCES.find((s) => s.id === r.law)?.short ?? r.law}</div>
                    <div className="xsmall muted">{it?.articles.length ? `${it.articles.length} artigos` : 'Toque para baixar / aguardando importação'}</div></div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Número de pendências no ícone do app (iOS 16.4+ com o LEX na tela de início). */
function BadgeToggle({ count }: { count: number }) {
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  if (perm === 'unsupported') return <p className="xsmall faint">Para ver o número de avisos no ícone do app, instale o LEX na tela de início (iOS 16.4 ou mais novo).</p>;
  if (perm === 'granted') return <p className="xsmall faint">O número de avisos aparece no ícone do LEX na tela de início.</p>;
  return (
    <button className="btn btn-quiet btn-sm" onClick={async () => { try { const r = await Notification.requestPermission(); setPerm(r); if (r === 'granted') updateAppBadge(count); } catch { /* sem suporte */ } }}>
      Mostrar o número de avisos no ícone do app
    </button>
  );
}
