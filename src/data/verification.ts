import { useEffect, useState } from 'react';
export interface VerRef { ref: { law: string; art: string; quote?: string }; status: 'verificado' | 'pendente' | 'divergente'; detail?: string; articleId?: string }
export interface VerItem { kind: string; id: string; title: string; status: 'verificado' | 'pendente' | 'divergente'; refs: VerRef[]; docs: { doc: { obra: string; pagina: number; trecho: string }; status: string; detail?: string }[] }
export interface Verification { generatedAt: string; totals: { verificado: number; pendente: number; divergente: number; doutrinaVerificada: number }; internal: string[]; items: VerItem[] }
let cache: Verification | null = null;
let p: Promise<Verification | null> | null = null;
export function loadVerification(): Promise<Verification | null> {
  if (cache) return Promise.resolve(cache);
  p ??= fetch('./data/verification.json').then((response) => {
    if (!response.ok) throw new Error('Verificação indisponível');
    return response.json() as Promise<Verification>;
  }).then((value) => (cache = value)).catch(() => null).finally(() => { p = null; });
  return p;
}
export function useVerification() {
  const [v, setV] = useState<Verification | null>(cache);
  useEffect(() => { if (!cache) loadVerification().then(setV); }, []);
  return v;
}
export const verItem = (v: Verification | null, kind: string, id: string) => v?.items.find((i) => i.kind === kind && i.id === id);
