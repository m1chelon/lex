import { useId } from 'react';
import type { CapiItem, CapiModel, CapiSlot } from '../content/capiCatalog';

const ink = (color: string) => `color-mix(in srgb, ${color}, #201b30 54%)`;

const PATTERNS: Record<string, string> = {
  riscas: 'lines', listras: 'lines', xadrez: 'plaid', tweed: 'plaid', 'tartã': 'plaid', azulejo: 'plaid',
  flores: 'flower', floresta: 'flower', folhas: 'flower', fauna: 'flower',
  bordado: 'diamond', geometria: 'diamond', cristal: 'diamond', cristais: 'diamond',
  renda: 'dots', poa: 'dots', perolas: 'dots', 'pérolas': 'dots', malha: 'plaid',
  linho: 'weave', lã: 'weave', trico: 'weave', fibra: 'weave', palha: 'weave', tartaruga: 'dots',
  plissado: 'lines', ondas: 'wave', bandeirinhas: 'diamond', cromo: 'lines', cetim: 'weave',
};

function Textile({ item, id }: { item: CapiItem; id: string }) {
  const pattern = PATTERNS[item.detail];
  return <defs>
    <linearGradient id={id + '-shade'} x2=".8" y2="1">
      <stop stopColor={`color-mix(in srgb, ${item.color}, #fff 14%)`} />
      <stop offset=".6" stopColor={item.color} />
      <stop offset="1" stopColor={`color-mix(in srgb, ${item.color}, #171328 23%)`} />
    </linearGradient>
    {pattern && <pattern id={id + '-fabric'} width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill={item.color} />
      <g fill={item.accent} stroke={item.accent} strokeWidth=".65" opacity={pattern === 'lines' ? .48 : .62}>
        {pattern === 'lines' && <path d="M2 0v8M6 0v8" />}
        {pattern === 'weave' && <path d="M-1 3 3-1m-4 9L8-1M5 9l4-4" opacity=".55" />}
        {pattern === 'plaid' && <path d="M2 0v8M5 0v8M0 2h8M0 5h8" opacity=".73" />}
        {pattern === 'flower' && <path d="M4 1.6q2.4-.2 1.2 1.8 2.1 1.1.2 2.1L4 5l-1.4.5q-1.9-1 .2-2.1Q1.6 1.4 4 1.6Z" />}
        {pattern === 'dots' && <><circle cx="2" cy="3" r=".8" /><circle cx="6" cy="6" r=".65" /></>}
        {pattern === 'diamond' && <path d="m4 1 1.4 3L4 7 2.6 4Z" fill="none" />}
        {pattern === 'wave' && <path d="M-2 3q2-3 4.8 0t5 0 5 0" fill="none" />}
      </g>
    </pattern>}
  </defs>;
}

const LONG_CLOTHES: Partial<Record<CapiModel, string>> = {
  dress: 'M43 66q17 7 34 0l4 17 11 22q-32 10-64 0l11-22Z',
  gown: 'M42 65q19 7 36 0l4 19 15 24q-36 12-73 0l15-24Z',
  robe: 'M39 65q21 7 42 0l13 42q-34 8-69 0Z',
  cape: 'M39 67q22 4 42 0l17 39q-13 6-24 2l-13-15-14 15q-12 4-25-2Z',
  kimono: 'M38 65q23 7 43 0l12 17-10 6 9 17q-33 8-65 0l9-17-10-6Z',
  poncho: 'M39 66q21 7 42 0l24 26q-14 9-45 13-31-4-45-13Z',
  raincoat: 'M40 66q19 5 41 0l13 39q-33 9-68 0Z',
  coat: 'M40 66q19 7 40 0l14 38q-12 4-25 4l-8-7-10 7q-15 0-24-4Z',
  apron: 'M46 70h28l4 13 12 23q-28 8-60 0l10-23Z',
};

