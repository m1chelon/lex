import { useState, type FormEvent } from 'react';
import { hasPrimaryProgress } from '../data/db';
import { activeProfile, createProfile, listProfiles, personalizePrimary, PRIMARY_PROFILE_ID, selectProfile, type ProfileKind } from '../data/profiles';
import { COURSE_NAME } from '../learn/plan';
import { ICheck, IChevR, IPeople, IUser } from '../ui/icons';
import { Mascot } from '../ui/Mascot';
import { PageHeader, Segmented, Sheet, toast, useAsync } from '../ui/primitives';
import { haptic, readProfileSettings, type Settings } from '../ui/settings';

const KINDS: { id: ProfileKind; label: string }[] = [
  { id: 'estudante', label: 'Estudante' },
  { id: 'assistente', label: 'Assistente' },
];

const MINUTES = [5, 10, 15, 20, 30];
const TIMES: { id: Settings['when']; label: string }[] = [
  { id: 'manha', label: 'Manhã' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' },
];

export const profileKindLabel = (kind: ProfileKind) => kind === 'assistente' ? 'Assistente' : 'Estudante';
export const profileDisplayName = (name: string, id: string) =>
  name.trim() || (id === PRIMARY_PROFILE_ID ? 'Meu perfil' : 'Perfil sem nome');

function NewProfileForm({ onCreate, first = false, preserve = false }: {
  onCreate: (id: string) => void; first?: boolean; preserve?: boolean;
}) {
  const initial = preserve ? readProfileSettings(PRIMARY_PROFILE_ID) : undefined;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProfileKind>('estudante');
  const [area, setArea] = useState<Settings['area']>(initial?.area ?? 'geral');
  const [dailyMinutes, setDailyMinutes] = useState(initial?.dailyMinutes ?? 15);
  const [when, setWhen] = useState<Settings['when']>(initial?.when ?? 'noite');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Informe um nome ou apelido.'); return; }
    setSaving(true);
    try {
      const preferences = { name, area, dailyMinutes, when };
      onCreate(preserve ? personalizePrimary(preferences) : createProfile({ ...preferences, kind }).id);
    } catch {
      setSaving(false);
      setError('Não foi possível salvar o perfil neste aparelho.');
    }
  };
  return (
    <form className="stack profile-form" onSubmit={submit}>
      {!first && <h2 className="title-m">Novo perfil</h2>}
      <label>Nome ou apelido
        <input className="input" value={name} onChange={(event) => { setName(event.target.value); setError(''); }}
          maxLength={24} required placeholder="Como a Capi vai te chamar" autoComplete="nickname" />
      </label>
      {!first && <fieldset>
        <legend>Tipo de perfil</legend>
        <Segmented label="Tipo de perfil" value={kind} options={KINDS} onChange={setKind} />
      </fieldset>}
      <label>Objetivo de estudo
        <select className="input" value={area} onChange={(event) => setArea(event.target.value as Settings['area'])}>
          <option value="geral">Direito em geral</option>
          <option value="tjsp">{COURSE_NAME.tjsp}</option>
          <option value="tjms">{COURSE_NAME.tjms}</option>
        </select>
      </label>
      <div className="profile-form-fields">
        <label>Meta diária
          <select className="input" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))}>
            {MINUTES.map((minutes) => <option value={minutes} key={minutes}>{minutes} min</option>)}
          </select>
        </label>
        <label>Horário preferido
          <select className="input" value={when} onChange={(event) => setWhen(event.target.value as Settings['when'])}>
            {TIMES.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="small profile-form-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={saving}>{preserve ? 'Salvar perfil e jogar' : first ? 'Criar perfil e jogar' : 'Criar perfil'}</button>
    </form>
  );
}

function switchTo(id: string) {
  haptic('soft');
  selectProfile(id);
  window.location.reload();
}

export function FirstProfileScreen({ preserve }: { preserve: boolean }) {
  return (
    <main className="screen profile-welcome" aria-labelledby="profile-welcome-title">
      <div className="profile-welcome-card glass">
        <Mascot size={78} decorative still />
        <h1 className="title-l" id="profile-welcome-title">{preserve ? 'Personalize seu perfil' : 'Crie seu perfil no LEX'}</h1>
        <p className="small muted">{preserve ? 'Escolha seu nome para jogar com o progresso já salvo.' : 'Escolha como a Capi vai te chamar e defina seu objetivo de estudo.'}</p>
        <NewProfileForm first preserve={preserve} onCreate={switchTo} />
      </div>
    </main>
  );
}

export function ProfilesScreen() {
  const primaryProgress = useAsync(() => hasPrimaryProgress().catch(() => false), []);
  const profiles = listProfiles(primaryProgress || undefined);
  const [creating, setCreating] = useState(false);
  return (
    <div className="stack local-profiles">
      <PageHeader title="Perfis" sub="Neste aparelho" />
      <p className="small muted">Cada perfil tem seu próprio progresso, preferências e Capi.</p>
      <ul className="stack profile-list" aria-label="Perfis neste aparelho">
        {profiles.map(({ id, kind }) => {
          const selected = id === activeProfile.id;
          const settings = readProfileSettings(id);
          const name = profileDisplayName(settings.name, id);
          const info = <span className="grow profile-name"><strong>{name}</strong><small>{profileKindLabel(kind)} · {settings.area === 'geral' ? 'Direito em geral' : COURSE_NAME[settings.area]}</small></span>;
          return (
            <li key={id}>
              {selected
                ? <div className="local-profile-row glass" aria-current="true">
                  <span className="profile-avatar"><Mascot size={42} avatar decorative /></span>
                  {info}<span className="profile-active"><ICheck size={15} /> Em uso</span>
                </div>
                : <button className="local-profile-row glass" type="button" aria-label={`Usar perfil ${name}`} onClick={() => {
                  try { switchTo(id); } catch { toast('Não foi possível abrir este perfil.'); }
                }}>
                  <span className="profile-avatar">{kind === 'assistente' ? <IPeople size={22} /> : <IUser size={22} />}</span>
                  {info}<IChevR size={17} />
                </button>}
            </li>
          );
        })}
      </ul>
      <button className="btn btn-primary btn-block" type="button" onClick={() => { haptic('tap'); setCreating(true); }}><IUser size={19} /> Novo perfil</button>
      <Sheet open={creating} onClose={() => setCreating(false)} label="Novo perfil" tall>
        <NewProfileForm onCreate={switchTo} />
      </Sheet>
    </div>
  );
}
