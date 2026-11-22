// Carregamento do corpus: arquivos validados no build -> IndexedDB (uso offline).
import { libraryDb, type StoredLaw } from './db';
import type { Article, LawDoc, Unit } from '../core/types';
import { SOURCES } from '../core/sources';
import { resolveRequirement, type CoverageItem } from '../core/edital';
import { areaLaws, getArea, type AreaId } from '../core/areas';
import { getSettings } from '../ui/settings';

export interface ManifestLaw {
  id: string; title: string; short: string; area: string; url: string; sourceName: string; manualHint: string;
  status: 'ok' | 'pendente'; error?: string; articles?: number; provenance?: LawDoc['provenance']; stats?: LawDoc['stats']; bytes?: number;
}
export interface Manifest { generatedAt: string; edital: { id: string; title: string; orgao: string; publicacao: string; url: string; regra: string }; laws: ManifestLaw[] }

const docs = new Map<string, LawDoc>();
const artIndex = new Map<string, { law: LawDoc; art: Article }>();
const unitIndex = new Map<string, { law: LawDoc; art: Article; unit: Unit }>();
let manifest: Manifest | null = null;
let ready: Promise<void> | null = null;
let indexed: Promise<void> | null = null;
let manifestLoad: Promise<Manifest | null> | null = null;
const listeners = new Set<() => void>();
let version = 0;

