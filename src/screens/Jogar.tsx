import { useState } from 'react';
import { RAMOS, areaLaws, lawsByRamo, type AreaId } from '../core/areas';
import { SOURCES, type Ramo } from '../core/sources';
import { getLaw, getManifest } from '../data/corpus';
import { COURSE_NAME, GUIDED_MEMORY_SECONDS, MODE_INFO, courseTopics, getPlan, planLabel, planToConfig, savePlan, scopeToFocus, topicoLabel, type Plan, type PlanMode, type PlanScope } from '../learn/plan';
import { DEFAULT_ARTICLE_ORDER, loadSequence, loadSession, scopeArticles, type SessionConfig } from '../learn/session';
import { Flag } from '../ui/Flags';
import { TINT } from '../ui/IconTile';
import { PomodoroSheet } from '../ui/Pomodoro';
import { nav } from '../ui/nav';
import { Segmented, toast, useAsync } from '../ui/primitives';
import { SubjectGlyph } from '../ui/ramo';
import { haptic, useSettings } from '../ui/settings';
import { IBolt, IBrain, ICheck, IColumns, IClose, IHistory, IPlay, IPuzzle, ISliders, IStudy, ITarget, ITomato, ITrophy } from '../ui/icons';
import { SimuladoFields, SimuladoHistory, useSimuladoSetup } from './Simulado';

const MODES = {
  aprender: { Icon: IStudy, tint: TINT.teal, label: 'Artigos com pontos-chave destacados' },
  memorizar: { Icon: IBrain, tint: TINT.violet, label: 'Uma a três lacunas por dispositivo' },
  'memorizar-guiada': { Icon: IBrain, tint: TINT.teal, label: `Na ordem: lê o trecho por ${GUIDED_MEMORY_SECONDS} s e completa` },
  casos: { Icon: IPuzzle, tint: TINT.orange, label: 'Situações práticas' },
  provar: { Icon: ITarget, tint: TINT.rose, label: 'Digite a resposta da lei seca' },
  relampago: { Icon: IBolt, tint: TINT.gold, label: '20 questões rápidas' },
  simulado: { Icon: ITrophy, tint: TINT.green, label: 'Prova com nota' },
} satisfies Record<PlanMode, { Icon: typeof IStudy; tint: string; label: string }>;

const AREAS = [
  { id: 'geral', title: 'Direito em geral' },
  { id: 'tjsp', title: COURSE_NAME.tjsp },
  { id: 'tjms', title: COURSE_NAME.tjms },
] as const;

const DEFAULT_SCOPE: PlanScope = { kind: 'geral', ramo: 'Constitucional', law: 'cf' };
const MINUTES = [5, 10, 15, 20, 30, 'inf'] as const;
const isReady = (id: string) => getLaw(id) || getManifest()?.laws.some((law) => law.id === id && law.status === 'ok');
const lawName = (id: string) => SOURCES.find((law) => law.id === id)?.short ?? id;

