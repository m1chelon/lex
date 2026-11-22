import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { exportBackup } from './data/profileBackup';
import { activeProfile, listProfiles, selectProfile } from './data/profiles';
import { IDownload, IShieldLock } from './ui/icons';
import { readProfileSettings } from './ui/settings';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/aura.css';
import './styles/glass.css';
import './styles/atmosphere.css';

const PRIVATE_LEX = 'https://lex-previa.fjcbr8dr69.chatgpt.site';

function Portal() {
  const [profiles] = useState(listProfiles);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try { await exportBackup(); setStatus('Backup enviado para seus downloads.'); }
    catch { setStatus('Não foi possível baixar o backup. Tente novamente.'); }
    finally { setBusy(false); }
  };

  return (
    <main className="access-shell">
      <section className="access-panel glass stack" aria-labelledby="portal-lex">
        <span className="access-icon" aria-hidden="true"><IShieldLock size={32} /></span>
        <div>
          <h1 id="portal-lex">LEX</h1>
          <p className="muted">Entre com sua conta para abrir o jogo privado.</p>
        </div>
        <a className="btn btn-primary btn-block" href={PRIVATE_LEX}>Abrir o LEX privado</a>
        <details className="stack portal-backup">
          <summary>Trazer meu progresso do GitHub</summary>
          <p className="small muted">Baixe o backup neste aparelho. No LEX privado, abra Perfil e toque em Restaurar backup.</p>
          {profiles.length > 1 && <label className="access-field">Perfil para exportar
            <select className="input" value={activeProfile.id} onChange={(event) => {
              try { selectProfile(event.target.value); window.location.reload(); }
              catch { setStatus('Não foi possível abrir esse perfil.'); }
            }}>
              {profiles.map(({ id }) => <option value={id} key={id}>{readProfileSettings(id).name || 'Meu perfil'}</option>)}
            </select>
          </label>}
          <button className="btn btn-quiet btn-block" type="button" disabled={busy} onClick={() => void download()}>
            <IDownload size={17} /> {busy ? 'Preparando backup…' : 'Baixar meu progresso'}
          </button>
          {status && <p className="small" role="status">{status}</p>}
        </details>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Portal />);
