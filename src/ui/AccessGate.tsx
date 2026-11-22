import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { hasLexAccess, pinConfigured, unlockLex } from '../data/access';
import { IShieldLock } from './icons';

export function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(hasLexAccess);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || pin.length !== 4) return;
    submitting.current = true;
    setBusy(true);
    try {
      const status = await unlockLex(pin);
      if (status === 'ok') {
        setPin('');
        setUnlocked(true);
      } else {
        setPin('');
        setError(status === 'wait' ? 'Aguarde 30 segundos e tente novamente.' : 'PIN incorreto. Tente novamente.');
        input.current?.focus();
      }
    } catch {
      setError('Não foi possível verificar o PIN neste navegador. Recarregue o LEX e tente novamente.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (unlocked) return children;
  return (
    <main className="access-shell">
      <form className="access-panel glass stack" onSubmit={(event) => void submit(event)} aria-labelledby="access-title">
        <span className="access-icon" aria-hidden="true"><IShieldLock size={32} /></span>
        <div>
          <h1 id="access-title">Desbloquear o LEX</h1>
          <p className="muted">{pinConfigured ? 'Digite seu PIN de quatro dígitos para começar.' : 'O PIN de acesso precisa ser configurado nesta instalação.'}</p>
        </div>
        <label className="access-field" htmlFor="lex-pin">PIN de acesso
          <input ref={input} id="lex-pin" className="input" type="password" inputMode="numeric" autoComplete="off"
            enterKeyHint="go" maxLength={4} pattern="[0-9]{4}" required disabled={!pinConfigured} value={pin} aria-invalid={!!error}
            aria-describedby={error ? 'access-error' : undefined}
            onChange={(event) => { setPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setError(''); }} />
        </label>
        {error && <p id="access-error" className="small access-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={!pinConfigured || busy || pin.length !== 4}>
          {busy ? 'Verificando…' : 'Desbloquear'}
        </button>
      </form>
    </main>
  );
}