export function CapiClothing({ item, id, neckCovered = false }: { item: CapiItem; id: string; neckCovered?: boolean }) {
  const { model, color, accent, detail } = item;
  const cloth = 'url(#' + id + (PATTERNS[detail] ? '-fabric)' : '-shade)');
  const outline = ink(color);
  const long = LONG_CLOTHES[model];
  const tailored = ['suit', 'double', 'tux', 'tailleur', 'vest'].includes(model);
  const sleeves = model !== 'singlet' && model !== 'apron';
  const label = /^(LEX|Art\. 5º|Vade e café|11|3)$/.test(detail) ? detail : null;
  return <g strokeLinejoin="round">
    <Textile item={item} id={id} />
    {sleeves && <path d="M38 67q-10 1-22 18l9 8 9-11m48-15q10 3 22 18l-9 8-10-11" fill={cloth} stroke={outline} strokeWidth="1.65" />}
    {tailored ? <>
      {model === 'tailleur' && <path d="M34 88h54l4 15q-31 8-63 0Z" fill={cloth} stroke={outline} strokeWidth="1.4" />}
      <path d="M43 68h34L64 93h-6Z" fill="#f4f2ed" />
      {model === 'vest' && <path d="M45 71 60 83l15-12-5 26-9 4-11-4Z" fill={color} stroke={outline} />}
      {!neckCovered && (model === 'tux'
        ? <path d="m52 75 8 3 8-3v7l-8-3-8 3Z" fill={accent} stroke={outline} />
        : model !== 'tailleur' && <g fill={accent} stroke={ink(accent)} strokeWidth="1.2">
          <path d="m60.5 76 5.8 16.5-6.2 4.7-5.8-4.7L60 76Z" /><path d="m60.1 70.5 4 4-2.3 4.4h-3.6l-2.4-4.4Z" />
        </g>)}
      <path d="M42 68h12l6 3-6 6-10-4m34-5H66l-6 3 6 6 10-4" fill="#f9f8f4" stroke="#68778b" strokeWidth="1.15" />
      <path d="M43 66q-9 1-12 12l-4 16q-1.2 4.9 1.4 5.9l17.4 3.1q7.6 1.3 9.5-5.8l1.7-5.1Zm34 0q10 .7 13 12l4 16q1.2 4.9-1.4 5.9l-17.4 3.1q-7.6 1.3-9.5-5.8l-1.7-5.1Z" fill={cloth} stroke={outline} strokeWidth="1.7" />
      <path d="M41 68 39.2 77q-.4 1.8 1.4 2.2l4.9 1.35-2.2 3.7L56 93m22.8-25 1 9q.4 1.8-1.3 2.2l-5 1.35 2.2 3.7L64 93" fill="none" stroke={model === 'tux' ? accent : outline} strokeWidth="1.45" strokeLinecap="round" />
      <path d="m18 87 6 4.8m78-4.8-10 5.5" fill="none" stroke="#e7f1ff" strokeWidth="1.45" strokeLinecap="round" />
      {(model === 'double' || model === 'vest') && <g fill={accent} stroke={outline}><circle cx="46" cy="91" r="1.45" /><circle cx="72" cy="91" r="1.45" /><circle cx="44" cy="96" r="1.45" /><circle cx="74" cy="96" r="1.45" /></g>}
    </> : <>
      <path d={long ?? 'M40 66q20 6 40 0l9 30q-27 9-58 0Z'} fill={cloth} stroke={outline} strokeWidth="1.7" />
      {model === 'hoodie' || model === 'raincoat' ? <g fill={accent} stroke={outline} strokeWidth="1">
        <path d="M43 67q17 11 34 0-3 11-17 16-13-4-17-16Z" />
        <path d="m54 75-2 11m14-11 2 11" stroke={accent} strokeWidth="1.35" />
        {model === 'hoodie' && <path d="M50 91q10-3 20 0l4 6H46Z" fill={color} />}
      </g> : null}
      {['jacket', 'denim', 'shirt', 'polo', 'cardigan', 'coat', 'pajamas', 'raincoat', 'racing', 'armor'].includes(model) && <g stroke={accent} strokeWidth="1.45" fill="none" strokeLinecap="round">
        <path d="M45 68l8 8 7-4 7 4 9-8M60 73v24" />
        <path d="M43 82h9m16 0h9" opacity=".78" />
      </g>}
      {['dress', 'gown', 'poncho', 'apron'].includes(model) && <g stroke={accent} strokeWidth="1.17" fill="none">
        <path d="M46 70q14 9 28 0M43 84q17 4 34 0m-43 17q25 7 51 0" opacity=".82" />
        {(detail === 'plissado' || detail === 'babados' || detail === 'franjas') && <path d="m47 88-7 15m11-14-4 16m9-15-2 16m11-16 2 16m4-17 5 15m1-16 7 15" />}
      </g>}
      {model === 'dress' && detail === 'abotoado' && <path d="M61 76v25m-3-20h6m-6 6h6m-6 6h6" stroke={accent} strokeWidth="1.15" />}
      {model === 'kimono' || model === 'robe' || model === 'cape' ? <g stroke={accent} strokeWidth="2.1" fill="none">
        <path d="M40 68 61 84l20-15M61 84l-8 21" />
        {model === 'kimono' && <path d="M34 85q25 5 51 0" strokeWidth="4.25" />}
      </g> : null}
      {['jumpsuit', 'overalls', 'racing', 'wetsuit'].includes(model) && <g stroke={accent} strokeWidth="1.7" fill="none" strokeLinecap="round">
        <path d="m43 70 4 20m30-20-4 20M36 92h47m-24-14v13m1 1v10" />
        {model === 'overalls' && <path d="M50 82h20v7H50Z" />}
        {detail === 'raio' && <path d="m66 72-11 12h6l-6 10 13-14h-7Z" fill={accent} />}
      </g>}
      {['tee', 'uniform', 'singlet', 'turtleneck'].includes(model) && <path d={model === 'singlet' ? 'M40 68q9 21 20 11 11 10 20-11' : 'M45 68q15 10 30 0'} stroke={accent} strokeWidth={model === 'turtleneck' ? 3.4 : 1.7} fill="none" />}
      {detail === 'sari' && <path d="m72 69 5 3-34 34-6-3Z" fill={accent} stroke={outline} />}
      {detail === 'farda' || detail === 'bordado' || detail === 'faixa' ? <path d="m40 72 7 5m33-5-7 5m-19 6h14m-14 6h14M37 101l13 3m21 0 13-3" stroke={accent} strokeWidth="1.7" /> : null}
      {detail === 'aviadora' && <path d="m43 68 10 12 7-5 7 5 11-12Z" fill={accent} stroke={outline} strokeWidth="1.1" />}
      {detail === 'cropped' && <path d="M31 90q28 6 58 0" stroke={accent} strokeWidth="2.5" fill="none" />}
      {label && <text x="60" y="87" fill={accent} stroke="none" fontSize={label.length > 6 ? 4 : 6} fontWeight="800" textAnchor="middle">{label}</text>}
      {model === 'apron' && <path d="M50 92h20l-1 9H51Z" fill={accent} stroke={outline} strokeWidth="1.1" />}
    </>}
  </g>;
}

