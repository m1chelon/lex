import Dexie, { type Table } from 'dexie';
import type { LawDoc } from '../core/types';
import type { Card as FsrsCard } from 'ts-fsrs';
import { activeProfile, PRIMARY_PROFILE_ID, profileDatabaseName } from './profiles';

export type Dim = 'literal' | 'conceitual' | 'prazos' | 'penas' | 'excecoes' | 'aplicacao';
export const DIMS: { id: Dim; label: string; desc: string }[] = [
  { id: 'literal', label: 'Literalidade', desc: 'Domínio da redação exata do dispositivo' },
  { id: 'conceitual', label: 'Conceitos', desc: 'Compreensão dos institutos jurídicos envolvidos' },
  { id: 'prazos', label: 'Prazos', desc: 'Memorização de prazos e números' },
  { id: 'penas', label: 'Penas', desc: 'Penas e sanções cominadas' },
  { id: 'excecoes', label: 'Exceções', desc: 'Identificação de exceções e ressalvas' },
  { id: 'aplicacao', label: 'Aplicação', desc: 'Aplicação a situações práticas' },
];

export interface StoredLaw { id: string; doc: LawDoc; sha: string; method: 'automatico' | 'manual'; storedAt: string }

export interface CardRow {
  id: string; // chave estável do exercício
  articleId?: string;
  unitId?: string;
  conceptId?: string;
  dim: Dim;
  type: string;
  fsrs: FsrsCard;
  createdAt: number;
  correct: number;
  wrong: number;
  stage: number; // degrau de progressão (memorização progressiva)
}

export interface ReviewRow {
  id?: number;
  cardId: string;
  articleId?: string;
  unitId?: string;
  dim: Dim;
  type: string;
  correct: boolean;
  rating: number;
  guessed?: boolean;
  at: number;
  ms: number;
  mode: string;
  given?: string;
  expected?: string;
  target?: string;
}

export interface MarkRow {
  id: string; // `${kind}:${target}`
  kind: 'fav' | 'hl' | 'note' | 'termfav' | 'review';
  target: string; // unitId, articleId ou termId
  articleId?: string;
  text?: string;
  at: number;
}

export interface KV { key: string; value: unknown }

class LexDB extends Dexie {
  laws!: Table<StoredLaw, string>;
  cards!: Table<CardRow, string>;
  reviews!: Table<ReviewRow, number>;
  marks!: Table<MarkRow, string>;
  kv!: Table<KV, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      laws: 'id',
      cards: 'id, articleId, unitId, conceptId, dim, type, fsrs.due',
      reviews: '++id, cardId, articleId, unitId, dim, at',
      marks: 'id, kind, target, articleId, at',
      kv: 'key',
    });
  }
}

// A base original conserva o primeiro perfil e a legislação do aparelho.
export const libraryDb = new LexDB(profileDatabaseName(PRIMARY_PROFILE_ID));
export const db = activeProfile.id === PRIMARY_PROFILE_ID ? libraryDb : new LexDB(profileDatabaseName());

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.kv.get(key);
    return (row?.value as T) ?? fallback;
  } catch {
    return fallback;
  }
}
export async function kvSet(key: string, value: unknown) {
  try { await db.kv.put({ key, value }); } catch { /* armazenamento indisponível */ }
}

/** A legislação baixada e os metadados de inicialização não representam um perfil. */
export async function hasPrimaryProgress() {
  const profileKeys = ['session', 'pontos', 'simulados', 'readArticles', 'lessonsDone', 'termsIntroduced',
    'studyPlanner', 'capi-wardrobe', 'doutrinaMeta', 'blitzBest', 'moods'];
  return libraryDb.transaction('r', libraryDb.cards, libraryDb.reviews, libraryDb.marks, libraryDb.kv, async () => {
    const [cards, reviews, marks, state, sequence] = await Promise.all([
      libraryDb.cards.count(), libraryDb.reviews.count(), libraryDb.marks.count(),
      libraryDb.kv.bulkGet(profileKeys), libraryDb.kv.where('key').startsWith('["sequencia",').count(),
    ]);
    return cards > 0 || reviews > 0 || marks > 0 || sequence > 0
      || state.some((row) => Array.isArray(row?.value) ? row.value.length > 0 : !!row?.value);
  });
}