export function JogarScreen({ scope: preset, mode: presetMode, adjust }: { scope?: PlanScope; mode?: PlanMode; adjust?: boolean }) {
  const settings = useSettings();
  const previous = getPlan();
  const [scope, setScope] = useState<PlanScope>(() => preset ?? previous?.scope ?? (settings.area === 'geral' ? DEFAULT_SCOPE : { kind: 'curso', area: settings.area }));
  const [mode, setMode] = useState(presetMode ?? previous?.mode ?? 'memorizar');
  const [minutes, setMinutes] = useState<number | 'inf'>(previous?.minutes ?? settings.dailyMinutes);
  const [order, setOrder] = useState(previous?.order ?? DEFAULT_ARTICLE_ORDER);
  const [pomo, setPomo] = useState(false);
  // Ponto de partida no modo sequencial: de onde parou, do primeiro artigo ou de um artigo escolhido.
  const [startFrom, setStartFrom] = useState<'continuar' | 'inicio' | 'artigo'>('continuar');
  const [startNum, setStartNum] = useState('');
  const [adjusting, setAdjusting] = useState(!!adjust || presetMode === 'simulado');
  const pending = useAsync(() => loadSession().catch(() => null), []);
  const unfinished = pending && pending.index < pending.items.length && !pending.finishedAt ? pending : null;
  const prioritiseResume = !!unfinished && !preset && !presetMode && !adjusting;
  const plan: Plan = { scope, mode, minutes, order };
  const label = planLabel(plan);
  const { area, focus } = scopeToFocus(scope);
  const simulado = useSimuladoSetup(area, focus);
  const topics = scope.kind === 'curso' ? courseTopics(scope.area) : [];
  const laws = (scope.kind === 'geral'
    ? lawsByRamo(scope.ramo)
    : scope.topico ? topics.find((topic) => topic.topico === scope.topico)?.laws ?? [] : areaLaws(scope.area)
  ).filter(isReady);
  const canStart = !!(scope.law ? laws.includes(scope.law) : laws.length);
  const subject = scope.kind === 'geral' ? scope.ramo : scope.topico;
  const timed = mode !== 'relampago' && mode !== 'simulado';
  const changeScope = (next: PlanScope) => { haptic('soft'); setScope(next); };
  const chooseArea = (next: AreaId) => {
    if (next !== area) changeScope(next === 'geral' ? DEFAULT_SCOPE : { kind: 'curso', area: next });
  };
  const resume = () => { haptic('ok'); nav.replace({ name: 'session', resume: true }); };
  const start = () => {
    if (!canStart || simulado.busy) return;
    if (mode === 'simulado') {
      void simulado.start(() => savePlan(plan));
      return;
    }
    haptic('ok');
    const config = planToConfig(plan, scope.kind === 'curso' && scope.topico ? { title: label.title } : {});
    void startingPoint(config).then((over) => {
      if (over === null) return;
      nav.replace({ name: 'session', plan, config: { ...config, ...over } });
    });
  };
  const sequential = timed && (order === 'linear' || mode === 'memorizar-guiada');
  /** Configuração do ponto de partida; null quando o artigo digitado não está no recorte. */
  const startingPoint = async (config: SessionConfig): Promise<Partial<SessionConfig> | null> => {
    if (!sequential) return {};
    const ids = await scopeArticles({ ...config, startArticleId: undefined }, 0);
    if (startFrom === 'inicio') return ids[0] ? { startArticleId: ids[0], sequenceSkip: undefined, backfillThrough: undefined, chosenStart: true } : {};
    if (startFrom === 'artigo') {
      const wanted = startNum.toLowerCase().replace(/art(?:igo)?\.?/u, '').replace(/[ºo°\s]/gu, '').replace(/^0+/u, '');
      const match = (id: string) => id.slice(id.indexOf('.') + 1).toLowerCase() === wanted;
      const found = ids.find((id) => match(id) && (!scope.law || id.startsWith(`${scope.law}.`))) ?? ids.find(match);
      if (!wanted || !found) {
        toast(`O art. ${startNum || '?'} não está neste recorte. Confira o número ou escolha outra lei.`);
        return null;
      }
      return { startArticleId: found, sequenceSkip: undefined, backfillThrough: undefined, chosenStart: true };
    }
    const saved = await loadSequence(config);
    return saved ? { startArticleId: saved.articleId, sequenceSkip: saved.practiced, backfillThrough: saved.config?.backfillThrough } : {};
  };
  const firstLaw = scope.law ?? laws[0];

  return (
    <div className="jogar">
      <header className="row between jg-header">
        <h1>Jogar</h1>
        <button className="icon-btn glass" aria-label="Fechar" onClick={() => nav.back()}><IClose /></button>
      </header>
      <div className="jg-scroll">
        <section className="jg-panel jg-brief" aria-labelledby="jg-brief">
          {prioritiseResume && unfinished ? (
            <>
              <h2 id="jg-brief" className="heading-with-icon"><IHistory size={18} /> Sessão em andamento</h2>
              <p className="jg-brief-title">{unfinished.config.title || 'Continue de onde parou'}</p>
              <p className="small muted">{unfinished.results.length} {unfinished.results.length === 1 ? 'atividade feita' : 'atividades feitas'}</p>
            </>
          ) : (
            <>
              <h2 id="jg-brief">Seu treino</h2>
              <p className="jg-brief-title heading-with-icon">
                {subject && <SubjectGlyph title={subject} law={scope.law ?? laws[0]} small />}
                {label.title}
              </p>
              <p className="small muted">{label.sub}</p>
              <p className="small">{label.how}{timed && ` · ${order === 'linear' || mode === 'memorizar-guiada' ? 'Sequencial' : 'Aleatório'}`}</p>
              {sequential && canStart && (
                <div className="jg-start" role="group" aria-labelledby="jg-start">
                  <h3 id="jg-start" className="small muted">Começar</h3>
                  <Segmented label="Começar" value={startFrom} options={[
                    { id: 'continuar', label: 'Continuar' },
                    { id: 'inicio', label: 'Do início' },
                    { id: 'artigo', label: 'Escolher art.' },
                  ]} onChange={setStartFrom} />
                  {startFrom === 'artigo' && (
                    <label className="stack" style={{ gap: 4, marginTop: 8 }}>
                      <span className="small muted">Número do artigo{firstLaw && getLaw(firstLaw) ? ` (${getLaw(firstLaw)!.short})` : ''}</span>
                      <input className="input" inputMode="text" placeholder="Ex.: 7, 144, 104-A" value={startNum} onChange={(e) => setStartNum(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') start(); }} />
                    </label>
                  )}
                </div>
              )}
              {unfinished && !adjusting && <button className="btn btn-quiet" onClick={resume}><IHistory size={17} /> Continuar sessão em andamento</button>}
              {!canStart && !adjusting && <p className="small muted" role="status">Escolha um conteúdo com normas disponíveis.</p>}
            </>
          )}
          <button className="btn btn-quiet jg-adjust" aria-expanded={adjusting} aria-controls="jg-options" onClick={() => {
            haptic('soft');
            setAdjusting(!adjusting);
          }}><ISliders size={18} /> {adjusting ? 'Recolher opções' : 'Ajustar treino'}</button>
        </section>
        <div className="jg-options" id="jg-options" hidden={!adjusting}>
          {adjusting && <>
            <section className="jg-panel" aria-labelledby="jg-content">
              <h2 className="heading-with-icon" id="jg-content"><IColumns size={17} />Conteúdo</h2>
              <div className="jg-areas" role="group" aria-label="Área de estudo">
                {AREAS.map(({ id, title }) => (
                  <button type="button" key={id} className="jg-area" aria-pressed={area === id} onClick={() => chooseArea(id)}>
                    <Flag area={id} width={25} rounded={4} /><span>{title}</span>
                  </button>
                ))}
              </div>
              <div className="jg-selects">
                {scope.kind === 'geral' ? (
                  <label>Ramo<select value={scope.ramo} onChange={(e) => changeScope({ kind: 'geral', ramo: e.target.value as Ramo })}>
                    {RAMOS.filter((ramo) => ramo === scope.ramo || lawsByRamo(ramo).some(isReady)).map((ramo) => <option key={ramo}>{ramo}</option>)}
                  </select></label>
                ) : (
                  <label>Disciplina<select value={scope.topico ?? ''} onChange={(e) => changeScope({ kind: 'curso', area: scope.area, topico: e.target.value || undefined })}>
                    <option value="">Legislação do edital</option>
                    {topics.filter((topic) => topic.topico === scope.topico || topic.laws.some(isReady)).map((topic) => <option key={topic.topico} value={topic.topico}>{topicoLabel(topic.topico)}</option>)}
                  </select></label>
                )}
                <label>Norma<select value={scope.law ?? ''} onChange={(e) => changeScope({ ...scope, law: e.target.value || undefined })}>
                  <option value="">Todas as normas</option>
                  {scope.law && !laws.includes(scope.law) && <option value={scope.law}>{lawName(scope.law)} (indisponível)</option>}
                  {laws.map((law) => <option key={law} value={law}>{lawName(law)}</option>)}
                </select></label>
              </div>
              {!canStart && <p className="xsmall muted" role="status">Escolha um conteúdo com normas disponíveis.</p>}
            </section>

            <section className="jg-panel" aria-labelledby="jg-mode">
              <h2 className="heading-with-icon" id="jg-mode"><IPlay size={17} />Modo de jogo</h2>
              <div className="jg-modes" role="group" aria-labelledby="jg-mode">
                {(Object.keys(MODES) as PlanMode[]).map((id) => {
                  const { Icon, tint, label } = MODES[id];
                  return (
                    <button key={id} className="jg-mode" aria-pressed={mode === id} onClick={() => { haptic('soft'); setMode(id); }}>
                      <span className="jg-mode-icon" style={{ '--tint': tint } as React.CSSProperties}><Icon size={17} /></span>
                      <span><strong>{MODE_INFO[id].label}</strong><small>{label}</small></span>
                      {mode === id && <ICheck size={13} className="jg-mode-check" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {timed && (
              <section className="jg-panel" aria-labelledby="jg-time">
                <h2 id="jg-time">Duração</h2>
                <div className="jg-times" role="group" aria-labelledby="jg-time">
                  {MINUTES.map((value) => <button className="jg-time" key={value} aria-pressed={minutes === value} onClick={() => { haptic('soft'); setMinutes(value); }}>{value === 'inf' ? 'Sem limite' : `${value} min`}</button>)}
                </div>
                <h2 id="jg-order">Ordem dos artigos</h2>
                {mode === 'memorizar-guiada'
                  ? <p className="small muted">Sempre na ordem da lei, dispositivo por dispositivo.</p>
                  : <Segmented label="Ordem dos artigos" value={order} options={[
                    { id: 'linear', label: 'Sequencial' },
                    { id: 'misturado', label: 'Aleatório' },
                  ]} onChange={setOrder} />}
                <div className="jg-extras">
                  <button onClick={() => setPomo(true)}><ITomato size={16} /> Pomodoro</button>
                </div>
              </section>
            )}
            {mode === 'relampago' && <p className="small muted jg-blitz">20 questões · 10 segundos por questão</p>}
            {mode === 'simulado' && (
              <section className="jg-panel" aria-labelledby="jg-simulado">
                <h2 id="jg-simulado">Configuração do simulado</h2>
                <SimuladoFields setup={simulado} />
                <SimuladoHistory />
              </section>
            )}
          </>}
        </div>
      </div>
      <footer className="jg-footer">
        <button className="pill-cta" disabled={pending === undefined || (!prioritiseResume && (!canStart || simulado.busy))} onClick={prioritiseResume ? resume : start}>
          {prioritiseResume ? 'Continuar estudo' : mode === 'simulado'
            ? (simulado.busy ? 'Gerando questões…' : `Gerar ${simulado.count} questões`)
            : unfinished ? 'Começar novo treino' : 'Começar treino'}
          <span className="go"><IPlay size={16} /></span>
        </button>
      </footer>
      <PomodoroSheet open={pomo} onClose={() => setPomo(false)} />
    </div>
  );
}