type Hat = { form: string; trim?: string; brim?: string };

const HATS: Partial<Record<CapiModel, Hat>> = {
  panama: { form: 'M39 20q3-12 9-15l17 1q7 0 11 12Z', brim: 'M24 22q21-9 66-6 7 3-3 5-27 8-63 1Z', trim: 'M40 16q18 1 37-3' },
  fedora: { form: 'M37 21q2-13 15-15l13 1 10-3 6 14Z', brim: 'M22 22q21-7 69-6l5 2q-17 9-48 9Z', trim: 'M38 17q18 2 43-4' },
  beret: { form: 'M39 22q-8-3-7-7 4-11 33-12 24 0 20 11-2 6-13 6Z', trim: 'M42 20q13-5 30-4M61 5l1-4' },
  flatCap: { form: 'M32 19q3-14 26-15 20 0 23 12l-9 7-36 1Z', brim: 'M25 23q17-8 39-4l-5 5q-25 5-34-1Z', trim: 'M48 8q11 1 17 12' },
  topHat: { form: 'M43 21 40 2q19-6 41 0l-3 18Z', brim: 'M29 24q20-4 64-6l-.9 4q-24 10-62 5Z', trim: 'M43 17q17 0 35-3' },
  wideHat: { form: 'M39 19q0-14 20-14 16 0 24 11Z', brim: 'M16 23q25-10 82-9l8 4q-20 11-48 11-32-1-42-6Z', trim: 'M42 16q20-.1 40-4' },
  cowboyHat: { form: 'M38 20 40 7q7-5 18 3 10-9 18-6l7 13Z', brim: 'M17 19q13 6 25 1 29-5 45-3 10-.1 14-7l3 8q-14 15-48 11-28-2-39-10Z', trim: 'M39 16q17 2 43-4' },
  baseball: { form: 'M37 18q2-14 22-15 20 1 25 16l-15 3-30-1Z', brim: 'M71 18q-24-6-50 6 11 7 34 1l19-3Z', trim: 'M56 6q-8 4-12 13' },
  bucket: { form: 'M39 20 44 4q15-3 33 0l6 15Z', brim: 'M39 18 25 27q32 6 68-5l-10-5Z', trim: 'M38 18q22 3 45-3' },
  beanie: { form: 'M38 20Q40 1 62 1t23 18Z', brim: 'M36 18q22 0 49-4l1 8q-23 7-49 4Z', trim: 'M47 10q2-4 5-6m4 10q1-7 5-11m6 9q1-4-1-7' },
  visor: { form: 'M38 17q20-3 41-5l5 6-46 5Z', brim: 'M21 24q15-7 41-5l5 4q-28 5-46 1Z' },
  bowler: { form: 'M41 20Q42 3 62 3t21 14Z', brim: 'M27 22q21-6 65-5l5 3q-17 8-47 8-13-.7-23-6Z', trim: 'M41 16q21 3 42-3' },
  mortarboard: { form: 'M41 15h40v8q-14 7-40 0Z', brim: 'M24 12 61 2 99 12 61 21Z', trim: 'm83 14 7 1v14' },
  fascinator: { form: 'M67 11q8-8 22-3 6 5-2 11l-13 2Z', brim: 'M67 14q-1 11 8 18l15-11-8-9Z', trim: 'M72 12Q68 3 75 2m6 11Q89 4 91 6' },
  bicorne: { form: 'M18 4q20 8 44 0 18 4 37 2l-13 20q-27-8-61 0Z', trim: 'M23 7q10 7 16 14m55-12L82 22' },
  cloche: { form: 'M29 25q5-20 22-21 22-3 31 19l-11 5-39 4Z', brim: 'M20 26q20-6 60-8l6 5q-30 15-66 3Z', trim: 'M32 17q21 .4 44-3' },
  crown: { form: 'M38 21 32 5l17 8L61 1l12 11 15-9-4 18Z', brim: 'M37 20q21 2 47-1v6q-24 5-46 1Z', trim: 'm47 19 3-6m21 4 2-6' },
  deerstalker: { form: 'M34 21q8-18 25-18 22 1 27 17l-16 7Z', brim: 'M20 26q11-11 47-7-17 12-47 7m63-9 19 4q-11 5-29 0Z', trim: 'M61 5q0 8 8 14m-9-16 7-2m-8 3-4-3' },
  wig: { form: 'M38 21q1-12 13-15 22-8 33 4 6 3 9 11v26q-8 4-17-2l-1-23q-15-5-38 5Z', trim: 'M80 24q10-5 13 3m-13 3q10-5 13 3m-12 4q9-5 12 3M50 14q10-7 22-5' },
  cone: { form: 'M20 21 64 1l37 16q-25 13-81 4Z', brim: 'M20 21q17-2 81-4-30 15-81 4Z', trim: 'M63 3 46 24m19-20 17 17' },
  fez: { form: 'M40 22 43 4q21-5 36 0l4 17Z', trim: 'm60 5 20 4 8 18' },
  sombrero: { form: 'M39 21q5-17 19-19 13 0 23 17Z', brim: 'M13 20q11 9 39 1 28-7 52-6l-.5 6q-28 16-70 10Z', trim: 'M26 23q14 7 62-3' },
  fullHelmet: { form: 'M27 28Q30 7 58 4q28-3 38 16l3 25-11 13-20-2 7-14-4-12-34 5Z', trim: 'M73 31q8 4 22-4m-18 16 19-5' },
  helmet: { form: 'M28 26q9-20 31-22 27-2 36 15l-5 11-11-7-48 8Z', trim: 'M76 24q11-3 15-7' },
  balaclava: { form: 'M24 32Q28 11 53 9q34-3 43 19l-1 27-8 13-15-8 4-14 13-16-16-8-28 2-9 15Z' },
  headband: { form: 'M31 20q26-9 55-1l3 6q-24-6-57 2Z' },
  cap: { form: 'M27 27q5-17 29-21 18-4 34 14l3 8q-10-5-16-4-24-8-50 3Z', trim: 'M58 9q21 3 28 15' },
  headset: { form: 'M40 17Q57-1 82 9l9 16-5 4-8-15q-18-8-35 7Zm41 12q8-9 15 0v14q-6 5-14 0Z', trim: 'M90 42q-10 10-24 9' },
  faceMask: { form: 'M56 21q20-7 37 7l-1 21-12 10-25-10Z', trim: 'M60 35h30m-27 7h26' },
};

