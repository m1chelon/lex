import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { corpusVersion, onCorpus, prepareCorpus } from './data/corpus';
import { loadCalibration } from './learn/scheduler';
import { nav, useNav, type Route, type Tab } from './ui/nav';
import { Toaster, spring, useAsync } from './ui/primitives';
import { haptic, reducedMotion, useSettings } from './ui/settings';
import { Mascot } from './ui/Mascot';
import { Constellation } from './ui/Constellation';
import { startAmbient } from './ui/ambient';
import { PomodoroIsland } from './ui/Pomodoro';
import { Tour } from './ui/Tour';
import { WeatherLayer } from './ui/WeatherLayer';
import { IBook, IClipboard, IHome, IPlay, IProgressChart, IScale, IUser } from './ui/icons';
import { loadSession } from './learn/session';
import { TermSheet } from './screens/TermSheet';
import { Home } from './screens/Home';
import { VadeHome, RamoScreen, LawLibraryScreen, LawScreen, ArticleScreen, SearchScreen, FavoritesScreen } from './screens/Vade';
import { MapScreen } from './screens/MapScreen';
import { Me } from './screens/Me';
import { SessionScreen } from './screens/Session';
import { LessonScreen } from './screens/Lesson';
import { CompareScreen } from './screens/Compare';
import { GlossaryScreen } from './screens/Glossary';
import { ConceptsScreen } from './screens/Concepts';
import { AdminScreen } from './screens/Admin';
import { SimuladoConfig, SimuladoRun } from './screens/Simulado';
import { ForestScreen } from './screens/Forest';
import { PontoScreen } from './screens/Ponto';
import { LegalScreen } from './screens/Legal';
import { JogarScreen } from './screens/Jogar';
import { ConcursosScreen, CursoScreen } from './screens/Cursos';
import { DoctrineCatalog, DoctrineCourseScreen } from './screens/DoctrineCourses';
import { PlannerScreen } from './screens/Planner';
import { CapiShop } from './screens/CapiShop';
import { ProfilesScreen } from './screens/Profiles';

export function useCorpusVersion() { return useSyncExternalStore(onCorpus, corpusVersion); }

const TABS: { id: Tab; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: 'home', label: 'Início', Icon: IHome },
  { id: 'direito', label: 'Direito', Icon: IScale },
  { id: 'cursos', label: 'Concursos', Icon: IClipboard },
  { id: 'formacao', label: 'Cursos', Icon: IBook },
  { id: 'map', label: 'Progresso', Icon: IProgressChart },
];

function TabScreen({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'home': return <Home />;
    case 'direito': return <VadeHome />;
    case 'cursos': return <ConcursosScreen />;
    case 'formacao': return <DoctrineCatalog />;
    case 'map': return <MapScreen />;
    case 'me': return <Me />;
  }
}

function RouteScreen({ r, active }: { r: Route; active: boolean }) {
  switch (r.name) {
    case 'law': return <LawScreen id={r.id} headingId={r.headingId} />;
    case 'ramo': return <RamoScreen ramo={r.ramo} />;
    case 'biblioteca': return <LawLibraryScreen />;
    case 'article': return <ArticleScreen id={r.id} unitId={r.unitId} />;
    case 'session': return <SessionScreen active={active} resume={r.resume} config={r.config} />;
    case 'lesson': return <LessonScreen id={r.id} />;
    case 'compare': return <CompareScreen id={r.id} />;
    case 'glossary': return <GlossaryScreen />;
    case 'concepts': return <ConceptsScreen topic={r.topic} />;
    case 'admin': return <AdminScreen />;
    case 'search': return <SearchScreen q={r.q} lawId={r.lawId} />;
    case 'favorites': return <FavoritesScreen />;
    case 'simulado': return <SimuladoConfig area={r.area} focus={r.focus} />;
    case 'jogar': return <JogarScreen scope={r.scope} mode={r.mode} adjust={r.adjust} />;
    case 'doutrina-curso': return <DoctrineCourseScreen id={r.id} moduleId={r.moduleId} />;
    case 'planner': return <PlannerRoute active={active} />;
    case 'capi-shop': return <CapiShop />;
    case 'perfis': return <ProfilesScreen />;
    case 'curso': return <CursoScreen id={r.id} />;
    case 'simulado-run': return <SimuladoRun id={r.id} />;
    case 'forest': return <ForestScreen />;
    case 'ponto': return <PontoScreen />;
    case 'legal': return <LegalScreen doc={r.doc} />;
  }
}

