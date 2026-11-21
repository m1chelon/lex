import { useSyncExternalStore } from 'react';

export type Tab = 'home' | 'direito' | 'cursos' | 'formacao' | 'map' | 'me';
export type Route =
  | { name: 'law'; id: string; headingId?: string }
  | { name: 'ramo'; ramo: import('../core/sources').Ramo }
  | { name: 'biblioteca' }
  | { name: 'article'; id: string; unitId?: string }
  | { name: 'session'; resume?: boolean; config?: import('../learn/session').SessionConfig; reenter?: string }
  | { name: 'lesson'; id: string }
  | { name: 'compare'; id: string }
  | { name: 'glossary' }
  | { name: 'concepts'; topic?: string }
  | { name: 'admin' }
  | { name: 'search'; q?: string; lawId?: string }
  | { name: 'favorites' }
  | { name: 'simulado'; area?: import('../core/areas').AreaId; focus?: string }
  | { name: 'jogar'; scope?: import('../learn/plan').PlanScope; mode?: import('../learn/plan').PlanMode; adjust?: boolean }
  | { name: 'doutrina-curso'; id: string; moduleId?: string }
  | { name: 'planner' }
  | { name: 'capi-shop' }
  | { name: 'perfis' }
  | { name: 'curso'; id: 'tjsp' | 'tjms' }
  | { name: 'simulado-run'; id: string }
  | { name: 'forest' }
  | { name: 'ponto' }
  | { name: 'legal'; doc: 'privacidade' | 'termos' | 'sobre' };

interface NavState { tab: Tab; stack: Route[]; dir: 1 | -1 }
let s: NavState = { tab: 'home', stack: [], dir: 1 };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const nav = {
  get: () => s,
  tab(t: Tab) { const order: Tab[] = ['home', 'direito', 'cursos', 'formacao', 'map', 'me']; s = { tab: t, stack: [], dir: order.indexOf(t) >= order.indexOf(s.tab) ? 1 : -1 }; emit(); },
  push(r: Route) { s = { ...s, stack: [...s.stack, r], dir: 1 }; emit(); },
  replace(r: Route) { s = { ...s, stack: [...s.stack.slice(0, -1), r], dir: 1 }; emit(); },
  back() { if (!s.stack.length) return; s = { ...s, stack: s.stack.slice(0, -1), dir: -1 }; emit(); },
};
export function useNav() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => s);
}