function HatArt({ item, id }: { item: CapiItem; id: string }) {
  const { color, accent, detail, model } = item;
  const hat = HATS[model];
  if (!hat) return null;
  return <g stroke={ink(color)} strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round">
    <Textile item={item} id={id} />
    <path d={hat.form} fill={`url(#${id}-${PATTERNS[detail] ? 'fabric' : 'shade'})`} />
    {hat.brim && <path d={hat.brim} fill={color} opacity={model === 'fascinator' ? .56 : 1} />}
    {hat.trim && <path d={hat.trim} stroke={accent} strokeWidth="1.65" fill="none" />}
    {model === 'fullHelmet' && <path d="M70 24q13-6 23 0l2 9-19 6Z" fill="#859eb4" fillOpacity=".55" stroke={accent} />}
    {(['vents', 'grade', 'malha'].includes(detail)) && <path d="m58 13 3 8m5-10 2 8m5-7 2 7" stroke={accent} />}
    {detail === 'pompom' && <circle cx="60" cy="3" r="5" fill={accent} />}
    {detail === 'pluma' && <path d="M79 15q1-12 13-15-1 11-13 15Z" fill={accent} />}
    {['estrela', 'losango', 'luar'].includes(detail) && <path d="m62 9 1.5 3 3.5 1-3 1.5-2 3-1-3-4-1.5 3.5-1Z" fill={accent} stroke="none" />}
    {detail === 'LEX' && <text x="56" y="15" fill={accent} stroke="none" fontSize="6" fontWeight="800" textAnchor="middle">LEX</text>}
    {model === 'crown' && <circle cx="62" cy="17" r="3" fill={accent} />}
  </g>;
}

const LENSES: Partial<Record<CapiModel, string>> = {
  square: 'M58 28q12-4 23-1l1 7q-1 10-12 10-12 0-12-16Z',
  halfRim: 'M58 29q10-6 24-2l-1 8q-3 8-12 8t-11-14Z',
  catEye: 'M57 28q13 1 27-5l-3 13q-6 11-17 6-5-3-7-14Z',
  aviator: 'M58 28q12-5 24-1 1 9-6 15-5 5-11 0Z',
  heart: 'M70 29q-9-10-14 0-4 7 14 16 16-10 14-16-4-10-14 0Z',
  hex: 'm62 25 13-1 8 8-6 9-14 1-7-8Z',
  shield: 'M54 26q18-7 33-2l1 10-18 8-14-7Z',
  goggles: 'M56 25q18-4 26 1l3 9-4 9-22 1-3-8Z',
};

