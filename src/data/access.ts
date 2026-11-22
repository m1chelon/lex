const PIN_SALT = import.meta.env.VITE_LEX_PIN_SALT ?? '';
const PIN_HASH = import.meta.env.VITE_LEX_PIN_HASH ?? '';
export const pinConfigured = /^[0-9a-f]{32}$/.test(PIN_SALT) && /^[0-9a-f]{64}$/.test(PIN_HASH);
const ACCESS_KEY = 'lex.access.unlocked';
const ATTEMPTS_KEY = 'lex.access.attempts';
const MAX_ATTEMPTS = 5;
const RETRY_MS = 30_000;

interface Attempts { count: number; retryAt: number }
let attempts: Attempts = { count: 0, retryAt: 0 };

function readAttempts() {
  try {
    const stored: Attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? 'null');
    if (stored && Number.isInteger(stored.count) && Number.isFinite(stored.retryAt)) return stored;
  } catch { /* Use a contagem em memória. */ }
  return attempts;
}

function saveAttempts(value: Attempts) {
  attempts = value;
  try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(value)); } catch { /* A contagem em memória continua ativa. */ }
}

export function hasLexAccess() {
  try { return pinConfigured && sessionStorage.getItem(ACCESS_KEY) === PIN_HASH; }
  catch { return false; }
}

export async function unlockLex(pin: string): Promise<'ok' | 'invalid' | 'wait'> {
  if (!pinConfigured) throw new Error('PIN não configurado.');
  if (!/^[0-9]{4}$/.test(pin)) return 'invalid';
  if (readAttempts().retryAt > Date.now()) return 'wait';

  const bytes = new TextEncoder().encode(`${PIN_SALT}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hash === PIN_HASH) {
    saveAttempts({ count: 0, retryAt: 0 });
    try { sessionStorage.setItem(ACCESS_KEY, PIN_HASH); } catch { /* A abertura pode valer só nesta página. */ }
    return 'ok';
  }

  const { count, retryAt } = readAttempts();
  if (retryAt > Date.now()) return 'wait';
  if (count + 1 < MAX_ATTEMPTS) {
    saveAttempts({ count: count + 1, retryAt: 0 });
    return 'invalid';
  }
  saveAttempts({ count: 0, retryAt: Date.now() + RETRY_MS });
  return 'wait';
}

export function lockLex() {
  try { sessionStorage.removeItem(ACCESS_KEY); }
  finally { window.location.reload(); }
}
