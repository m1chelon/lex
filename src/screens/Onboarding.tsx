// Primeira abertura: 4 passos curtos (objetivo, tempo, horário, nome), no estilo do onboarding do Aura.
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { AreaId } from '../core/areas';
import { areaLaws } from '../core/areas';
import { ensureLaws } from '../data/corpus';
import { kvSet } from '../data/db';
import { nav } from '../ui/nav';
import { savePlan } from '../learn/plan';
import { TILE, GlyphTile } from '../ui/IconTile';
import { Mascot } from '../ui/Mascot';
import { Flag } from '../ui/Flags';
import { haptic, reducedMotion, setSettings } from '../ui/settings';
import { Sheet, spring, toast } from '../ui/primitives';
import { importBackup } from '../data/backup';
import { LegalBody, LEGAL_TITLE, type LegalDocId } from './Legal';
import { IUrna, IBriefcase, IChevL, IBolt, IBrain, IPunch, IUpload, IClock, IGavel, IInfinity, IMoon, IScale, ISun, ISunrise } from '../ui/icons';

type Goal = { id: string; area: AreaId; focus: string; title: string; sub: string; color: keyof typeof TILE; icon: JSX.Element };
const GOALS: Goal[] = [
  { id: 'geral', area: 'geral', focus: 'law:cf', title: 'Direito em geral', sub: 'Você escolhe o ramo e a lei', color: 'peri', icon: <IScale /> },
  { id: 'tjsp', area: 'tjsp', focus: 'auto', title: 'TJSP · Escrevente', sub: 'Edital 02/2026', color: 'orange', icon: <IGavel /> },
  { id: 'tjms', area: 'tjms', focus: 'auto', title: 'TJMS · Analista', sub: 'Edital FGV 2025', color: 'teal', icon: <IBriefcase /> },
  { id: 'eleitoral', area: 'geral', focus: 'ramo:Eleitoral', title: 'Direito Eleitoral', sub: 'Código, leis e LC 64', color: 'green', icon: <IUrna /> },
];

/** Tela de boas-vindas (primeira abertura): apresenta o app e leva ao cadastro ou à restauração. */
function Welcome({ onStart, onPersonalize }: { onStart: () => void; onPersonalize: () => void }) {
  const [doc, setDoc] = useState<LegalDocId | null>(null);
  const restore = async (f?: File) => {
    if (!f) return;
    try { await importBackup(f); toast('Progresso restaurado'); setTimeout(() => location.reload(), 600); } catch { toast('Arquivo de backup inválido'); }
  };
  const FEATS = [
    { I: IBrain, t: 'Lei seca que fica', d: 'Complete lacunas com opções e revise o que aprendeu' },
    { I: IBolt, t: 'Casos, simulados e Relâmpago', d: 'Treine no ritmo e na pressão da prova' },
    { I: IPunch, t: 'Ponto diário e ligas', d: 'Da Vara ao Supremo, toda semana' },
  ];
  return (
    <div className="welcome">
      <motion.div className="wl-hero" initial={reducedMotion() ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <div className="wl-orb"><Mascot mood="cheer" size={150} /></div>
        <h1 className="wl-title">LEX</h1>
        <p className="wl-sub">Aprenda a lei jogando, artigo por artigo, com a Capi.</p>
      </motion.div>
      <div className="wl-feats">
        {FEATS.map(({ I, t, d }, i) => (
          <motion.div key={t} className="wl-feat" initial={reducedMotion() ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.15 + i * 0.08 }}>
            <span className="law-glyph sm"><I size={17} /></span><div><b>{t}</b><small>{d}</small></div>
          </motion.div>
        ))}
      </div>
      <div className="stack" style={{ gap: 10, marginTop: 'auto' }}>
        <button className="pill-cta" onClick={() => { haptic('ok'); onStart(); }}>Jogar agora</button>
        <button className="btn btn-quiet btn-block" onClick={onPersonalize}>Personalizar estudo</button>
        <label className="btn btn-ghost btn-block" style={{ cursor: 'pointer' }}><IUpload size={17} /> Já tenho um backup<input type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e.target.files?.[0])} /></label>
        <p className="xsmall faint" style={{ textAlign: 'center' }}>Ao continuar, você concorda com os <button className="link" onClick={() => setDoc('termos')}>Termos de Uso</button> e a <button className="link" onClick={() => setDoc('privacidade')}>Política de Privacidade</button>. Sem conta: tudo fica no seu aparelho.</p>
      </div>
      <Sheet open={!!doc} onClose={() => setDoc(null)} label={doc ? LEGAL_TITLE[doc] : ''} tall>
        {doc && <><div className="title-m" style={{ marginBottom: 12 }}>{LEGAL_TITLE[doc]}</div><LegalBody doc={doc} /></>}
      </Sheet>
    </div>
  );
}