function Glasses({ item }: { item: CapiItem }) {
  const { color, accent, model, detail } = item;
  const lens = ['smoke', 'sol', 'espelho', 'água', 'mergulho', 'tinta'].includes(detail);
  const radius = detail === 'grande' ? 12 : 10.5;
  return <g fill={lens ? accent : '#fff5df'} fillOpacity={lens ? .5 : .08} stroke={color} strokeWidth={model === 'goggles' ? 2.45 : 1.9} strokeLinecap="round" strokeLinejoin="round">
    {model !== 'monocle' && <path d="M59 33.5 53 35m29-3 9-2.5" fill="none" />}
    {LENSES[model] ? <path d={LENSES[model]} /> : <circle cx="70" cy="34" r={model === 'monocle' ? 9 : radius} />}
    <path d="M62.8 31q2.3-3.4 6.4-4.2" stroke={accent} strokeWidth="1.15" fill="none" />
    {detail === 'corrente' && <path d="M80 39q-1 13-10 25" stroke={accent} strokeWidth="1.2" strokeDasharray="1.4 1.4" fill="none" />}
    {model === 'aviator' && <path d="m59 27 23-3" stroke={accent} strokeWidth="1.25" fill="none" />}
  </g>;
}

const SHOES: Partial<Record<CapiModel, string>> = {
  oxford: 'M2 9q4-4 9-4l5-4h9l2 11q-4 3-19 2L2 13Z',
  derby: 'M2 9q4-4 9-4l5-4 8-1q2 4 3 11-1 4-20 3L2 13Z',
  loafer: 'M2 9 8 5l6-1 4-3 7 2 2 10q-5 3-21 1Z',
  sneaker: 'M1 10q1-4 10-4l4-5h9l3 10v3H2Z',
  runner: 'M0 11q2-3 10-4l7-6 7-1 3 12-3 3H2Z',
  highTop: 'M2 9 11 6l5-10h9l2 17-4 2H2Z',
  platform: 'M2 10q5-4 11-5l4-5h8l2 12-3 5H2Z',
  flat: 'M0 11q5-6 11-6l9-3 6 1 1 10q-14 4-26 0Z',
  heel: 'M0 9q6-3 12-2l9-9 4 3 2 13h-3l-1-8-8 7q-8 1-15-2Z',
  boot: 'M2 9 12 6l3-14h11l1 21-6 2H2Z',
  cowboyBoot: 'M0 10q8-4 13-4l1-16 7 3 5-3 1 23-6 3-21-3Z',
  sandal: 'M2 11 9 6l12-3 5 1 1 10q-13 3-24 0Z',
  geta: 'M1 9h26v4H2Zm5 4h4v5H6Zm13 0h4v5h-4Z',
  cleat: 'M1 9 12 6l5-6h8l2 13-4 2-2-2-4 2-3-2-4 2-3-2-5 1Z',
};

function Footwear({ item }: { item: CapiItem }) {
  const { model, color, accent, detail } = item;
  return <g stroke={ink(color)} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
    {[false, true].map((right) => <g key={String(right)} transform={right ? 'translate(92 99) scale(-1 1)' : 'translate(27 99)'}>
      <path d={SHOES[model]} fill={color} />
      {['oxford', 'derby', 'sneaker', 'runner', 'highTop', 'cleat'].includes(model) && <path d="m13 7 7 .7m-5-3 6 1m-3-3 4 .6" fill="none" stroke={accent} strokeWidth="1" />}
      {['runner', 'sneaker', 'platform', 'highTop', 'cleat', 'oxford'].includes(model) && <path d="M3 12q11 2 22-1" fill="none" stroke={accent} strokeWidth={model === 'platform' ? 2.5 : 1.1} />}
      {['boot', 'cowboyBoot'].includes(model) && <path d="M17-4q3 2 6 0l-1 9-4 2" fill="none" stroke={accent} />}
      {model === 'sandal' || model === 'geta' ? <path d="m8 10 6-4 7 3m-7-3-1 8" fill="none" stroke={accent} strokeWidth="1.85" /> : null}
      {model === 'loafer' && <path d="M11 6h10v3H11Z" fill={accent} />}
      {detail === 'bicolor' && <path d="M4 9q7-4 8 2l-8 2Z" fill={accent} stroke="none" />}
      {detail === 'fita' && <path d="m12 6 8 5m0-5-8 5" stroke={accent} />}
    </g>)}
  </g>;
}

function Legwear({ item, id }: { item: CapiItem; id: string }) {
  const { model, detail, accent, color } = item;
  const shape = model === 'skirt' ? 'M38 88h46l12 16q-34 11-69 0Z'
    : model === 'breeches' ? 'M34 90h52q8 13 2 18l-16 3-12-10-12 10-15-3q-6-6 1-18Z'
      : model === 'shorts' ? 'M36 90h48l7 13-18 4-12-6-10 6-19-4Z' : 'M37 89h47l4 21H66l-6-7-5 7H31Z';
  return <g stroke={ink(color)} strokeWidth="1.45" strokeLinejoin="round">
    <Textile item={item} id={id} />
    <path d={shape} fill={`url(#${id}-${PATTERNS[detail] ? 'fabric' : 'shade'})`} />
    {model === 'skirt' ? <path d="m43 93-5 13m15-11-2 13m15-13 2 12m7-14 6 13" stroke={accent} fill="none" opacity=".72" />
      : <path d="M39 94h43m-6 4 3 9m-37-9-2 8" stroke={accent} fill="none" opacity=".78" />}
  </g>;
}

