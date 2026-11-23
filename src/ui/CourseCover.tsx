import administrativo from '../assets/covers/administrativo.webp';
import civil from '../assets/covers/civil.webp';
import constitucional from '../assets/covers/constitucional.webp';
import consumidor from '../assets/covers/consumidor.webp';
import geral from '../assets/covers/direito-geral.webp';
import eleitoral from '../assets/covers/eleitoral.webp';
import hermeneutica from '../assets/covers/hermeneutica.webp';
import informatica from '../assets/covers/informatica.webp';
import penal from '../assets/covers/penal.webp';
import portugues from '../assets/covers/portugues.webp';
import processoCivil from '../assets/covers/processo-civil.webp';
import processoPenal from '../assets/covers/processo-penal.webp';
import tjms from '../assets/covers/tjms.webp';
import tjsp from '../assets/covers/tjsp.webp';

const PAINTINGS = { geral, tjsp, tjms, const: constitucional, penal, civil, processoCivil, processoPenal,
  eleit: eleitoral, administrativo, consumidor, hermeneutica, portugues, informatica };

export type CoverKind = keyof typeof PAINTINGS;

export function CourseCover({ kind, eager }: { kind: CoverKind; eager?: boolean }) {
  return (
    <span className="cover" data-cover={kind} aria-hidden="true">
      <img className="cover-painting" src={PAINTINGS[kind]} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
      <span className="cover-light" />
    </span>
  );
}
