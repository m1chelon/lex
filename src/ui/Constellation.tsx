// Fundo: céu discreto com estrelas pequenas e foscas e a constelação de Libra (a balança),
// que deriva muito devagar. Respeita a redução de movimento (fica parado).
import { memo } from 'react';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

// Libra (estilizada): β no topo, α à esquerda, σ e υ embaixo, γ à direita e τ na cauda.
const LIBRA = [[292, 92], [252, 140], [330, 146], [270, 196], [338, 214], [312, 238]] as const;
const LIBRA_LINES = [[0, 1], [0, 2], [1, 3], [2, 4], [4, 5], [3, 5]] as const;
// Virgem/Astreia (estilizada), a deusa da justiça que segura a balança — canto inferior esquerdo.
const VIRGO = [[58, 600], [92, 632], [76, 676], [120, 662], [140, 704], [104, 720]] as const;
const VIRGO_LINES = [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5]] as const;

export const Constellation = memo(function Constellation() {
  const r = rng(7);
  const dust = Array.from({ length: 70 }, () => ({ x: r() * 400, y: r() * 860, s: 0.35 + r() * 0.75, o: 0.12 + r() * 0.28, tw: r() < 0.18 }));
  return (
    <svg className="constellation" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="cst-drift">
        {dust.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.s} fill="#c9ceff" opacity={d.o} className={d.tw ? 'cst-tw' : undefined} style={d.tw ? { animationDelay: `${(i % 9) * 1.3}s` } : undefined} />)}
        {[{ pts: LIBRA, lines: LIBRA_LINES }, { pts: VIRGO, lines: VIRGO_LINES }].map((c, k) => (
          <g key={k}>
            {c.lines.map(([a, b], i) => <line key={i} x1={c.pts[a][0]} y1={c.pts[a][1]} x2={c.pts[b][0]} y2={c.pts[b][1]} stroke="#aab1ff" strokeOpacity=".16" strokeWidth=".7" />)}
            {c.pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 0 ? 1.6 : 1.15} fill="#d9dcff" opacity={i === 0 ? 0.5 : 0.38} className="cst-tw" style={{ animationDelay: `${i * 1.7 + k}s` }} />)}
          </g>
        ))}
      </g>
    </svg>
  );
});