function Handwear({ item }: { item: CapiItem }) {
  const { model, color, accent, detail } = item;
  const shape = model === 'boxing' ? 'M1 15q-5-6-2-10 3-4 7-3 4-3 7-.5 5 3 5 9-1 4-8 7Z'
    : model === 'operaGlove' ? 'M0 8q3-6 14-11l4 7-6 8q2 4-3 6-9 3-9-10Z'
      : model === 'mitten' ? 'M0 9q3-9 11-8 2 1 2 6 4-3 6 0 0 4-4 8-9 6-15-1Z'
        : 'M0 9q4-9 11-8 3 0 4 6 2 0 3 3-1 9-10 9Q.4 18 0 9Z';
  const decor = ['bordado', 'cristais', 'flores', 'renda', 'perfurado'].includes(detail);
  return <g stroke={ink(color)} strokeWidth="1.2" strokeLinejoin="round">
    {[false, true].map((right) => <g key={String(right)} transform={right ? 'translate(106 86) scale(-1 1)' : 'translate(14 86)'}>
      <path d={shape} fill={color} />
      <path d="M4 7q3 3 10 2" fill="none" stroke={accent} strokeWidth={detail === 'neon' ? 2.5 : 1.1} strokeLinecap="round" />
      {model === 'fingerless' && <path d="M.5 13q8 4 16-1l-3 4q-8 4-13-3Z" fill="#c18c69" />}
      {decor && <path d="m6 9 2 5 3-3m-7 1 2 1m5 1 2-2" stroke={accent} fill="none" />}
    </g>)}
  </g>;
}

function Wrist({ item }: { item: CapiItem }) {
  const { model, color, accent, detail } = item;
  const dial = detail === 'cream' ? '#f2dfbe' : detail === 'azul' ? '#385473' : '#242a3d';
  return <g transform="rotate(-28 97 93)" stroke={ink(color)} strokeWidth="1.1">
    <rect x="92.1" y="86.8" width="9.8" height="12.3" rx="2.4" fill={color} />
    {model === 'watch' ? <>
      <circle cx="97" cy="93" r="4.75" fill={dial} stroke={accent} strokeWidth="1.55" />
      <path d="M97 90.4v2.6l1.8.7" stroke={detail === 'cream' ? '#553426' : accent} fill="none" strokeLinecap="round" />
    </> : model === 'smartWatch' ? <>
      <rect x="92.3" y="89.2" width="9.4" height="7.9" rx="2.25" fill="#222a3d" stroke={accent} />
      <path d="m93.6 93.5 2-1.6 1.5 2 2.4-1.4" fill="none" stroke={accent} />
    </> : model === 'bracelet' ? <path d="M93 93h8" stroke={accent} strokeWidth="2.5" strokeDasharray="1.5 1" />
      : <path d="M93 91h8m-8 4h8" stroke={accent} strokeWidth="1.6" />}
  </g>;
}

function Neckwear({ item, id }: { item: CapiItem; id: string }) {
  const { model, color, accent, detail } = item;
  const cloth = PATTERNS[detail] ? `url(#${id}-fabric)` : color;
  return <g stroke={ink(color)} strokeWidth="1.18" strokeLinejoin="round" strokeLinecap="round">
    <Textile item={item} id={id} />
    {(model === 'tie' || model === 'stringTie') && <path d="m60 71 4 5-3 3 5 16-6 5-6-5 5-16-3-3Z" fill={cloth} />}
    {model === 'bow' && <path d="m51 74 9 3 9-3v8l-9-3-9 3Z" fill={cloth} />}
    {model === 'scarf' && <path d="M32 67q25 8 55 1l-3 7q-11 4-23 4l-2 13-8-3 2-10-19-5Z" fill={cloth} />}
    {model === 'pin' && <g fill={accent} transform="translate(78 82)">
      <circle r="4.3" fill={color} /><path d="M-2.6.1q-.4-1.6 1-1.5-.1-1.8.9-1.6l.6 1 2.1.4 1 1.9q-.4 1.5-2.4 1.6h-2.3Z" />
    </g>}
    {model === 'necklace' && <path d="M44 71q16 21 32 0" fill="none" stroke={color} strokeWidth={detail === 'nilo' ? 4.2 : 2.7} strokeDasharray={detail === 'perolas' ? '.1 3.3' : undefined} />}
    {model === 'choker' && <path d="M44 70q16 8 32 0" fill="none" stroke={accent} strokeWidth="2.55" />}
    {model === 'medal' && <><path d="m45 71 15 15 15-15" fill="none" stroke={accent} strokeWidth="2.85" /><circle cx="60" cy="88" r="5" fill={color} /><path d="M58 89h4m-2-3v3" stroke="#ffecbd" /></>}
  </g>;
}

function Jewelry({ item }: { item: CapiItem }) {
  return <g fill="none" stroke={item.accent} strokeWidth="1.6">
    {item.model === 'hoop' ? <ellipse cx="87" cy="23.4" rx="2.75" ry="4.25" />
      : <path d="m87 22 2.8 3.8-2.8 3.2-2.7-3.2Z" fill={item.color} />}
  </g>;
}

