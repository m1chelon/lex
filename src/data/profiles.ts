import type { Settings } from '../ui/settings';

export type ProfileKind = 'estudante' | 'assistente';
interface LocalProfile { id: string; kind: ProfileKind; createdAt: number }
type ProfileSetup = Pick<Settings, 'name' | 'area' | 'dailyMinutes' | 'when'> & { kind: ProfileKind };

export const PRIMARY_PROFILE_ID = 'principal';
export const PROFILE_SETTINGS_KEY = 'lex.settings';
export const PROFILE_PLAN_KEY = 'lex.plan';
const ACTIVE_KEY = 'lex.active-profile';
const RECORD_PREFIX = 'lex.profiles.';
const primary: LocalProfile = { id: PRIMARY_PROFILE_ID, kind: 'estudante', createdAt: 0 };

function readProfile(id: string): LocalProfile | undefined {
  if (id === PRIMARY_PROFILE_ID) return primary;
  if (!/^[0-9a-f]{32}$/.test(id)) return;
  try {
    const stored = JSON.parse(localStorage.getItem(RECORD_PREFIX + id) ?? 'null') as LocalProfile | null;
    if (stored?.id === id && (stored.kind === 'estudante' || stored.kind === 'assistente') && Number.isFinite(stored.createdAt)) return stored;
  } catch { /* Registro indisponível. */ }
}

function selectedProfile() {
  try { return readProfile(localStorage.getItem(ACTIVE_KEY) ?? PRIMARY_PROFILE_ID) ?? primary; }
  catch { return primary; }
}

// Uma página usa o mesmo perfil até recarregar, inclusive durante gravações em andamento.
export const activeProfile = selectedProfile();

export const profileStorageKey = (key: string, id = activeProfile.id) =>
  id === PRIMARY_PROFILE_ID ? key : `lex.player.${id}.${key}`;

export const profileDatabaseName = (id = activeProfile.id) => id === PRIMARY_PROFILE_ID ? 'lex' : `lex-player-${id}`;

export function readProfilePlan(): unknown {
  try { return JSON.parse(localStorage.getItem(profileStorageKey(PROFILE_PLAN_KEY)) ?? 'null'); }
  catch { return null; }
}

function primarySettings(): Partial<Settings> {
  try { return JSON.parse(localStorage.getItem(PROFILE_SETTINGS_KEY) ?? '{}') ?? {}; }
  catch { return {}; }
}

export function primaryHasName() {
  const name = primarySettings().name;
  return typeof name === 'string' && !!name.trim();
}

export function primaryHasPreferences() {
  try { return Object.keys(primarySettings()).length > 0 || localStorage.getItem(PROFILE_PLAN_KEY) !== null; }
  catch { return false; }
}

export function listProfiles(includePrimary = activeProfile.id === PRIMARY_PROFILE_ID || primaryHasPreferences()) {
  const profiles = includePrimary ? [primary] : [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(RECORD_PREFIX)) continue;
      const entry = readProfile(key.slice(RECORD_PREFIX.length));
      if (entry && entry.id !== PRIMARY_PROFILE_ID) profiles.push(entry);
    }
  } catch { /* O perfil original continua acessível. */ }
  return profiles.sort((a, b) => a.createdAt - b.createdAt);
}

export function createProfile({ name, kind, area, dailyMinutes, when }: ProfileSetup) {
  const nickname = name.trim().slice(0, 24);
  if (!nickname) throw new Error('Informe um nome ou apelido.');
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const profile: LocalProfile = { id, kind, createdAt: Date.now() };
  const preferences = profileStorageKey(PROFILE_SETTINGS_KEY, id);
  localStorage.setItem(preferences, JSON.stringify({ name: nickname, area, dailyMinutes, when, weather: { on: false }, wellbeing: false }));
  try { localStorage.setItem(RECORD_PREFIX + id, JSON.stringify(profile)); }
  catch (error) { localStorage.removeItem(preferences); throw error; }
  return profile;
}

export function personalizePrimary({ name, area, dailyMinutes, when }: Omit<ProfileSetup, 'kind'>) {
  const nickname = name.trim().slice(0, 24);
  if (!nickname) throw new Error('Informe um nome ou apelido.');
  localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify({ ...primarySettings(), name: nickname, area, dailyMinutes, when }));
  return PRIMARY_PROFILE_ID;
}

export function selectProfile(id: string) {
  if (!readProfile(id)) throw new Error('Perfil indisponível neste aparelho.');
  localStorage.setItem(ACTIVE_KEY, id);
}
