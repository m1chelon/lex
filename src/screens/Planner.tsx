import { useMemo, useState } from 'react';
import { PUBLISHED_DOCTRINE_COURSES } from '../content/doctrineCatalog';
import { RAMOS, areaLaws, lawsByRamo } from '../core/areas';
import { SOURCES, type Ramo } from '../core/sources';
import { articleTitle, getArticle, getLaw, getManifest } from '../data/corpus';
import { COURSE_NAME, courseTopics, topicoLabel } from '../learn/plan';
import {
  applyRedistribution, plannerConfig, plannerDate, plannerDateKey, plannerGoalOn, plannerProgress, plannerQuantity,
  plannerSubject, plannerTaskKey, redistribution, savePlanner, usePlanner, weekday, weekStart, WEEKDAYS,
  type PlannerTask, type StudyGoal, type StudyPlanner,
} from '../learn/planner';
import { dayKey } from '../learn/mood';
import type { SessionState } from '../learn/session';
import { useAmbient } from '../ui/ambient';
import { ICalendar, ICheck, IClock, IPlay, ISliders } from '../ui/icons';
import { nav } from '../ui/nav';
import { PageHeader, Segmented, Sheet, toast } from '../ui/primitives';

const normAvailable = (id: string) => !!getLaw(id) || getManifest()?.laws.some((law) => law.id === id && law.status === 'ok');
const firstLaw: Extract<StudyGoal, { kind: 'law' }> = { kind: 'law', scope: { kind: 'geral', ramo: 'Constitucional', law: 'cf' }, target: 50 };
const example: StudyPlanner['days'] = [
  firstLaw,
  { kind: 'law', scope: { kind: 'geral', ramo: 'Processual Civil', law: 'cpc' }, target: 100 },
  { kind: 'law', scope: { kind: 'geral', ramo: 'Civil', law: 'cdc' }, target: 50 },
  { kind: 'law', scope: { kind: 'geral', ramo: 'Civil', law: 'cc' }, target: 150 },
  { kind: 'review', target: 10 }, null, null,
];

export function TodayPlanCard({ today, goal, task, carry, pending, onEdit, compact = false }: {
  today: string; goal: StudyGoal; task: PlannerTask | null; carry?: number; pending?: SessionState | null;
  onEdit: () => void; compact?: boolean;
}) {
  const progress = task ? plannerProgress(task, goal.target) : null;
  const done = progress?.completed ?? 0;
  const nextArticle = goal.kind === 'law' && progress?.next ? getArticle(progress.next) : null;
  const planned = pending?.config.planner;
  const canResume = pending && !pending.finishedAt && pending.index < pending.items.length && planned
    && plannerTaskKey(planned.day, planned.goal) === plannerTaskKey(today, goal);
  const start = (quick: boolean) => nav.push({ name: 'session', config: plannerConfig(today, goal, quick) });
  const allDone = done >= goal.target;
  return (
    <section className={`planner-today${compact ? ' compact' : ''}`} aria-label="Plano de hoje">
      <div className="row between">
        <p className="planner-kicker"><ICalendar size={18} /> {WEEKDAYS[weekday(plannerDate(today))]} · Plano de hoje</p>
        <button className="btn btn-quiet btn-sm" onClick={onEdit}>{compact ? 'Planner' : 'Editar semana'}</button>
      </div>
      <h2>{plannerSubject(goal)}</h2>
      <p className="planner-meter">{done} de {plannerQuantity(goal)}</p>
      <progress value={done} max={goal.target} aria-label="Progresso da meta de hoje" />
      {progress && !progress.remaining.length && !allDone && <p className="small muted">
        {goal.kind === 'review' ? 'Sem revisões pendentes na última busca.' : 'Sem mais atividades disponíveis na última busca.'}
      </p>}
      {nextArticle && <p className="small muted">Próximo · {articleTitle(nextArticle.law.id, nextArticle.art)}</p>}
      {!!carry && <p className="small muted">A meta inclui até {plannerQuantity(goal, carry)} remanejados.</p>}
      <div className="planner-actions">
        {canResume ? <button className="btn btn-primary" onClick={() => nav.push({ name: 'session', resume: true })}><IPlay size={18} /> Retomar treino</button>
          : !allDone && <>
            <button className="btn btn-primary" onClick={() => start(false)}><IPlay size={18} /> {task ? 'Continuar meta' : 'Começar treino'}</button>
            <button className="btn btn-quiet" onClick={() => start(true)}><IClock size={17} /> Praticar 5 min</button>
          </>}
        {allDone && <span className="planner-finished"><ICheck size={17} /> Meta concluída</span>}
      </div>
    </section>
  );
}

