// Tela de carregamento: a Capi escreve num pergaminho com uma pena enquanto o app prepara algo.
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Mascot } from './Mascot';
import { reducedMotion } from './settings';

const TIPS = [
  'Dica: na lei seca, "poderá" e "deverá" mudam tudo.',
  'Dica: errou no chute? Toque em "Chutei" e a revisão volta antes.',
  'Dica: o botão Jogar retoma de onde você parou.',
  'Dica: citação chama para o processo; intimação dá ciência de um ato.',
  'Dica: mandato é representação; mandado é ordem.',
  'Dica: reclusão admite regime fechado; detenção, não de início.',
  'Dica: em "Encontre o erro", leia devagar — a troca é sutil.',
];

/** `full` ocupa a tela inteira (sessão, simulado); sem ele, um bloco dentro da página. */
export function TucaLoading({ msg, full = false }: { msg: string; full?: boolean }) {
  const rm = reducedMotion();
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => { if (rm) return; const t = setInterval(() => setTip((x) => (x + 1) % TIPS.length), 3200); return () => clearInterval(t); }, [rm]);
  const lines = [64, 82, 52, 74, 40];
  return (
    <div className={`tuca-loading${full ? ' full' : ''}`} role="status" aria-live="polite" aria-label={msg}>
      <div className="tl-scene" aria-hidden="true">
        <Mascot mood="think" size={96} />
        <div className="tl-scroll">
          <svg viewBox="0 0 120 92" width="132" height="101">
            <rect x="6" y="6" width="108" height="80" rx="8" fill="#f4ecd6" />
            <rect x="2" y="2" width="116" height="10" rx="5" fill="#e3d6b2" />
            <rect x="2" y="80" width="116" height="10" rx="5" fill="#e3d6b2" />
            <text x="16" y="28" fontSize="11" fontWeight="800" fill="#3a3355" fontFamily="Georgia, serif">Art.</text>
            {lines.map((w, i) => (
              <path key={i} className="tl-line" pathLength={1} d={`M16 ${38 + i * 9} H${16 + w}`} stroke="#5d5680" strokeWidth="2.2" strokeLinecap="round" style={{ animationDelay: `${i * 0.55}s` }} />
            ))}
          </svg>
          <motion.svg className="tl-quill" viewBox="0 0 40 40" width="40" height="40"
            animate={rm ? undefined : { x: [0, 46, 4, 52, 10, 40, 0], y: [0, 0, 9, 9, 18, 27, 36], rotate: [0, 6, -2, 6, -2, 4, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}>
            <path d="M6 34 C10 22 20 10 36 4 C30 16 20 26 8 33Z" fill="#ffffff" stroke="#c3c8ff" strokeWidth="1.2" />
            <path d="M6 34 L20 18" stroke="#8e97fd" strokeWidth="1.4" />
            <path d="M4 37 L7 33" stroke="#1c2054" strokeWidth="2.4" strokeLinecap="round" />
          </motion.svg>
        </div>
      </div>
      <div className="tl-msg">{msg}<span className="tl-dots"><i>.</i><i>.</i><i>.</i></span></div>
      <motion.div key={tip} className="tl-tip" initial={rm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>{TIPS[tip]}</motion.div>
    </div>
  );
}
