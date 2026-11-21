// Ladrilho colorido com ícone branco (linguagem do Aura: "How are you feeling today?").
import type { ReactNode } from 'react';

export const TILE: Record<string, string> = {
  rose: 'linear-gradient(160deg, #ff6b8a, #e9407a)',
  violet: 'linear-gradient(160deg, #a78bfa, #8b5cf6)',
  peri: 'linear-gradient(160deg, #aab1ff, #8e97fd)',
  teal: 'linear-gradient(160deg, #4fd1c5, #2bb5a8)',
  orange: 'linear-gradient(160deg, #ffa34d, #f57c2b)',
  green: 'linear-gradient(160deg, #8fd16a, #5fb83f)',
  blue: 'linear-gradient(160deg, #7aa7ff, #5b8def)',
  gold: 'linear-gradient(160deg, #f1d99a, #c9a75e)',
  red: 'linear-gradient(160deg, #fb7185, #f43f5e)',
  navy: 'linear-gradient(160deg, #2a3070, #1c2054)',
};

/** Tom de cada cor para o vidro líquido (r, g, b). */
export const TINT: Record<string, string> = { rose: '255, 92, 138', violet: '167, 139, 250', peri: '142, 151, 253', teal: '64, 205, 190', orange: '255, 156, 70', green: '135, 206, 96', blue: '110, 160, 255', gold: '241, 205, 130', red: '251, 113, 133', navy: '80, 92, 190' };

export function IconTile({ color, icon, label, size = 58, onClick, active, badge }: { color: keyof typeof TILE | string; icon: ReactNode; label?: string; size?: number; onClick?: () => void; active?: boolean; badge?: ReactNode }) {
  const body = (
    <>
      <span className={`itile${TINT[color] ? ' lg' : ''}${active ? ' active' : ''}`} style={TINT[color] ? { width: size, height: size, ['--tint' as string]: TINT[color] } : { width: size, height: size, background: TILE[color] ?? color }}>
        {icon}
        {badge != null && <span className="itile-badge">{badge}</span>}
      </span>
      {label && <span className="itile-label">{label}</span>}
    </>
  );
  return onClick ? <button className="itile-wrap" onClick={onClick} aria-pressed={active}>{body}</button> : <span className="itile-wrap">{body}</span>;
}

/** Ladrilho escuro com ícone de traço (grade de opções, como a tela "Sleep" do Aura). */
export function GlyphTile({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button className={`gtile${active ? ' active' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="gtile-box">{icon}</span>
      <span className="gtile-label">{label}</span>
    </button>
  );
}