export function PlannerScreen({ pending }: { pending?: SessionState | null }) {
  const today = dayKey(useAmbient().now);
  const state = usePlanner(today, true);
  const [view, setView] = useState<'today' | 'week'>('today');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const plan = state?.plan;
  const goal = plan && plannerGoalOn(plan, today);
  const week = plannerDateKey(weekStart(today), weekOffset * 7);
  const proposals = useMemo(() => plan && state ? redistribution(plan, state.tasks, today).moves : [], [plan, state, today]);
  const dateLabel = (day: string) => plannerDate(day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const days = WEEKDAYS.map((name, index) => {
    const date = plannerDateKey(week, index);
    const goal = plan && plannerGoalOn(plan, date);
    const task = goal ? state?.tasks.get(plannerTaskKey(date, goal)) : undefined;
    const progress = goal && task ? plannerProgress(task, goal.target) : undefined;
    return { name, date, goal, progress, done: progress?.completed ?? 0 };
  });
  const selected = days.find(({ date }) => date === selectedDay);
  const startDay = (date: string, goal: StudyGoal) => {
    const saved = pending?.config.planner;
    if (pending && !pending.finishedAt && pending.index < pending.items.length && saved
      && plannerTaskKey(saved.day, saved.goal) === plannerTaskKey(date, goal)) {
      nav.push({ name: 'session', resume: true });
      return;
    }
    nav.push({ name: 'session', config: plannerConfig(date, goal) });
  };
  return (
    <div className="stack planner-screen">
      <PageHeader title="Planner de estudos" right={view === 'week' && plan && <button className="icon-btn glass" aria-label="Editar semana" onClick={() => setEditing(true)}><ISliders size={19} /></button>} />
      <Segmented label="Visualização do Planner" value={view} options={[{ id: 'today', label: 'Hoje' }, { id: 'week', label: 'Semana' }]} onChange={setView} />
      {!state ? <p className="small muted" role="status">Carregando seu plano…</p> : view === 'today' ? (
        goal ? <TodayPlanCard today={today} goal={goal} task={state.task} carry={plan?.carry[today]} pending={pending} onEdit={() => setEditing(true)} />
          : <section className="planner-today">
            <ICalendar size={24} />
            <h2>{plan ? 'Dia livre' : 'Monte sua semana de estudos'}</h2>
            <p className="muted">{plan ? 'Hoje está livre no seu plano.' : 'Escolha o conteúdo e a meta de cada dia.'}</p>
            <button className="btn btn-primary" onClick={() => setEditing(true)}>{plan ? 'Editar semana' : 'Criar plano'}</button>
          </section>
      ) : (
        <section className="planner-week">
          <div className="row between planner-week-nav">
            <button className="btn btn-quiet btn-sm" onClick={() => { setSelectedDay(undefined); setWeekOffset(weekOffset - 1); }}>Anterior</button>
            <strong>{dateLabel(week)} a {dateLabel(plannerDateKey(week, 6))}</strong>
            <button className="btn btn-quiet btn-sm" onClick={() => { setSelectedDay(undefined); setWeekOffset(weekOffset + 1); }}>Próxima</button>
          </div>
          {days.some(({ goal }) => goal) && <div className="planner-chart">
            <div className="planner-chart-legend small muted"><span>Meta</span><span>Realizado</span></div>
            <div className="planner-bars" role="group" aria-label="Progresso das metas da semana">
              {days.map(({ name, date, goal, progress, done }) => {
                const complete = goal && progress && progress.completed >= goal.target;
                const label = goal ? `${name}, ${dateLabel(date)}, ${plannerSubject(goal)}, ${done} de ${plannerQuantity(goal)}` : `${name}, dia livre`;
                return <button key={date} className="planner-bar" data-goal={!!goal} aria-label={label}
                  aria-current={date === today ? 'date' : undefined} onClick={() => {
                    if (goal && !complete) startDay(date, goal);
                    else setSelectedDay(date);
                  }}>
                  <span className="planner-track" aria-hidden="true"><span style={{ height: (goal ? 100 * done / goal.target : 0) + '%' }} /></span>
                  <span>{name.slice(0, 3)}</span>
                </button>;
              })}
            </div>
          </div>}
          <ol className="planner-days">
            {days.map(({ name, date, goal: entry, progress }) => {
              return <li key={date} aria-current={date === today ? 'date' : undefined}>
                <span className="planner-date"><strong>{name}</strong><small>{dateLabel(date)}</small></span>
                <span className="planner-day-goal"><strong>{entry ? plannerSubject(entry) : 'Livre'}</strong>
                  {entry && <small>{progress ? `${progress.completed} de ${plannerQuantity(entry)}` : plannerQuantity(entry)}
                    {!!plan?.carry[date] && ` · inclui ${plan.carry[date]} remanejados`}</small>}</span>
                {date === today && entry && <button className="btn btn-quiet btn-sm" onClick={() => setView('today')}>Hoje</button>}
              </li>;
            })}
          </ol>
          {!plan && <button className="btn btn-quiet btn-block" onClick={() => setEditing(true)}>Criar plano</button>}
        </section>
      )}
      {proposals.length > 0 && <button className="btn btn-quiet btn-block" onClick={() => setMoving(true)}>Redistribuir pendências</button>}
      {editing && <PlannerEditor initial={plan?.days ?? example} today={today} onClose={() => setEditing(false)} />}
      <Sheet open={!!selected} label="Meta do dia" onClose={() => setSelectedDay(undefined)}>
        {selected && <div className="stack planner-sheet">
          <h2 className="title-m">{selected.name} · {dateLabel(selected.date)}</h2>
          {selected.goal ? <>
            <strong>{plannerSubject(selected.goal)}</strong>
            <p className="muted">{selected.done} de {plannerQuantity(selected.goal)} concluídos</p>
          </> : <p className="muted">Dia livre no Planner</p>}
        </div>}
      </Sheet>
      <Sheet open={moving} label="Redistribuir pendências" onClose={() => setMoving(false)}>
        <div className="stack planner-sheet">
          <h2>Redistribuir pendências</h2>
          <p className="muted">As pendências entram nas próximas metas da mesma matéria.</p>
          <ul className="planner-moves">{proposals.map(({ day, goal: move, count }) => <li key={day}><strong>{dateLabel(day)}</strong> {plannerSubject(move)} · {plannerQuantity(move, count)}</li>)}</ul>
          <button className="btn btn-primary btn-block" disabled={saving || !plan || !proposals.length} onClick={async () => {
            if (!plan) return;
            setSaving(true);
            try { await applyRedistribution(plan, today); setMoving(false); setView('week'); setWeekOffset(0); }
            catch { toast('Não foi possível aplicar. Confira o plano e tente novamente.'); }
            finally { setSaving(false); }
          }}>Aplicar à semana</button>
        </div>
      </Sheet>
    </div>
  );
}

function PlannerEditor({ initial, today, onClose }: { initial: StudyPlanner['days']; today: string; onClose: () => void }) {
  const [days, setDays] = useState(initial);
  const [date, setDate] = useState(weekday(plannerDate(today)));
  const [busy, setBusy] = useState(false);
  const chosen = days[date];
  const set = (entry: StudyGoal | null) => setDays((prev) => prev.map((value, index) => index === date ? entry : value));
  const kind = chosen?.kind ?? 'free';
  const targets = chosen?.kind === 'doctrine' && chosen.unit === 'modules' ? [1, 3, 5] : chosen?.kind === 'law' ? [50, 100, 150] : [5, 10, 20];
  return (
    <Sheet open onClose={onClose} label="Editar semana de estudos" tall>
      <div className="stack planner-sheet">
        <h2>Editar semana</h2>
        <div className="planner-day-picker" role="group" aria-label="Dia da semana">
          {WEEKDAYS.map((day, index) => <button key={day} className="chip" aria-pressed={date === index} aria-label={day} onClick={() => setDate(index)}>{day.slice(0, 3)}{days[index] && <span className="planner-scheduled" aria-hidden="true" />}</button>)}
        </div>
        <label>{WEEKDAYS[date]}<select value={kind} onChange={(event) => {
          const kind = event.target.value;
          set(kind === 'law' ? firstLaw : kind === 'review' ? { kind, target: 10 }
            : kind === 'doctrine' ? { kind, courseId: PUBLISHED_DOCTRINE_COURSES[0].id, target: 10, unit: 'questions' } : null);
        }}>
          <option value="free">Dia livre</option><option value="law">Lei seca</option><option value="doctrine">Doutrina</option><option value="review">Revisar</option>
        </select></label>
        {chosen?.kind === 'law' && <PlannerLawFields goal={chosen} onChange={set} />}
        {chosen?.kind === 'doctrine' && <>
          <label>Curso<select value={chosen.courseId} onChange={(event) => set({ ...chosen, courseId: event.target.value })}>
            {PUBLISHED_DOCTRINE_COURSES.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
          </select></label>
          <label>Contar por<select value={chosen.unit} onChange={(event) => set({ ...chosen, unit: event.target.value as typeof chosen.unit, target: event.target.value === 'modules' ? 3 : 10 })}>
            <option value="questions">Questões</option><option value="modules">Módulos</option>
          </select></label>
        </>}
        {chosen && <>
          <div className="chips" role="group" aria-label="Metas sugeridas">
            {targets.map((target) => <button key={target} className="chip" aria-pressed={chosen.target === target} onClick={() => set({ ...chosen, target })}>{plannerQuantity(chosen, target)}</button>)}
          </div>
          <label>Meta de {plannerQuantity(chosen, 2).slice(2).trim()}<input className="input" type="number" inputMode="numeric" min={1} max={9999} value={chosen.target || ''} onChange={(event) => set({ ...chosen, target: Number(event.target.value) })} /></label>
        </>}
        <button className="btn btn-primary btn-block" disabled={busy || days.some((entry) => entry && (!Number.isInteger(entry.target) || entry.target < 1 || entry.target > 9999))} onClick={async () => {
          setBusy(true);
          try { await savePlanner(days, today); onClose(); toast('Semana salva.'); }
          catch { toast('Não foi possível salvar a semana.'); }
          finally { setBusy(false); }
        }}>Salvar semana</button>
      </div>
    </Sheet>
  );
}

function PlannerLawFields({ goal, onChange }: { goal: Extract<StudyGoal, { kind: 'law' }>; onChange: (goal: StudyGoal) => void }) {
  const scope = goal.scope;
  const area = scope.kind === 'geral' ? 'geral' : scope.area;
  const topics = scope.kind === 'curso' ? courseTopics(scope.area) : [];
  const laws = (scope.kind === 'geral' ? lawsByRamo(scope.ramo)
    : scope.topico ? topics.find((topic) => topic.topico === scope.topico)?.laws ?? [] : areaLaws(scope.area)).filter(normAvailable);
  return <>
    <label>Origem<select value={area} onChange={(event) => {
      const value = event.target.value as 'geral' | 'tjsp' | 'tjms';
      onChange({ ...goal, scope: value === 'geral' ? firstLaw.scope : { kind: 'curso', area: value } });
    }}>
      <option value="geral">Legislação</option><option value="tjsp">{COURSE_NAME.tjsp}</option><option value="tjms">{COURSE_NAME.tjms}</option>
    </select></label>
    {scope.kind === 'geral' ? <label>Matéria<select value={scope.ramo} onChange={(event) => onChange({ ...goal, scope: { kind: 'geral', ramo: event.target.value as Ramo } })}>
      {RAMOS.filter((ramo) => ramo === scope.ramo || lawsByRamo(ramo).some(normAvailable)).map((ramo) => <option key={ramo}>{ramo}</option>)}
    </select></label> : <label>Disciplina<select value={scope.topico ?? ''} onChange={(event) => onChange({ ...goal, scope: { kind: 'curso', area: scope.area, topico: event.target.value || undefined } })}>
      <option value="">Legislação do edital</option>{topics.map(({ topico }) => <option key={topico} value={topico}>{topicoLabel(topico)}</option>)}
    </select></label>}
    <label>Norma<select value={scope.law ?? ''} onChange={(event) => onChange({ ...goal, scope: { ...scope, law: event.target.value || undefined } })}>
      <option value="">Todas as normas</option>
      {laws.map((id) => <option key={id} value={id}>{SOURCES.find((law) => law.id === id)?.short ?? id}</option>)}
    </select></label>
  </>;
}