function PlannerRoute({ active }: { active: boolean }) {
  const pending = useAsync(loadSession, [active]);
  return <PlannerScreen pending={pending} />;
}

function TabBar({ tab }: { tab: Tab }) {
  const tabBtn = ({ id, label, Icon }: (typeof TABS)[number]) => (
    <button key={id} className="tab" data-tour={`tab-${id}`} aria-current={tab === id ? 'page' : undefined} onClick={() => { haptic('soft'); nav.tab(id); }}>
      {tab === id && <motion.span layoutId="tab-pill" className="tab-pill" transition={reducedMotion() ? { duration: 0 } : spring} />}
      <Icon size={24} />
      <span className="tab-label">{label}</span>
    </button>
  );
  return (
    <nav className="tabbar-wrap" aria-label="Navegação principal">
      <div className="tabbar glass fab-bar">
        <div className="nav-brand"><span className="nav-mark"><IScale size={21} /></span><span>LEX</span></div>
        {TABS.slice(0, 2).map(tabBtn)}
        <button className="tab fab" data-tour="play" onClick={quickPlay}>
          <span className="fab-btn"><IPlay size={24} /></span>
          <span className="tab-label fab-label">Jogar</span>
        </button>
        {TABS.slice(2).map(tabBtn)}
        <button className="tab nav-profile" aria-current={tab === 'me' ? 'page' : undefined} onClick={() => { haptic('soft'); nav.tab('me'); }}>
          {tab === 'me' && <motion.span layoutId="tab-pill" className="tab-pill" transition={reducedMotion() ? { duration: 0 } : spring} />}
          <IUser size={21} /><span className="tab-label">Perfil</span>
        </button>
      </div>
    </nav>
  );
}

/** Abre o treino com as últimas escolhas. */
function quickPlay() {
  haptic('ok');
  nav.push({ name: 'jogar' });
}

