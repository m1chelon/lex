// Plano de estudo: o que (Direito em geral ou curso), como (modo) e quanto tempo.
// É a escolha feita na tela Jogar; o Início mostra "Continuar" com ela.
import { useSyncExternalStore } from 'react';
import { RAMOS, getArea, lawsByRamo, type AreaId } from '../core/areas';
import { SOURCES, type Ramo } from '../core/sources';
import { PROFILE_PLAN_KEY, profileStorageKey, readProfilePlan } from '../data/profiles';
import { getSettings, setSettings } from '../ui/settings';
import { DEFAULT_ARTICLE_ORDER, type Order, type SessionConfig } from './session';

export type PlanMode = 'aprender' | 'memorizar' | 'memorizar-guiada' | 'casos' | 'provar' | 'relampago' | 'simulado';
export type PlanScope =
  | { kind: 'geral'; ramo: Ramo; law?: string }
  | { kind: 'curso'; area: Exclude<AreaId, 'geral'>; topico?: string; law?: string };
export interface Plan { scope: PlanScope; mode: PlanMode; minutes: number | 'inf'; order?: Order }

export const GUIDED_MEMORY_SECONDS = 10;

export const MODE_INFO: Record<PlanMode, { label: string; desc: string }> = {
  aprender: { label: 'Leitura Guiada', desc: 'Leia a lei com os trechos essenciais destacados.' },
  memorizar: { label: 'Memorizar', desc: 'Complete duas ou três lacunas curtas no dispositivo.' },
  'memorizar-guiada': { label: 'Memorizar Guiada', desc: `Leia o artigo completo por ${GUIDED_MEMORY_SECONDS} segundos e preencha as lacunas.` },
  casos: { label: 'Casos', desc: 'Situações práticas: identifique o instituto, o crime ou a consequência.' },
  provar: { label: 'Provar', desc: 'Nível de prova: digite as lacunas da lei seca e pratique com casos.' },
  relampago: { label: 'Relâmpago', desc: '20 questões, 10 segundos cada. Treino sob pressão.' },
  simulado: { label: 'Simulado', desc: 'Questões de Direito com tempo e nota, no formato escolhido.' },
};

export function isPlanScope(value: unknown): value is PlanScope {
  if (!value || typeof value !== 'object') return false;
  const scope = value as PlanScope;
  if (scope.law !== undefined && !SOURCES.some((source) => source.id === scope.law)) return false;
  if (scope.kind === 'geral') return RAMOS.includes(scope.ramo);
  return scope.kind === 'curso' && (scope.area === 'tjsp' || scope.area === 'tjms') && (scope.topico === undefined || typeof scope.topico === 'string');
}

export function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false;
  const { scope, mode, minutes, order } = value as Partial<Plan>;
  if (!isPlanScope(scope) || !mode || !Object.hasOwn(MODE_INFO, mode)) return false;
  if (minutes !== 'inf' && (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0 || minutes > 240)) return false;
  return order === undefined || order === 'linear' || order === 'misturado';
}

const KEY = profileStorageKey(PROFILE_PLAN_KEY);
const saved = readProfilePlan();
let state = isPlan(saved) ? saved : null;
const subs = new Set<() => void>();
export const getPlan = () => state;
export function savePlan(p: Plan) {
  state = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ok */ }
  // a "área" do app (mapa do edital, Progresso) acompanha o que se está estudando
  const area: AreaId = p.scope.kind === 'curso' ? p.scope.area : 'geral';
  if (getSettings().area !== area) setSettings({ area });
  subs.forEach((f) => f());
}
export function clearPlan() { state = null; try { localStorage.removeItem(KEY); } catch { /* ok */ } subs.forEach((f) => f()); }
export const usePlan = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);

export const COURSE_NAME: Record<Exclude<AreaId, 'geral'>, string> = { tjsp: 'TJSP · Escrevente', tjms: 'TJMS · Analista' };
const shortOf = (id: string) => SOURCES.find((s) => s.id === id)?.short ?? id;
export const topicoLabel = (t: string) => t.replace(/^\d+\.\s*/, '');

/** "O que": rótulo curto do escopo. */
export function scopeLabel(s: PlanScope): { title: string; sub: string } {
  if (s.kind === 'geral') return { title: s.law ? shortOf(s.law) : `Direito ${s.ramo}`.replace('Direito Direitos sociais', 'Direitos sociais').replace('Direito Interna', 'Normas internas'), sub: s.law ? `Direito em geral · ${s.ramo}` : `Direito em geral · ramo inteiro (${lawsByRamo(s.ramo).length} ${lawsByRamo(s.ramo).length === 1 ? 'norma' : 'normas'})` };
  return { title: s.law ? shortOf(s.law) : s.topico ? topicoLabel(s.topico) : 'Legislação do edital', sub: `${COURSE_NAME[s.area]}${s.law && s.topico ? ` · ${topicoLabel(s.topico)}` : ''}` };
}
export function planLabel(p: Plan) {
  const sc = scopeLabel(p.scope);
  const how = p.mode === 'relampago' ? 'Relâmpago · 20 questões' : p.mode === 'simulado' ? 'Simulado' : `${MODE_INFO[p.mode].label} · ${p.minutes === 'inf' ? 'sem limite' : `${p.minutes} min`}`;
  return { ...sc, how };
}

/** Converte o plano no foco/área usados pelo motor de sessões. */
export function scopeToFocus(s: PlanScope): { area: AreaId; focus: string } {
  if (s.kind === 'geral') return { area: 'geral', focus: s.law ? `law:${s.law}` : `ramo:${s.ramo}` };
  return { area: s.area, focus: s.law ? (s.topico ? `topic-law:${s.law}:${s.topico}` : `law:${s.law}`) : s.topico ? `topico:${s.topico}` : 'auto' };
}
export function planToConfig(p: Plan, over: Partial<SessionConfig> = {}): SessionConfig {
  const { area, focus } = scopeToFocus(p.scope);
  const base: SessionConfig = { area, focus, mode: p.mode === 'relampago' || p.mode === 'simulado' ? 'memorizar' : p.mode, minutes: p.minutes === 'inf' ? 30 : p.minutes, infinite: p.minutes === 'inf', order: p.order ?? DEFAULT_ARTICLE_ORDER, mix: getSettings().provarMix };
  if (p.mode === 'relampago') Object.assign(base, { blitz: true, minutes: 5, infinite: false });
  return { ...base, ...over };
}

/** Disciplinas do edital de um curso, com as leis de cada uma. */
export function courseTopics(area: Exclude<AreaId, 'geral'>) {
  const reqs = getArea(area).requirements;
  return [...new Set(reqs.map((r) => r.topico))].map((t) => ({ topico: t, bloco: reqs.find((r) => r.topico === t)!.bloco, laws: [...new Set(reqs.filter((r) => r.topico === t).map((r) => r.law))] }));
}
