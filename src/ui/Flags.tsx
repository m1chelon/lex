// Bandeiras (SVG simplificado, proporção 3:2): São Paulo (TJSP), Mato Grosso do Sul (TJMS) e Brasil (Direito em geral).
import { useId } from 'react';
import type { AreaId } from '../core/areas';

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
}

export function Flag({ area, width = 30, rounded = 4, wave = false }: { area: AreaId; width?: number; rounded?: number; wave?: boolean }) {
  const id = useId().replace(/:/g, '');
  const W = 90, H = 60;
  const label = area === 'tjsp' ? 'Bandeira de São Paulo' : area === 'tjms' ? 'Bandeira de Mato Grosso do Sul' : 'Bandeira do Brasil';
  const flag = (
    <svg className="flag" width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs><clipPath id={`c${id}`}><rect width={W} height={H} rx={rounded * (W / width)} /></clipPath></defs>
      <g clipPath={`url(#c${id})`}>
        {area === 'tjsp' && <>
          {/* 13 listras, começando e terminando em preto */}
          {Array.from({ length: 13 }, (_, i) => <rect key={i} y={(i * H) / 13} width={W} height={H / 13 + 0.2} fill={i % 2 ? '#ffffff' : '#000000'} />)}
          {/* cantão vermelho com círculo branco, silhueta do Brasil e 4 estrelas */}
          <rect width={W * 0.36} height={(H / 13) * 7} fill="#e3141b" />
          <circle cx={W * 0.18} cy={(H / 13) * 3.5} r={9.2} fill="#ffffff" />
          <path d="M14.25 9.91 L16.85 10.30 L17.76 11.21 L19.45 11.60 L21.40 12.51 L22.70 13.55 L22.31 14.85 L21.14 15.89 L20.75 17.45 L19.84 18.49 L18.80 19.01 L17.76 20.05 L16.85 21.35 L15.55 22.65 L15.16 21.09 L15.94 19.79 L14.64 18.49 L13.60 17.45 L13.34 16.15 L11.65 15.76 L10.35 14.85 L9.70 13.55 L10.74 11.99 L12.30 11.60 L13.34 10.69Z" fill="#002776" strokeLinejoin="round" />
          <Star cx={W * 0.18} cy={4.3} r={2.2} fill="#ffd700" />
          <Star cx={W * 0.18} cy={(H / 13) * 7 - 4.3} r={2.2} fill="#ffd700" />
          <Star cx={W * 0.18 - 12.6} cy={(H / 13) * 3.5} r={2.2} fill="#ffd700" />
          <Star cx={W * 0.18 + 12.6} cy={(H / 13) * 3.5} r={2.2} fill="#ffd700" />
        </>}
        {area === 'tjms' && <>
          {/* azul ao fundo; triângulo superior verde; faixa branca do canto inferior da tralha ao meio do topo */}
          <rect width={W} height={H} fill="#0066b3" />
          <polygon points={`0,0 ${W * 0.5 - 7},0 0,${H - 10}`} fill="#00a651" />
          <polygon points={`0,${H - 10} ${W * 0.5 - 7},0 ${W * 0.5 + 7},0 0,${H + 10}`} fill="#ffffff" />
          <Star cx={W * 0.72} cy={H * 0.66} r={7.5} fill="#ffcc00" />
        </>}
        {area === 'geral' && <>
          <rect width={W} height={H} fill="#009c3b" />
          <polygon points={`${W / 2},6 ${W - 8},${H / 2} ${W / 2},${H - 6} 8,${H / 2}`} fill="#ffdf00" />
          <circle cx={W / 2} cy={H / 2} r={13} fill="#002776" />
          <path d={`M${W / 2 - 13} ${H / 2 - 2} q13 -6 26 3`} stroke="#ffffff" strokeWidth="2.6" fill="none" />
        </>}
      </g>
      <rect x=".5" y=".5" width={W - 1} height={H - 1} rx={rounded * (W / width)} fill="none" stroke="rgba(255,255,255,.25)" />
    </svg>
  );
  return wave ? <span className="flag-wave" style={{ borderRadius: rounded }}>{flag}</span> : flag;
}
