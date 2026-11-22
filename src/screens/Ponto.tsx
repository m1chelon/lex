// Folha de ponto: bater o ponto do dia, calendário do mês, liga da semana e ranking (prévia).
import { motion } from 'motion/react';
import { useState } from 'react';
import { baterPonto, getPontos, ligaDaSemana, LIGAS, pontoStreak } from '../learn/ponto';
import { dayKey } from '../learn/mood';
import { getStats } from '../learn/stats';
import { Mascot } from '../ui/Mascot';
import { PageHeader, spring, toast, useAsync } from '../ui/primitives';
import { haptic, reducedMotion, useSettings } from '../ui/settings';
import { IBuilding, IColumns, IFlame, IGavel, IGlobe, IGroup, IPodium, IPunch, IScale, ICheck } from '../ui/icons';

const LIGA_ICON = [IGavel, IBuilding, IScale, IColumns, IPodium];
const WD = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function PontoScreen() {
  const [v, setV] = useState(0);
  const { name } = useSettings();
  const pontos = useAsync(getPontos, [v]) ?? [];
  const stats = useAsync(getStats, [v]);
  const liga = useAsync(ligaDaSemana, [v]);
  const hoje = pontos.find((p) => p.day === dayKey());
  const streak = pontoStreak(pontos);
  const studied = (stats?.todayCount ?? 0) > 0;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const marked = new Set(pontos.map((p) => p.day));
  const monthCount = pontos.filter((p) => p.day.startsWith(dayKey(first).slice(0, 7))).length;

  const bater = async () => {
    if (hoje) return;
    if (!studied) { haptic('bad'); toast('Faça pelo menos uma atividade hoje para bater o ponto.'); return; }
    try {
      await baterPonto(Math.round((stats?.todayMs ?? 0) / 60000));
      haptic('ok'); setV((x) => x + 1);
    } catch {
      toast('Não foi possível registrar o ponto. Tente de novo.');
    }
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Folha de ponto" sub="Presença diária, liga da semana e ranking" />

      <section className="ponto-hero card">
        <div className="row" style={{ gap: 14 }}>
          <Mascot mood={hoje ? 'cheer' : 'happy'} size={74} />
          <div className="grow">
            <div className="caps">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div className="title-m" style={{ marginTop: 2 }}>{hoje ? 'Ponto registrado' : studied ? 'Pronto para bater o ponto' : 'Estude para bater o ponto'}</div>
            <div className="xsmall muted" style={{ marginTop: 2 }}>{hoje ? `Às ${new Date(hoje.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${hoje.min} min de estudo` : studied ? `Boa${name ? `, ${name}` : ''}! Registre a presença de hoje.` : 'Uma atividade já vale. Sem estudo, sem ponto.'}</div>
          </div>
        </div>
        <motion.button className={`ponto-btn${hoje ? ' done' : ''}${!studied && !hoje ? ' off' : ''}`} whileTap={hoje ? undefined : { scale: 0.94 }} onClick={() => void bater()} aria-label={hoje ? 'Ponto já registrado hoje' : 'Bater o ponto'}>
          {hoje ? <motion.span className="ponto-stamp" initial={reducedMotion() ? false : { scale: 2.2, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={spring}>PRESENTE</motion.span> : <><IPunch size={22} /> Bater o ponto</>}
        </motion.button>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <span className="chip-stat"><IFlame size={15} /> {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          <span className="chip-stat"><ICheck size={15} /> {monthCount} no mês</span>
        </div>
      </section>

      <section className="card">
        <div className="row between"><div className="title-s">{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div><span className="xsmall muted">{monthCount}/{now.getDate()} dias</span></div>
        <div className="ponto-cal" role="grid" aria-label="Calendário de presença">
          {WD.map((d, i) => <span key={`h${i}`} className="pc-h">{d}</span>)}
          {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
            const k = dayKey(d); const on = marked.has(k); const isToday = k === dayKey(); const future = d > now;
            return <span key={k} className={`pc-d${on ? ' on' : ''}${isToday ? ' pc-today' : ''}${future ? ' fut' : ''}`} aria-label={`${i + 1}${on ? ', presente' : ''}`}>{on ? <ICheck size={13} /> : i + 1}</span>;
          })}
        </div>
      </section>

      {liga && (
        <section className="card">
          <div className="row between"><div className="title-s">Liga da semana</div><span className="xsmall muted">{liga.daysLeft === 1 ? 'termina hoje' : `faltam ${liga.daysLeft} dias`}</span></div>
          <div className="ligas" aria-label="Instâncias">
            {LIGAS.map((l, i) => { const I = LIGA_ICON[i]; return (
              <div key={l.id} className={`liga${i === liga.idx ? ' cur' : i < liga.idx ? ' past' : ''}`}><span className="liga-ico"><I size={18} /></span><span className="liga-n">{l.name}</span></div>
            ); })}
          </div>
          <div className="small" style={{ marginTop: 12 }}><strong>{liga.liga.name}</strong> · {liga.pts.toLocaleString('pt-BR')} pts nesta semana</div>
          <div className="xsmall muted">{liga.liga.desc}</div>
          {liga.next && <><div className="progress-track" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: `${Math.max(3, liga.pct * 100)}%` }} /></div><div className="xsmall muted" style={{ marginTop: 6 }}>Faltam {(liga.next.min - liga.pts).toLocaleString('pt-BR')} pts para subir para {liga.next.name}. A liga recomeça toda segunda.</div></>}
        </section>
      )}

      <div className="caps" style={{ margin: '4px 4px 0' }}>Ranking</div>
      <div className="list">
        {[
          { I: IGlobe, t: 'Ranking nacional', d: 'Todos os jogadores do LEX, por liga e pontos da semana.' },
          { I: IGroup, t: 'Entre colegas', d: 'Só você e seus amigos, adicionados por convite.' },
          { I: IColumns, t: 'Câmaras', d: 'Clubes de estudo: crie uma câmara com sua turma ou grupo de concurso.' },
        ].map(({ I, t, d }) => (
          <div key={t} className="list-item" style={{ opacity: 0.85 }}>
            <span className="law-glyph sm"><I size={17} /></span>
            <div className="grow"><div style={{ fontWeight: 620 }}>{t} <span className="soon">em breve</span></div><div className="xsmall muted">{d}</div></div>
          </div>
        ))}
      </div>
      <p className="xsmall faint" style={{ padding: '0 4px' }}>O ranking precisa de conta e servidor; chega na versão das lojas. Por enquanto, ponto e liga ficam só neste aparelho.</p>
    </div>
  );
}
