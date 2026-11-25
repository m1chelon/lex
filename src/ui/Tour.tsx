// Tutorial guiado pela Capi: destaca cada parte da tela (holofote) e explica em um balão.
// Abre sozinho na primeira visita depois do cadastro e pode ser revisto em Você.
import { motion } from 'motion/react';
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { kvSet } from '../data/db';
import { Mascot } from './Mascot';
import { nav } from './nav';
import { haptic, reducedMotion } from './settings';

interface Step { target?: string; title: string; text: string; tab?: 'home' | 'direito' | 'cursos' | 'map' }
const STEPS: Step[] = [
  { title: 'Oi! Eu sou a Capi', text: 'Vou te mostrar o LEX em um minuto. Aqui você aprende a lei artigo por artigo, jogando.' },
  { target: '[data-tour="play"]', title: 'O botão Jogar', text: 'É por aqui que tudo começa: em 3 passos você escolhe o que estudar, como treinar e por quanto tempo.' },
  { target: '[data-tour="today"]', title: 'Seu estudo', text: 'Confira os artigos praticados e as revisões do seu plano. Em “Continue estudando”, você pode voltar ao próximo artigo.', tab: 'home' },
  { target: '[data-tour="tab-direito"]', title: 'Leis', text: 'A lei seca completa, por ramo: Constitucional, Penal, Eleitoral… Leia a lei ou toque em Treinar.' },
  { target: '[data-tour="tab-cursos"]', title: 'Concursos', text: 'Acompanhe seus acertos e revisões por disciplina nos editais do TJSP e do TJMS.' },
  { target: '[data-tour="tab-map"]', title: 'Progresso', text: 'Sua carreira, o mapa de domínio, a folha de ponto e a liga da semana.' },
  { target: '[data-tour="bell"]', title: 'Seus avisos', text: 'Revisões pendentes, ofensiva em risco, ponto do dia: tudo o que precisa da sua atenção.', tab: 'home' },
  { title: 'Pronto!', text: 'Errar faz parte: cada erro volta na hora certa para você fixar. Bora escolher o que estudar?' },
];

let open = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export function startTour() { open = true; nav.tab('home'); emit(); }
function closeTour() { open = false; void kvSet('tourDone', true); emit(); }
const useOpen = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => open, () => open);

export function Tour({ onFinish }: { onFinish?: () => void }) {
  const isOpen = useOpen();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];
  useEffect(() => { if (isOpen) setI(0); }, [isOpen]);
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (step.tab) nav.tab(step.tab);
    const find = () => { const el = step.target ? document.querySelector(step.target) as HTMLElement | null : null; if (el) { el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }); setTimeout(() => setRect(el.getBoundingClientRect()), 320); } else setRect(null); };
    const t = setTimeout(find, 120);
    const onR = () => find();
    window.addEventListener('resize', onR);
    return () => { clearTimeout(t); window.removeEventListener('resize', onR); };
  }, [isOpen, i]); // eslint-disable-line
  if (!isOpen) return null;
  const last = i === STEPS.length - 1;
  const pad = 8;
  const hole = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const below = hole ? hole.top + hole.height + 220 < window.innerHeight : true;
  const next = () => { haptic('soft'); if (last) { closeTour(); onFinish?.(); } else setI(i + 1); };
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tutorial: ${step.title}`}>
      {hole ? <motion.div className="tour-hole" initial={false} animate={hole} transition={{ type: 'spring', stiffness: 260, damping: 30 }} /> : <div className="tour-dim" />}
        <div key={i} className="tour-bubble glass" style={hole ? (below ? { top: hole.top + hole.height + 14 } : { bottom: window.innerHeight - hole.top + 14 }) : { top: '30%' }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <Mascot mood={last ? 'cheer' : 'happy'} size={58} />
            <div className="grow">
              <div style={{ fontWeight: 750, fontSize: 16 }}>{step.title}</div>
              <p className="small" style={{ marginTop: 4, lineHeight: 1.45 }}>{step.text}</p>
            </div>
          </div>
          <div className="row between" style={{ marginTop: 12 }}>
            <span className="xsmall muted">{i + 1} de {STEPS.length}</span>
            <div className="row" style={{ gap: 8 }}>
              {!last && <button className="btn btn-sm btn-ghost" onClick={() => { haptic('soft'); closeTour(); }}>Pular</button>}
              {i > 0 && !last && <button className="btn btn-sm btn-quiet" onClick={() => setI(i - 1)}>Voltar</button>}
              <button className="btn btn-sm btn-primary" onClick={next}>{last ? 'Escolher o que estudar' : 'Próximo'}</button>
            </div>
          </div>
        </div>
    </div>
  );
}