export function Onboarding() {
  const [welcome, setWelcome] = useState(true);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>(GOALS[0]);
  const [mins, setMins] = useState(15);
  const [when, setWhen] = useState<'manha' | 'tarde' | 'noite'>('noite');
  const [name, setName] = useState('');
  const total = 4;
  const next = async () => {
    haptic('tap');
    if (step < total - 1) { setStep(step + 1); return; }
    haptic('ok');
    setSettings({ area: goal.area, dailyMinutes: mins, when, name: name.trim().slice(0, 24), onboarded: true });
    // Cursos e Eleitoral já abrem com o recorte selecionado.
    const minutes = Math.min(mins, 30);
    if (goal.area === 'tjsp' || goal.area === 'tjms') savePlan({ scope: { kind: 'curso', area: goal.area }, mode: 'memorizar', minutes });
    else if (goal.id === 'eleitoral') savePlan({ scope: { kind: 'geral', ramo: 'Eleitoral' }, mode: 'memorizar', minutes });
    nav.push({ name: 'jogar' });
    void ensureLaws(goal.id === 'eleitoral' ? ['ce', 'l9504', 'lc64', 'l9096'] : goal.area === 'geral' ? [] : areaLaws(goal.area));
  };
  const Q = [
    { q: 'O que te traz aqui?', sub: 'Dá para mudar a qualquer momento no botão Jogar.' },
    { q: 'Quanto tempo por dia?', sub: 'Sessões curtas e diárias fixam a lei melhor do que maratonas.' },
    { q: 'Quando você prefere estudar?', sub: 'A Capi ajusta as mensagens ao seu horário.' },
    { q: 'Como a Capi pode te chamar?', sub: 'Opcional — fica só no seu aparelho.' },
  ][step];
  if (welcome) return <Welcome onPersonalize={() => setWelcome(false)} onStart={() => { setSettings({ onboarded: true }); nav.push({ name: 'jogar' }); }} />;
  return (
    <div className="ob">
      <div className="row" style={{ gap: 10 }}>
        <button className="icon-btn glass" aria-label="Voltar" onClick={() => (step > 0 ? setStep(step - 1) : setWelcome(true))}><IChevL /></button>
        <div className="grow"><div className="ob-step">{step + 1} de {total}</div><div className="ob-bar" style={{ marginTop: 6 }}><div style={{ width: `${((step + 1) / total) * 100}%` }} /></div></div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} className="stack" style={{ gap: 18, marginTop: 10 }} initial={reducedMotion() ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion() ? undefined : { opacity: 0, x: -24 }} transition={spring}>
          <h1 className="ob-q">{Q.q}</h1>
          <div className="ob-sub">{Q.sub}</div>
          {step === 0 && (
            <div className="ob-tiles">
              {GOALS.map((g) => (
                <button key={g.id} className="ob-tile" style={{ background: TILE[g.color] }} aria-pressed={goal.id === g.id} onClick={() => { haptic('soft'); setGoal(g); }}>
                  <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>{g.icon}{g.id !== 'eleitoral' && <Flag area={g.area} width={30} rounded={4} />}</span>
                  <span><b>{g.title}</b><small>{g.sub}</small></span>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="gtile-grid">
              {[5, 10, 15, 20, 30].map((m) => <GlyphTile key={m} icon={<IClock />} label={`${m} min`} active={mins === m} onClick={() => { haptic('soft'); setMins(m); }} />)}
              <GlyphTile icon={<IInfinity />} label="Mais de 30" active={mins === 45} onClick={() => { haptic('soft'); setMins(45); }} />
            </div>
          )}
          {step === 2 && (
            <div className="gtile-grid">
              <GlyphTile icon={<ISunrise />} label="Manhã" active={when === 'manha'} onClick={() => setWhen('manha')} />
              <GlyphTile icon={<ISun />} label="Tarde" active={when === 'tarde'} onClick={() => setWhen('tarde')} />
              <GlyphTile icon={<IMoon />} label="Noite" active={when === 'noite'} onClick={() => setWhen('noite')} />
            </div>
          )}
          {step === 3 && (
            <div className="stack" style={{ gap: 16, alignItems: 'center' }}>
              <Mascot mood="happy" size={130} />
              <input className="input" placeholder="Seu nome ou apelido" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Seu nome ou apelido" style={{ textAlign: 'center' }} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <button className="pill-cta ob-next" onClick={() => void next()}>{step < total - 1 ? 'Continuar' : 'Começar a jogar'}</button>
    </div>
  );
}
