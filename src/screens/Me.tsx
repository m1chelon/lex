import { useEffect, useRef, useState } from 'react';
import { eraseProfileData, importBackup } from '../data/backup';
import { exportBackup } from '../data/profileBackup';
import { lockLex } from '../data/access';
import { activeProfile } from '../data/profiles';
import { Segmented, Sheet, toast, useAsync } from '../ui/primitives';
import { setSettings, useSettings, haptic } from '../ui/settings';
import { nav } from '../ui/nav';
import { db } from '../data/db';
import { getStats } from '../learn/stats';
import { getPlan } from '../learn/plan';
import { getCalibration } from '../learn/scheduler';
import { LEVELS } from './TermSheet';
import { IChevR, IExternal, IShield, IUpload, IFull, IInfo, ISettings, IBook, ISparkle, IHeart, IShieldLock, IDoc, IDownload, ITrash, ICart, IPeople } from '../ui/icons';
import { Mascot } from '../ui/Mascot';
import { profileDisplayName, profileKindLabel } from './Profiles';
import { startTour } from '../ui/Tour';
import { MoodSheet } from '../ui/Wellbeing';
import { doutrinaMeta, importDoutrina, removeDoutrina, type DoutrinaMeta } from '../learn/doutrinaStore';

type BIPEvent = Event & { prompt: () => Promise<void> };
let deferred: BIPEvent | null = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; });

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function Me() {
  const s = useSettings();
  const profileName = profileDisplayName(s.name, activeProfile.id);
  const stats = useAsync(getStats, []);
  const [install, setInstall] = useState(false);
  const [help, setHelp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => {}); }, []);
  const cal = getCalibration();

  const [dMeta, setDMeta] = useState<DoutrinaMeta | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [busyD, setBusyD] = useState(false);
  useEffect(() => { void doutrinaMeta().then(setDMeta); }, []);
  const exportData = async () => {
    try { await exportBackup(getPlan()); toast('Backup exportado'); }
    catch { toast('Não foi possível exportar o backup.'); }
  };
  const importData = async (f: File) => {
    try { await importBackup(f); toast('Progresso restaurado'); setTimeout(() => location.reload(), 600); } catch { toast('Arquivo de backup inválido'); }
  };
  const fullscreen = () => { const el = document.documentElement; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.().catch(() => toast('Tela cheia indisponível neste navegador')); };

  return (
    <div className="stack tab-content profile-settings">
      <div className="row between profile-header">
        <h1 className="title-xl">Você</h1>
        <button className="btn btn-quiet" onClick={() => setHelp(true)}><IInfo size={19} /> Ajuda e contato</button>
      </div>
      <div className="local-profile-row glass profile-current">
        <span className="profile-avatar"><Mascot size={42} avatar decorative /></span>
        <span className="grow profile-name"><strong>{profileName}</strong><small>{profileKindLabel(activeProfile.kind)} · Perfil ativo</small></span>
        <button className="btn btn-quiet btn-sm" onClick={() => { haptic('soft'); nav.push({ name: 'perfis' }); }}><IPeople size={18} /> Trocar perfil</button>
      </div>
      <div className="list">
        <button className="list-item" onClick={() => { haptic('soft'); nav.push({ name: 'capi-shop' }); }}>
          <ICart size={22} style={{ color: 'var(--gold)' }} /><div className="grow"><strong>Loja do Capi</strong><p className="small muted">Ternos, óculos e relógios</p></div><IChevR className="chev" />
        </button>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{stats?.streak ?? 0}</div><div className="xsmall muted">dias seguidos</div></div>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{stats?.learned ?? 0}</div><div className="xsmall muted">itens em memória</div></div>
        <div className="card grow" style={{ textAlign: 'center' }}><div className="title-l">{Math.round(cal.retention * 100)}%</div><div className="xsmall muted">retenção-alvo</div></div>
      </div>
      <p className="xsmall muted" style={{ padding: '0 4px' }}>A repetição espaçada usa o algoritmo FSRS. A retenção-alvo é ajustada automaticamente conforme seus acertos reais nas revisões ({cal.n} revisões analisadas).</p>

      <div className="caps" style={{ margin: '8px 4px 0' }}>Estudo</div>
      <div className="card stack" style={{ gap: 12 }}>
        <div className="small muted">Nível de explicação padrão</div>
        <Segmented label="Nível de explicação" value={s.level} options={LEVELS} onChange={(l) => setSettings({ level: l })} />
        <div className="small muted">Meta diária</div>
        <div className="chips">{[5, 10, 15, 20, 30].map((m) => <button key={m} className="chip" aria-pressed={s.dailyMinutes === m} onClick={() => setSettings({ dailyMinutes: m })}>{m} min</button>)}</div>
        <label className="row between small"><span>Bem-estar: check-in de humor no fim do dia (opcional)</span><input type="checkbox" checked={s.wellbeing} onChange={(e) => setSettings({ wellbeing: e.target.checked })} /></label>
        <label className="row between small"><span>Sublinhar todas as ocorrências de termos</span><input type="checkbox" checked={s.underlineAll} onChange={(e) => setSettings({ underlineAll: e.target.checked })} /></label>
      </div>

      <div className="list">
        <button className="list-item" onClick={() => startTour()}><span style={{ width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#a2aafe,#6f79e8)', color: '#fff' }}><ISparkle size={18} /></span><div className="grow"><div style={{ fontWeight: 620 }}>Rever o tutorial da Capi</div><div className="xsmall muted">Um passeio de 1 minuto pelo app</div></div><IChevR className="chev" /></button>
        {s.wellbeing && <button className="list-item" onClick={() => setMoodOpen(true)}><span style={{ width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#5fd3c4,#2bb5a8)', color: '#fff' }}><IHeart size={18} /></span><div className="grow"><div style={{ fontWeight: 620 }}>Bem-estar</div><div className="xsmall muted">Check-in do dia e respiração guiada</div></div><IChevR className="chev" /></button>}
      </div>
      <MoodSheet open={moodOpen} onClose={() => setMoodOpen(false)} />

      <div className="caps" style={{ margin: '8px 4px 0' }}>Aparência</div>
      <div className="card stack" style={{ gap: 10 }}>
        <label className="stack" style={{ gap: 6 }}><span className="small" style={{ fontWeight: 620 }}>Como a Capi te chama</span><input className="input" value={s.name} maxLength={24} placeholder="Seu nome ou apelido" onChange={(e) => setSettings({ name: e.target.value })} /></label>
        <label className="row between small"><span>Clima e localização do Capi{s.weather.city ? ` (${s.weather.city})` : ''}</span><input type="checkbox" checked={s.weather.on} onChange={(e) => setSettings({ weather: { ...s.weather, on: e.target.checked } })} /></label>
      </div>

      <div className="caps" style={{ margin: '8px 4px 0' }}>Leitura</div>
      <div className="card stack" style={{ gap: 12 }}>
        <Segmented label="Fonte da lei" value={s.lawFont} options={[{ id: 'sans', label: 'Sem serifa' }, { id: 'serif', label: 'Com serifa' }]} onChange={(v) => setSettings({ lawFont: v })} />
        <Segmented label="Tamanho do texto" value={s.textSize} options={[{ id: 'm', label: 'Padrão' }, { id: 'l', label: 'Grande' }, { id: 'xl', label: 'Maior' }]} onChange={(v) => setSettings({ textSize: v })} />
        <p className="law" style={{ fontSize: 'var(--law-size)' }}><span className="law-lab">Art. 46</span> Posse é o ato que investe o cidadão em cargo público.</p>
      </div>

      <div className="caps" style={{ margin: '8px 4px 0' }}>Acessibilidade e desempenho</div>
      <div className="card stack" style={{ gap: 12 }}>
        <div className="small muted">Transparência (Liquid Glass)</div>
        <Segmented label="Transparência" value={s.transparency} options={[{ id: 'auto', label: 'Sistema' }, { id: 'full', label: 'Vidro' }, { id: 'reduced', label: 'Reduzida' }]} onChange={(v) => setSettings({ transparency: v })} />
        <div className="small muted">Movimento</div>
        <Segmented label="Movimento" value={s.motion} options={[{ id: 'auto', label: 'Sistema' }, { id: 'full', label: 'Completo' }, { id: 'reduced', label: 'Reduzido' }]} onChange={(v) => setSettings({ motion: v })} />
        <label className="row between small"><span>Modo de desempenho (sem desfoque)</span><input type="checkbox" checked={s.perf === 'low'} onChange={(e) => setSettings({ perf: e.target.checked ? 'low' : 'auto' })} /></label>
        <label className="row between small"><span>Vibração (quando o aparelho permite)</span><input type="checkbox" checked={s.haptics} onChange={(e) => { setSettings({ haptics: e.target.checked }); haptic('ok'); }} /></label>
        <button className="row small" style={{ gap: 8 }} onClick={fullscreen}><IFull size={17} /> Alternar tela cheia</button>
        {!isStandalone() && <button className="row small muted" style={{ gap: 8 }} onClick={async () => { if (deferred) { await deferred.prompt(); deferred = null; } else setInstall(true); }}><IUpload size={17} /> Instalar na tela de início (recomendado)</button>}
      </div>

      <div className="caps" style={{ margin: '8px 4px 0' }}>Doutrina (acervo pessoal)</div>
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', color: '#fff', flex: 'none', background: 'linear-gradient(160deg, #a78bfa, #8b5cf6)' }}><IBook size={21} /></span>
          <div className="grow">
            <div style={{ fontWeight: 650 }}>{dMeta ? 'Doutrina instalada' : 'Doutrina não instalada'}</div>
            <div className="xsmall muted">{dMeta ? `${dMeta.artigos.toLocaleString('pt-BR')} artigos comentados em ${dMeta.leis} leis · importada em ${new Date(dMeta.importadoEm).toLocaleDateString('pt-BR')}` : 'Importe o arquivo lex-doutrina.json para consultar os comentários do seu acervo no artigo, em Direito.'}</div>
          </div>
        </div>
        <label className="btn btn-quiet btn-sm" style={{ cursor: 'pointer' }}>{busyD ? 'Importando…' : dMeta ? 'Atualizar com novo arquivo' : 'Importar doutrina'}
          <input type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setBusyD(true); try { const m = await importDoutrina(f); setDMeta(m); haptic('ok'); toast(`Doutrina importada: ${m.artigos.toLocaleString('pt-BR')} artigos`); } catch (err) { toast((err as Error).message || 'Não foi possível importar'); } finally { setBusyD(false); } }} />
        </label>
        {dMeta && <button className="small muted" style={{ alignSelf: 'flex-start' }} onClick={async () => { await removeDoutrina(); setDMeta(null); toast('Doutrina removida deste aparelho'); }}>Remover do aparelho</button>}
        <p className="xsmall faint">Os trechos ficam só neste aparelho e não entram no backup do progresso. Uso pessoal.</p>
      </div>

      <div className="caps" style={{ margin: '8px 4px 0' }}>Sobre</div>
      <div className="list">
        {([['privacidade', 'Política de Privacidade', 'Como seus dados são tratados (LGPD)', 'linear-gradient(160deg,#6ea0ff,#3d6fe0)', <IShieldLock size={18} />], ['termos', 'Termos de Uso', 'Fontes oficiais, limites e responsabilidades', 'linear-gradient(160deg,#a2aafe,#6f79e8)', <IDoc size={18} />], ['sobre', 'Sobre o LEX', 'Versão, fontes da legislação e licenças', 'linear-gradient(160deg,#ffb347,#f57c2b)', <IInfo size={18} />]] as const).map(([id, t, d, bg, ic]) => (
          <button key={id} className="list-item" onClick={() => nav.push({ name: 'legal', doc: id })}><span className="set-ico" style={{ background: bg }}>{ic}</span><div className="grow"><div style={{ fontWeight: 620 }}>{t}</div><div className="xsmall muted">{d}</div></div><IChevR className="chev" /></button>
        ))}
      </div>

      <div className="caps" style={{ margin: '8px 4px 0' }}>Dados</div>
      <div className="list">
        <button className="list-item" onClick={lockLex}><IShieldLock /><div className="grow">Bloquear o LEX</div></button>
        <button className="list-item" onClick={() => nav.push({ name: 'admin' })}><IShield style={{ color: 'var(--gold)' }} /><div className="grow"><div style={{ fontWeight: 620 }}>Fontes, cobertura e integridade</div><div className="xsmall muted">Painel administrativo de importação</div></div><IChevR className="chev" /></button>
        <button className="list-item" onClick={exportData}><span className="set-ico" style={{ background: 'linear-gradient(160deg,#5fd3c4,#2bb5a8)' }}><IDownload size={18} /></span><div className="grow">Exportar backup do progresso</div></button>
        <button className="list-item" type="button" onClick={() => backupInput.current?.click()}><span className="set-ico" style={{ background: 'linear-gradient(160deg,#8fd16a,#4fae3c)' }}><IUpload size={18} /></span><div className="grow">Restaurar backup</div></button>
        <input ref={backupInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importData(file); }} />
        <button className="list-item" onClick={async () => { const ok = await navigator.storage?.persist?.(); setPersisted(!!ok); toast(ok ? 'Armazenamento protegido' : 'O navegador não concedeu proteção'); }}><IInfo /><div className="grow">Proteger dados contra limpeza automática<div className="xsmall muted">{persisted ? 'Ativo' : 'Recomendado'}</div></div></button>
        <button className="list-item" style={{ color: 'var(--bad)' }} onClick={() => setConfirmReset(true)}><span className="set-ico" style={{ background: 'linear-gradient(160deg,#fb7185,#e11d48)' }}><ITrash size={18} /></span><div className="grow">Apagar dados do perfil</div></button>
      </div>
      <p className="xsmall faint" style={{ padding: '0 4px' }}>Seu progresso, destaques e anotações ficam apenas neste aparelho. Use o backup para trocar de aparelho.</p>

      <Sheet open={help} onClose={() => setHelp(false)} label="Ajuda e contato">
        <div className="stack">
          <h2 className="title-m">Ajuda e contato</h2>
          <div className="stack">
            <p className="small"><strong>Onde retomar?</strong> O Início mostra a sessão em andamento em Seu estudo.</p>
            <p className="small"><strong>Como mudar o treino?</strong> Abra Jogar e toque em Ajustar treino para escolher a matéria, o modo e a duração.</p>
            <p className="small"><strong>Como levar o progresso para outro aparelho?</strong> Exporte o backup na seção Dados do perfil.</p>
          </div>
          <a className="btn btn-quiet btn-block" href="https://github.com/m1chelon/lex/issues" target="_blank" rel="noreferrer"><IExternal size={17} /> Relatar um problema no GitHub</a>
          <button className="btn btn-quiet btn-block" onClick={() => setHelp(false)}>Fechar ajuda</button>
        </div>
      </Sheet>
      <Sheet open={install} onClose={() => setInstall(false)} label="Instalar">
        <div className="title-m" style={{ marginBottom: 6 }}>Instalar o LEX no iPhone</div>
        <p className="small muted" style={{ marginBottom: 12 }}>Instalado na tela de início, o LEX abre em tela cheia e pode usar offline as leis já baixadas. Exporte um backup para guardar uma cópia do seu progresso.</p>
        {isIOS() ? (
          <ol className="small stack" style={{ gap: 10, paddingLeft: 18, lineHeight: 1.5 }}>
            <li>Abra este endereço no <strong>Safari</strong>.</li>
            <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
            <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
            <li>Abra o LEX pelo novo ícone e, na primeira vez, importe a doutrina em Você → Doutrina (o app instalado tem armazenamento próprio).</li>
          </ol>
        ) : (
          <ol className="small stack" style={{ gap: 10, paddingLeft: 18, lineHeight: 1.5 }}>
            <li>No Chrome/Edge, abra o menu (⋮).</li>
            <li>Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
          </ol>
        )}
        <p className="xsmall muted" style={{ marginTop: 12 }}>No iPhone, o Safari não permite vibração para apps web; os demais recursos funcionam normalmente.</p>
      </Sheet>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} label="Apagar dados do perfil">
        <div className="title-m">Apagar dados do perfil?</div>
        <p className="small muted" style={{ margin: '8px 0 16px' }}>Esta ação apaga deste aparelho o progresso, as anotações, o acervo pessoal e as preferências de {profileName}. Para guardar o progresso, exporte o backup antes.</p>
        <button className="btn btn-block" style={{ background: 'var(--bad)', color: '#1a0d0b' }} onClick={async () => { try { await eraseProfileData(); toast('Dados do perfil apagados'); setConfirmReset(false); setTimeout(() => location.reload(), 500); } catch { toast('Não foi possível apagar os dados.'); } }}>Apagar dados do perfil</button>
      </Sheet>
    </div>
  );
}
