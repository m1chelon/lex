// Acervo doutrinário pessoal: importado de um arquivo e guardado só no aparelho (IndexedDB).
import { db, kvGet } from '../data/db';

interface DoutrinaLaw { law: string; obras: string[]; aviso: string; arts: Record<string, unknown[]> }
export interface DoutrinaBundle { formato: 'lex-doutrina'; versao: 1; geradoEm: string; aviso: string; leis: Record<string, DoutrinaLaw> }
export interface DoutrinaMeta { importadoEm: string; geradoEm: string; leis: number; artigos: number }

const prefix = 'doutrina:';
const memo = new Map<string, unknown>();

export async function importDoutrina(file: File): Promise<DoutrinaMeta> {
  let b: DoutrinaBundle;
  try { b = JSON.parse(await file.text()); } catch { throw new Error('O arquivo não é um JSON válido.'); }
  if (b?.formato !== 'lex-doutrina' || !b.leis || typeof b.leis !== 'object' || Array.isArray(b.leis)) {
    throw new Error('Este arquivo não é um pacote de doutrina do LEX.');
  }
  const entries = Object.entries(b.leis);
  const updates = entries.map(([law, value]) => {
    if (!value?.arts || typeof value.arts !== 'object' || Array.isArray(value.arts) || !Array.isArray(value.obras)) {
      throw new Error(`Pacote corrompido na lei ${law}.`);
    }
    return { key: prefix + law, value };
  });
  const meta = await db.transaction('rw', db.kv, async () => {
    const stored = await db.kv.where('key').startsWith(prefix).toArray();
    const installed = new Map(stored.map(({ key, value }) => [key, value as DoutrinaLaw]));
    for (const { key, value } of updates) installed.set(key, value);
    const artigos = [...installed.values()].reduce((sum, f) => sum + Object.keys(f?.arts ?? {}).length, 0);
    const updated: DoutrinaMeta = { importadoEm: new Date().toISOString(), geradoEm: b.geradoEm, leis: installed.size, artigos };
    await db.kv.bulkPut([...updates, { key: 'doutrinaMeta', value: updated }]);
    return updated;
  });
  for (const [law, value] of entries) memo.set(law, value);
  return meta;
}

export const doutrinaMeta = () => kvGet<DoutrinaMeta | null>('doutrinaMeta', null);

export async function removeDoutrina() {
  await db.transaction('rw', db.kv, async () => {
    await db.kv.where('key').startsWith(prefix).delete();
    await db.kv.delete('doutrinaMeta');
  });
  memo.clear();
}

/** Arquivo da lei: primeiro o acervo importado; senão, o que vier junto do app (versão privada). */
export async function loadDoutrinaLaw<T>(law: string): Promise<T | null> {
  if (memo.has(law)) return memo.get(law) as T;
  const local = await kvGet<T | null>(prefix + law, null);
  if (local) { memo.set(law, local); return local; }
  try { const r = await fetch(`./data/doutrina/${law}.json`); if (r.ok) { const j = await r.json(); memo.set(law, j); return j as T; } } catch { /* sem arquivo embutido */ }
  return null;
}
