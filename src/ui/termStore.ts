import { useSyncExternalStore } from 'react';
let current: string | null = null;
const subs = new Set<() => void>();
export const openTerm = (id: string) => { current = id; subs.forEach((f) => f()); };
export const closeTerm = () => { current = null; subs.forEach((f) => f()); };
export const useOpenTerm = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current);