export function App() {
  const [ready, setReady] = useState(false);
  const { tab, stack, dir } = useNav();
  const settings = useSettings();
  const backGesture = useDragControls();
  const raf = useRef(0);
  const onScroll = (e: React.UIEvent) => {
    const el = e.target as HTMLElement;
    if (!el.classList?.contains('screen') || raf.current || reducedMotion()) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; document.documentElement.style.setProperty('--sy', String(Math.min(1200, el.scrollTop || 0))); });
  };
  useCorpusVersion();

  useEffect(() => {
    let active = true;
    startAmbient();
    void (async () => {
      await Promise.all([
        loadCalibration().catch(() => {}),
        prepareCorpus().catch((error: unknown) => console.error(error)),
      ]);
      if (!active) return;
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  const top = stack[stack.length - 1];
  const mainId = top ? `lex-route-${stack.length - 1}-${top.name}` : `lex-tab-${tab}`;
  const sessionBelow = stack.findLastIndex((route) => route.name === 'session');
  const routeIndexes = stack.flatMap((route, index) => index === stack.length - 1 || index === sessionBelow
    || ['curso', 'doutrina-curso', 'search', 'planner', 'ramo'].includes(route.name) ? [index] : []);
  const keepCatalog = tab === 'formacao' || tab === 'cursos' || tab === 'direito';
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    document.documentElement.style.setProperty('--sy', '0');
  }, [tab, top]);
  const inSession = top?.name === 'session' || top?.name === 'lesson' || top?.name === 'simulado-run' || top?.name === 'jogar';
  const studying = top?.name === 'session' || top?.name === 'simulado-run' || top?.name === 'lesson';
  useLayoutEffect(() => {
    if (studying) document.documentElement.dataset.study = '1';
    return () => { delete document.documentElement.dataset.study; };
  }, [studying]);
  const rm = reducedMotion();
  const modal = (r?: Route) => !!r && (r.name === 'session' || r.name === 'lesson' || r.name === 'simulado-run' || r.name === 'jogar');
  const ease = [0.32, 0.72, 0, 1] as const;
  const pushSpring = { type: 'spring' as const, stiffness: 390, damping: 39, mass: 0.9 };
  const tabV = {
    initial: (d: number) => ({ opacity: 0, x: rm ? 0 : d * 14 }),
    animate: { opacity: 1, x: 0, transition: { duration: rm ? 0 : .23, ease } },
    exit: (d: number) => ({ pointerEvents: 'none' as const, opacity: 0, x: rm ? 0 : d * -10, transition: { duration: rm ? 0 : .13, ease } }),
  };
  const pushV = {
    initial: (d: number) => ({ opacity: 0, x: rm || modal(top) ? 0 : d * 24, y: !rm && modal(top) ? 16 : 0 }),
    animate: { x: 0, y: 0, opacity: 1, transition: rm ? { duration: 0 } : pushSpring },
    exit: (d: number) => ({ pointerEvents: 'none' as const, x: rm ? 0 : d * -14, opacity: 0, transition: { duration: rm ? 0 : .14, ease } }),
  };

  if (!ready) return <Splash msg="Preparando seu estudo…" />;

  return (
    <div className={`app${inSession ? '' : ' has-tabbar'}${studying ? ' study-ambient' : ''}${studying && settings.studyFocus ? ' focus-study' : ''}`} onScrollCapture={onScroll}>
      <AmbientBackdrop />
      <a href={`#${mainId}`} className="skip-link" onClick={(event) => {
        event.preventDefault();
        document.getElementById(mainId)?.focus({ preventScroll: true });
      }}>Pular para o conteúdo</a>
      <AnimatePresence initial={false} custom={dir}>
        {(!top || keepCatalog) && (
          <motion.main key={`tab-${tab}`} id={`lex-tab-${tab}`} tabIndex={-1} className="screen" data-section={tab} aria-hidden={!!top || undefined} style={{ display: top ? 'none' : undefined }} custom={dir} variants={tabV} initial="initial" animate="animate" exit="exit">
            <div className="wrap"><TabScreen tab={tab} /></div>
          </motion.main>
        )}
        {routeIndexes.map((index) => {
          const route = stack[index];
          const active = route === top;
          const isModal = modal(route);
          return (
            <motion.main
              key={`r-${index + 1}-${route.name}-${'id' in route ? route.id : ''}-${route.name === 'session' ? route.reenter ?? '' : ''}${route.name === 'jogar' ? JSON.stringify([route.scope, route.mode, route.adjust]) : ''}`}
              id={`lex-route-${index}-${route.name}`}
              tabIndex={-1}
              data-route={route.name}
              aria-hidden={!active || undefined}
              className={`screen pushed${isModal ? ' modal' : ''}`}
              style={{ paddingBottom: isModal ? 0 : undefined, display: active ? undefined : 'none' }}
              custom={dir} variants={pushV} initial="initial" animate="animate" exit="exit"
              drag={active && !isModal && !rm ? 'x' : false} dragControls={active && !isModal && !rm ? backGesture : undefined} dragListener={false}
              dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0, right: 0.5 }}
              onPointerDown={(event) => {
                if (!active || isModal || rm || event.pointerType !== 'touch') return;
                const edge = event.currentTarget.getBoundingClientRect().left;
                const control = event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="region"]');
                if (event.clientX - edge <= 20 && !control) backGesture.start(event);
              }}
              onDragEnd={(_e: unknown, i: PanInfo) => { if (active && (i.offset.x > 120 || i.velocity.x > 700)) { haptic('soft'); nav.back(); } }}
            >
              <div className="wrap" style={isModal ? { height: '100%' } : undefined}><RouteScreen r={route} active={active} /></div>
            </motion.main>
          );
        })}
      </AnimatePresence>
      {!inSession && <TabBar tab={tab} />}
      <TermSheet />
      <Tour onFinish={() => quickPlay()} />
      <PomodoroIsland />
      <Toaster />
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="period-glow" />
      <Constellation />
      <div className="stars" />
      <div className="stars s2" />
      <WeatherLayer />
      <div className="ambient-shade" />
    </div>
  );
}

/** Abertura animada: o ícone da Capi sobe com brilho, "LEX" surge letra a letra. */
function Splash({ msg }: { msg: string }) {
  const rm = reducedMotion();
  return (
    <div className="app splash" style={{ display: 'grid', placeItems: 'center' }}>
      <AmbientBackdrop />
      <div style={{ textAlign: 'center', position: 'relative' }} role="status" aria-label={`LEX. ${msg}`}>
        <motion.div className="splash-icon" initial={rm ? false : { scale: 0.6, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }}>
          <Mascot size={112} decorative still />
        </motion.div>
        <div className="splash-word" aria-hidden="true">
          {'LEX'.split('').map((c, i) => <motion.span key={i} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.12, duration: 0.4 }}>{c}</motion.span>)}
        </div>
        <motion.div className="small muted" initial={rm ? false : { opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.8 }}>Direito, um artigo por vez</motion.div>
        <div className="splash-bar"><div /></div>
        <div className="xsmall faint" style={{ marginTop: 10, minHeight: 16 }}>{msg}</div>
      </div>
    </div>
  );
}
