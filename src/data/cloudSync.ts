// Conta Google opcional e sincronização do progresso entre aparelhos (Firebase).
// O SDK só é baixado quando a pessoa entra na conta ou já tinha entrado antes, então quem não usa
// login não paga o peso do Firebase. O progresso continua guardado no aparelho (IndexedDB); a nuvem
// guarda uma cópia do backup do perfil, e cada sincronização junta as duas (importBackup) antes de
// enviar a versão unificada.
import { useSyncExternalStore } from 'react';
import { createBackupBlob } from './profileBackup';
import { importBackup } from './backup';
import { activeProfile } from './profiles';

const firebaseConfig = {
  apiKey: 'AIzaSyDiUBJcCgQGvbe2kZhX7ivQB9JOrw-Ow1w',
  authDomain: 'lex-estudos-fb5d4.firebaseapp.com',
  projectId: 'lex-estudos-fb5d4',
  storageBucket: 'lex-estudos-fb5d4.firebasestorage.app',
  messagingSenderId: '766402170997',
  appId: '1:766402170997:web:b544471bdd62189be8683c',
};

/** Check-ins de humor são dado de saúde e, pela política de privacidade, nunca saem do aparelho. */
const LOCAL_ONLY_KEYS = new Set(['moods']);
/** Cada documento do Firestore aceita até 1 MiB; os pedaços ficam bem abaixo disso. */
const CHUNK = 700_000;
const SIGNED_HINT = 'lex.cloud.signed';
const REMOTE_AT = (uid: string) => `lex.cloud.remoteAt.${uid}.${activeProfile.id}`;

export type CloudUser = { uid: string; name: string; email: string; photo?: string };
export type CloudState = {
  status: 'off' | 'loading' | 'signed-out' | 'signed-in';
  user?: CloudUser;
  syncing: boolean;
  lastSync?: number;
  error?: string;
};

let state: CloudState = { status: hasHint() ? 'loading' : 'off', syncing: false };
const listeners = new Set<() => void>();
function set(patch: Partial<CloudState>) { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); }
export const cloudState = () => state;
export function useCloud() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, cloudState, cloudState);
}

function hasHint() { try { return localStorage.getItem(SIGNED_HINT) === '1'; } catch { return false; } }
function setHint(on: boolean) { try { if (on) localStorage.setItem(SIGNED_HINT, '1'); else localStorage.removeItem(SIGNED_HINT); } catch { /* sem armazenamento */ } }

type Sdk = Awaited<ReturnType<typeof loadSdk>>;
let sdk: Promise<Sdk> | null = null;
async function loadSdk() {
  const [{ initializeApp }, auth, store] = await Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite'),
  ]);
  const app = initializeApp(firebaseConfig);
  const a = auth.initializeAuth(app, {
    persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence],
    popupRedirectResolver: auth.browserPopupRedirectResolver,
  });
  a.languageCode = 'pt-BR';
  return { auth, store, a, db: store.getFirestore(app) };
}
function ensureSdk() {
  if (!sdk) {
    sdk = loadSdk().then((s) => {
      s.auth.onAuthStateChanged(s.a, (u) => {
        if (u) {
          setHint(true);
          set({ status: 'signed-in', user: { uid: u.uid, name: u.displayName ?? 'Conta Google', email: u.email ?? '', photo: u.photoURL ?? undefined }, error: undefined });
          void syncNow();
        } else {
          setHint(false);
          set({ status: 'signed-out', user: undefined, syncing: false });
        }
      });
      void s.auth.getRedirectResult(s.a).catch((e) => set({ error: friendly(e) }));
      return s;
    }).catch((e) => { sdk = null; set({ status: 'signed-out', error: friendly(e) }); throw e; });
  }
  return sdk;
}

function friendly(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return undefined;
  if (code.includes('network') || code.includes('unavailable')) return 'Sem conexão. A sincronização volta quando a internet voltar.';
  if (code.includes('unauthorized-domain')) return 'Este endereço não está autorizado para login.';
  if (code.includes('permission-denied')) return 'A nuvem recusou o acesso. Saia e entre de novo.';
  return 'Não foi possível concluir. Tente de novo em instantes.';
}