function Belt({ item, id }: { item: CapiItem; id: string }) {
  return <g stroke={ink(item.color)} strokeWidth="1.35" strokeLinejoin="round">
    <Textile item={item} id={id} />
    <path d="M34 88q26 6 52 0v6q-26 6-52 0Z" fill={PATTERNS[item.detail] ? `url(#${id}-fabric)` : item.color} />
    {item.model === 'obi' ? <path d="m58 92-6 5v-9l8 3 6-4v10l-6-4Z" fill={item.accent} />
      : <rect x={item.detail === 'campeão' ? 53 : 56} y="91" width={item.detail === 'campeão' ? 14 : 8} height="6" rx="2" fill={item.accent} />}
  </g>;
}

function Carried({ item }: { item: CapiItem }) {
  const { model, color, accent, detail } = item;
  const outline = ink(color);
  // Os objetos equipados ficam na mão esquerda. As ações do clima ocupam o outro lado.
  return <g transform="translate(18 98)" stroke={outline} strokeWidth="1.45" strokeLinejoin="round" strokeLinecap="round">
    {model === 'book' && <g transform="rotate(-12)">
      <rect x="-8" y="-15" width="18" height="23" rx="2.5" fill={color} />
      <path d="M-4-14V6h12" stroke={accent} fill="none" />
      <text x="2" y="-5" fontSize={detail.length > 2 ? 4.7 : 6} fontWeight="800" textAnchor="middle" fill={accent} stroke="none">{detail}</text>
    </g>}
    {(['bag', 'case', 'file'].includes(model)) && <g>
      <path d={model === 'bag' ? 'M-7-12q10-10 19 0v17H-7Z' : 'M-9-11h24V6H-9Z'} fill={color} />
      <path d={model === 'file' ? 'M-9-8h24M-4 0h13' : 'M-4-11v-5h12v5M-6-6q10 4 19 0'} fill="none" stroke={accent} />
      {detail === 'transversal' && <path d="M10-10q8-18 23-21" stroke={accent} strokeWidth="1.75" fill="none" />}
      {model === 'bag' && <path d="M0 0h5V-4H0Z" fill={accent} />}
    </g>}
    {model === 'gavel' && <g transform="rotate(27)">
      <path d="M1-12v20" stroke={color} strokeWidth="3.8" />
      <rect x="-9" y="-19" width="20" height="9" rx="2" fill={color} />
      <path d="M-5-19v9m12-9v9" stroke={accent} strokeWidth="2.1" />
    </g>}
    {model === 'scale' && <g fill="none" stroke={accent} strokeWidth="1.55">
      <path d="M3-22V5M-3 5H9M-8-17h22m-18 0-4 10h8Zm14 0L6-7h8Z" fill={color} />
    </g>}
    {model === 'plaque' && <>
      <path d="M-11-10h29l2 13h-33Z" fill={color} />
      <text x="4" y="-1" stroke="none" fill={accent} textAnchor="middle" fontWeight="800" fontSize="5.4">{detail}</text>
    </>}
    {model === 'pen' && <g transform="rotate(25)"><path d="M-1-18h5V5L1.5 9-1 5Z" fill={color} /><path d="M0-9h3m-1 9v6" stroke={accent} /></g>}
    {model === 'cup' && <g><path d="M-7-11h20l-3 14q-9 6-14 0Z" fill={color} /><ellipse cx="3" cy="-11" rx="10" ry="3" fill={accent} /><path d="m7-11 3-14" stroke="#eae6da" strokeWidth="1.6" /></g>}
    {model === 'fan' && <g><path d="M4 4-12-12q14-15 30 0Z" fill={accent} /><path d="M4 4-9-15m13 19-7-22m7 22 4-22m-4 22 11-18" fill="none" stroke={color} /></g>}
    {model === 'umbrella' && <g transform="translate(1 -22)"><path d="M5-28v53q0 8 6 3" fill="none" stroke={accent} strokeWidth="2" /><path d="M-15-24q19-27 40 0-5-2-10 .8-5-3-10 0-5-3-10 0-5-3-10-.8Z" fill={color} /></g>}
    {model === 'pocketWatch' && <g><path d="M6-14q-5-15 9-19" fill="none" stroke={accent} strokeDasharray="2 1.5" /><circle cx="5" cy="-7" r="9" fill={accent} stroke={color} strokeWidth="2.5" /><path d="M5-12v5l3 2" fill="none" /></g>}
    {model === 'trophy' && <g fill={color}><path d="M-5-21h17l-2 9q-3 6-7 6t-7-6Z" /><path d="M-4-18h-7q2 8 7 9m16-9h7q-2 8-7 9M3-6V1m-7 0h14v4H-4Z" fill="none" stroke={accent} strokeWidth="2" />{detail === 'xadrez' && <path d="m1-13 1-6 6 3-2 4Z" fill={accent} />}</g>}
    {['racket', 'paddle', 'shuttleRacket'].includes(model) && <g transform="rotate(-24)">
      <ellipse cx="4" cy="-19" rx={model === 'shuttleRacket' ? 6.5 : 9} ry="12" fill={accent} fillOpacity=".7" stroke={color} strokeWidth="2.7" />
      <path d="M4-7V7" stroke={color} strokeWidth="3.55" />
      {model === 'paddle' ? <path d="M0-23h.2m7-2h.2m-4 8h.2m4 0h.2m-8-2h.2" strokeWidth="1.8" />
        : <path d="M0-28v16m4-17v19m4-19v18m-11-14h14m-15 4h16m-15 5h14" stroke={color} strokeWidth=".85" />}
    </g>}
    {model === 'soccerBall' && <g><circle cx="4" cy="-7" r="10" fill={color} /><path d="m4-12 5 3-2 5H1l-2-5Z" fill={accent} /><path d="m4-12-1-5m6 8 4-2m-6 7 3 4M1-4-3 1m2-10-4-2" fill="none" stroke={accent} /></g>}
    {model === 'basketBall' && <g><circle cx="4" cy="-7" r="10" fill={color} /><path d="M4-17V3m-10-10h20M-3-14q16 6 0 14m14-14Q-5-8 11 0" fill="none" stroke={accent} /></g>}
    {model === 'americanBall' && <g transform="rotate(-27)"><path d="M-8-7q11-14 24 0Q4 7-8-7Z" fill={color} /><path d="M-2-7h13m-9-2v4m4-4v4m4-4v4" stroke={accent} fill="none" /></g>}
    {model === 'baseballMitt' && <g><path d="M-7-12q-2-8 4-7l4 4q4-10 8-6 5 1 6 8L13 1 5 6-3 2Z" fill={color} /><path d="M-3-11q11 2 13-5m-10 14q-2-8 9-7" stroke={accent} fill="none" /></g>}
    {model === 'bat' && <g transform="rotate(26)"><path d="M2-28q5-4 7 1l-1 13L5 7H1v-5l2-21Z" fill={color} /><path d="M3 2h3m-3-4h3" stroke={accent} /></g>}
    {model === 'board' && <g transform={detail === 'skate' ? 'rotate(-18) translate(-2 2)' : 'rotate(22) translate(-2 -3)'}><path d={detail === 'skate' ? 'M-14-5q5 6 15 6h12l5-4q3 5-2 8l-4 2H-9q-6-3-5-12Z' : 'M0-31q12 9 10 29L3 12-6 2q-4-18 6-33Z'} fill={color} /><path d={detail === 'skate' ? 'M-7 7v4m18-4v4' : 'M1-27 3 8'} stroke={accent} strokeWidth="2.5" /></g>}
    {model === 'foil' && <g transform="rotate(25)"><path d="M4-32v34" stroke={color} strokeWidth="1.4" /><path d="M-2 1q6-9 12 0Z" fill={accent} /><path d="M4 2v8" stroke={outline} strokeWidth="2.4" /></g>}
    {model === 'archery' && <g transform="rotate(16)"><path d="M1-30Q23-14 1 9" fill="none" stroke={color} strokeWidth="3.4" /><path d="M1-30 6-10 1 9" fill="none" stroke={accent} /></g>}
    {model === 'club' && <g transform="rotate(21)"><path d="M5-27v29l-7 3" stroke={color} strokeWidth="2.5" fill="none" /><path d="M-7 4-1 1l7 2v4H-7Z" fill={accent} /></g>}
    {model === 'scroll' && <g transform="rotate(-19)"><rect x="-6" y="-18" width="19" height="22" rx="3" fill={color} /><path d="M-2-15h10m-10 4h7m-7 4h9m-9 4h6" stroke={accent} /></g>}
  </g>;
}