export const corpusVersion = () => version;
export function onCorpus(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function bump() { version++; listeners.forEach((f) => f()); }

function indexDoc(doc: LawDoc) {
  docs.set(doc.id, doc);
  for (const art of doc.articles) {
    artIndex.set(art.id, { law: doc, art });
    for (const unit of art.units) unitIndex.set(unit.id, { law: doc, art, unit });
  }
}

let storedRows = new Map<string, StoredLaw>();
const loading = new Map<string, Promise<boolean>>();

async function fetchCorpusJson<T>(path: string, message: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(path, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error(message);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function loadManifest(refresh = false): Promise<Manifest | null> {
  if (manifest && !refresh) return Promise.resolve(manifest);
  manifestLoad ??= (async () => {
    try {
      const downloaded = await fetchCorpusJson<Manifest>('./data/manifest.json', 'Manifesto indisponível');
      if (!Array.isArray(downloaded?.laws)) throw new Error('Manifesto inválido');
      const changed = manifest && JSON.stringify(manifest) !== JSON.stringify(downloaded);
      manifest = downloaded;
      await libraryDb.kv.put({ key: 'corpus-manifest', value: downloaded }).catch(() => {});
      if (changed) bump();
    } catch {
      // Mantém o último índice disponível ao perder a conexão.
    }
    return manifest;
  })().finally(() => { manifestLoad = null; });
  return manifestLoad;
}

/** O índice e as leis já guardadas bastam para abrir o app. */
export function prepareCorpus(): Promise<void> {
  indexed ??= (async () => {
    const [cached, stored] = await Promise.all([
      libraryDb.kv.get('corpus-manifest').catch(() => undefined),
      libraryDb.laws.toArray().catch(() => []),
    ]);
    const savedManifest = cached?.value as Manifest | undefined;
    if (!manifest && Array.isArray(savedManifest?.laws)) manifest = savedManifest;
    storedRows = new Map(stored.map((s) => [s.id, s]));
    for (const s of stored) indexDoc(s.doc);
    if (manifest) void loadManifest(true);
    else await loadManifest();
    bump();
  })();
  return indexed;
}

/** Prepara o índice e baixa as leis da área ativa. */
export function initCorpus(onProgress?: (msg: string) => void): Promise<void> {
  ready ??= (async () => {
    await prepareCorpus();
    const area = getSettings().area;
    await ensureLaws(area === 'geral' ? ['cf', 'cp', 'cpp', 'cc', 'cpc'] : areaLaws(area), onProgress);
  })();
  return ready;
}

/** Garante que as leis estejam no aparelho (baixa as que faltam ou mudaram). */
export async function ensureLaws(ids: string[], onProgress?: (msg: string) => void): Promise<void> {
  await prepareCorpus();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const index = await (online && manifestLoad ? manifestLoad : loadManifest());
  const tasks: Promise<boolean>[] = [];
  const started: Promise<boolean>[] = [];
  for (const id of ids) {
    const m = index?.laws.find((x) => x.id === id);
    if (!m || m.status !== 'ok' || !m.provenance) continue;
    const have = storedRows.get(id);
    if (have && (have.sha === m.provenance.sha256 || have.method === 'manual')) { if (!docs.has(id)) indexDoc(have.doc); continue; }
    if (!loading.has(id)) {
      const task = (async () => {
        onProgress?.(`Baixando e validando ${m.short}…`);
        try {
          const doc = await fetchCorpusJson<LawDoc>(`./data/laws/${m.id}.json`, 'Norma indisponível');
          if (doc.id !== m.id || doc.provenance?.sha256 !== m.provenance?.sha256 || !Array.isArray(doc.articles)) return false;
          if (storedRows.get(id)?.method === 'manual') return false;
          const row: StoredLaw = { id: doc.id, doc, sha: doc.provenance.sha256, method: 'automatico', storedAt: new Date().toISOString() };
          try { await libraryDb.laws.put(row); } catch { /* sem IndexedDB */ }
          storedRows.set(id, row);
          const old = docs.get(id);
          if (old) for (const a of old.articles) { artIndex.delete(a.id); a.units.forEach((u) => unitIndex.delete(u.id)); }
          indexDoc(doc);
          return true;
        } catch { return false; }
      })().finally(() => loading.delete(id));
      loading.set(id, task);
      started.push(task);
    }
    tasks.push(loading.get(id)!);
  }
  await Promise.all(tasks);
  if ((await Promise.all(started)).some(Boolean)) bump();
}
export const isLoaded = (id: string) => docs.has(id);

export async function storeManualLaw(doc: LawDoc) {
  const row: StoredLaw = { id: doc.id, doc, sha: doc.provenance.sha256, method: 'manual', storedAt: new Date().toISOString() };
  await libraryDb.laws.put(row);
  storedRows.set(doc.id, row);
  // remove índices antigos
  const old = docs.get(doc.id);
  if (old) for (const a of old.articles) { artIndex.delete(a.id); a.units.forEach((u) => unitIndex.delete(u.id)); }
  indexDoc(doc);
  bump();
}

export async function removeLaw(id: string) {
  await libraryDb.laws.delete(id);
  const old = docs.get(id);
  if (old) for (const a of old.articles) { artIndex.delete(a.id); a.units.forEach((u) => unitIndex.delete(u.id)); }
  docs.delete(id);
  storedRows.delete(id);
  await ensureLaws([id]);
  bump();
}

export const getManifest = () => manifest;
export const getLaw = (id: string) => docs.get(id);
export const getLaws = (ids?: string[]) => (ids ?? SOURCES.map((s) => s.id)).map((id) => docs.get(id)).filter(Boolean) as LawDoc[];
export const getArticle = (id: string) => artIndex.get(id);
export const getUnit = (id: string) => unitIndex.get(id);
export const lawIdOf = (articleOrUnitId: string) => articleOrUnitId.split('.')[0];

const coverageCache = new Map<string, { v: number; items: CoverageItem[]; required: Set<string>; byArticle: Map<string, string[]> }>();
export function coverage(area: AreaId = getSettings().area) {
  const hit = coverageCache.get(area);
  if (hit && hit.v === version) return hit;
  const reqs = area === 'geral' ? [] : getArea(area).requirements;
  const items = reqs.map((r) => resolveRequirement(docs.get(r.law), r));
  const required = new Set<string>();
  const byArticle = new Map<string, string[]>();
  for (const it of items) for (const a of it.articles) { required.add(a); byArticle.set(a, [...(byArticle.get(a) || []), it.req.id]); }
  const out = { v: version, items, required, byArticle };
  coverageCache.set(area, out);
  return out;
}

/** Texto plano de um artigo (rótulos + texto vigente). */
export function articlePlain(art: Article): string {
  return art.units.filter((u) => u.t).map((u) => `${u.lab ? u.lab + ' ' : ''}${u.t}`).join('\n');
}

export function articleTitle(lawId: string, art: Article) {
  const law = docs.get(lawId);
  if (art.n.startsWith('anx')) return `${law?.short ?? lawId}, ${art.lab}`;
  const n = art.n.replace(/^(dt|adct|s\d+)-/, (m) => (m.startsWith('dt') ? 'DT ' : m.startsWith('adct') ? 'ADCT ' : ''));
  return `${law?.short ?? lawId}, art. ${n}`;
}