/** Retoma a sessão de quem já entrou antes; para os demais, nada é baixado. */
export function initCloud() {
  if (hasHint()) void ensureSdk().catch(() => {});
  if (typeof window !== 'undefined') {
    // Envia o que mudou quando o app vai para segundo plano (fechar, trocar de app).
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') scheduleSync(0); });
    window.addEventListener('online', () => scheduleSync(0));
  }
}

export async function signInWithGoogle() {
  set({ error: undefined });
  const s = await ensureSdk();
  const provider = new s.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await s.auth.signInWithPopup(s.a, provider);
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    // Navegadores que bloqueiam janelas (alguns apps instalados no iPhone) usam o redirecionamento.
    if (code.includes('popup-blocked') || code.includes('operation-not-supported')) await s.auth.signInWithRedirect(s.a, provider);
    else { set({ error: friendly(e) }); throw e; }
  }
}

export async function signOutCloud() {
  if (state.status === 'signed-in') await syncNow().catch(() => {});
  const s = await ensureSdk();
  await s.auth.signOut(s.a);
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Agenda uma sincronização (por exemplo, ao terminar um treino). Só age para quem entrou. */
export function scheduleSync(delay = 4000) {
  if (state.status !== 'signed-in') return;
  clearTimeout(timer);
  timer = setTimeout(() => { void syncNow(); }, delay);
}

async function gzip(text: string) {
  if (typeof CompressionStream === 'undefined') return { data: text, gz: false };
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { data: btoa(bin), gz: true };
}
async function gunzip(data: string, gz: boolean) {
  if (!gz) return data;
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function stripLocalOnly(json: string) {
  const data = JSON.parse(json) as { kv?: { key: string }[] };
  data.kv = (data.kv ?? []).filter(({ key }) => !LOCAL_ONLY_KEYS.has(key));
  return JSON.stringify(data);
}

let running: Promise<void> | null = null;
/** Baixa a cópia da nuvem, junta com o aparelho e envia o resultado. */
export function syncNow(): Promise<void> {
  if (state.status !== 'signed-in' || !state.user) return Promise.resolve();
  if (running) return running;
  const uid = state.user.uid;
  running = (async () => {
    set({ syncing: true, error: undefined });
    try {
      const s = await ensureSdk();
      const { doc, getDoc, setDoc, writeBatch } = s.store;
      const base = `users/${uid}/profiles/${activeProfile.id}`;
      const metaRef = doc(s.db, `${base}/backup/meta`);
      const meta = await getDoc(metaRef);
      const remote = meta.exists() ? meta.data() as { at: number; chunks: number; gz: boolean } : null;
      let seen = 0;
      try { seen = Number(localStorage.getItem(REMOTE_AT(uid))) || 0; } catch { /* sem armazenamento */ }
      if (remote && remote.at > seen) {
        const parts = await Promise.all(Array.from({ length: remote.chunks }, (_, i) => getDoc(doc(s.db, `${base}/backup/c${i}`))));
        const encoded = parts.map((p) => (p.data() as { d: string } | undefined)?.d ?? '').join('');
        const json = await gunzip(encoded, remote.gz);
        await importBackup({ text: async () => json });
      }
      const local = stripLocalOnly(await (await createBackupBlob()).text());
      const { data, gz } = await gzip(local);
      const chunks = Math.max(1, Math.ceil(data.length / CHUNK));
      const at = Date.now();
      const batch = writeBatch(s.db);
      for (let i = 0; i < chunks; i++) batch.set(doc(s.db, `${base}/backup/c${i}`), { d: data.slice(i * CHUNK, (i + 1) * CHUNK) });
      batch.set(metaRef, { at, chunks, gz, size: local.length, device: navigator.userAgent.slice(0, 120) });
      await batch.commit();
      await setDoc(doc(s.db, `users/${uid}`), { name: state.user?.name ?? '', lastSync: at }, { merge: true });
      try { localStorage.setItem(REMOTE_AT(uid), String(at)); } catch { /* sem armazenamento */ }
      set({ syncing: false, lastSync: at });
    } catch (e) {
      set({ syncing: false, error: friendly(e) });
    } finally {
      running = null;
    }
  })();
  return running;
}