export function CapiGear({ item, id }: { item: CapiItem; id: string }) {
  switch (item.slot) {
    case 'suit': return <CapiClothing item={item} id={id} />;
    case 'head': return <HatArt item={item} id={id} />;
    case 'glasses': return <Glasses item={item} />;
    case 'legs': return <Legwear item={item} id={id} />;
    case 'shoes': return <Footwear item={item} />;
    case 'hands': return <Handwear item={item} />;
    case 'watch': return <Wrist item={item} />;
    case 'neck': return <Neckwear item={item} id={id} />;
    case 'ears': return <Jewelry item={item} />;
    case 'waist': return <Belt item={item} id={id} />;
    case 'carry': return <Carried item={item} />;
  }
}

const THUMB_BOX: Record<CapiSlot, string> = {
  suit: '13 62 94 51', head: '12 -2 97 59', glasses: '49 16 45 42', legs: '22 84 76 34',
  shoes: '23 88 73 32', hands: '11 78 100 33', watch: '87 82 20 22', neck: '26 64 67 38',
  ears: '79 18 17 15', waist: '29 83 61 23', carry: '0 61 43 57',
};

export function CapiItemThumb({ item }: { item: CapiItem }) {
  const id = 'gear-' + useId().replace(/[^a-z0-9_-]/gi, '');
  return <svg width={56} height={44} viewBox={THUMB_BOX[item.slot]} aria-hidden="true" focusable="false">
    <CapiGear item={item} id={id} />
  </svg>;
}
