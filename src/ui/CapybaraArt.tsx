import type { Period } from './ambient';
import { CAPI_ITEMS, DEFAULT_CAPI_LOOK, type CapiGender, type CapiLook, type CapiSlot } from '../content/capiCatalog';
import { CapiClothing, CapiGear } from './CapiWardrobeArt';
import type { CapiScene, CapiReaction, Mood, Ritual } from './capi';

const LIGHT = {
  manha: { halo: '#8ecaff', fur: '#cf986e', rim: '#bcd7ff' },
  tarde: { halo: '#ff9a52', fur: '#d09a6e', rim: '#f8b579' },
  noite: { halo: '#9b8bff', fur: '#c98f69', rim: '#b5a8f7' },
  madrugada: { halo: '#7287e5', fur: '#c38a65', rim: '#99acef' },
};

const FUR_OUTLINE = '#582f21';
const MOUTH: Record<Mood, string> = {
  happy: 'M25 54q2.8 5.2 7 1.3 5.7 4.2 8.4-.9',
  cheer: 'M25 53q7 4 16-.4c-2 8-13 9.1-16 .4Z',
  think: 'M28 55q5.5 1.8 9.9-.2',
  sad: 'M26 57q6.6-5.7 13.3-1.2',
  sleep: 'M29 54q2.5 3 5.6.8',
  grumpy: 'M25.7 57.1q2.6-4.3 7.4-2.4 4.8-2.2 7.1.5',
  proud: 'M25 53.7q7 6.2 15.5-.4',
};

export function CapybaraArt({ id, mood, period, look, gender, scene, animated, reaction, portrait }: {
  id: string; mood: Mood; period: Period; look: CapiLook; gender: CapiGender; scene: CapiScene; animated: boolean;
  reaction?: CapiReaction; portrait?: boolean;
}) {
  const { effect, ritual, wind, rain } = scene;
  const suit = CAPI_ITEMS[look.suit ?? DEFAULT_CAPI_LOOK.suit!];
  const gear = (slot: CapiSlot) => {
    const item = look[slot] && CAPI_ITEMS[look[slot]!];
    return item ? <CapiGear item={item} id={id + '-' + slot} /> : null;
  };
  const feminine = gender === 'feminino';
  const tone = LIGHT[period];
  const rainy = effect === 'rain' || effect === 'storm';
  const cold = effect === 'cold' || effect === 'snow';
  const night = period === 'noite' || period === 'madrugada';
  const closedEye = mood === 'sleep' || mood === 'cheer';
  const pupilX = mood === 'think' ? 72 : mood === 'grumpy' ? 69 : 70;
  const pupilY = mood === 'think' || mood === 'proud' ? 32 : 34;
  const ref = (name: string) => 'url(#' + id + '-' + name + ')';

  return <>
    <defs>
      <radialGradient id={id + '-halo'}>
        <stop stopColor={tone.halo} stopOpacity=".28" />
        <stop offset="1" stopColor={tone.halo} stopOpacity="0" />
      </radialGradient>
      {rainy && <linearGradient id={id + '-umbrella'} x2=".5" y2="1">
        <stop stopColor="#c4cdff" />
        <stop offset="1" stopColor={effect === 'storm' ? '#596fc0' : '#8090ec'} />
      </linearGradient>}
    </defs>
    <circle cx="60" cy="63" r="55" fill={ref('halo')} />
    {!portrait && night && <g fill={tone.rim} opacity=".78">
      <path d="M105 12c-3 7 1 14 8 15-5 3-12 0-13-5-1-4 1-8 5-10Z" />
      <circle cx="97" cy="14" r="1" /><circle cx="114" cy="16" r="1" />
    </g>}
    {!portrait && !night && <path d={period === 'manha' ? 'M10 25h12m-10-3a4 4 0 0 1 8 0m-4-8v-3' : 'M105 9v4m0 14v4m-10-11h4m12 0h4m-6 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'}
      stroke={tone.rim} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".72" />}
    {effect === 'fog' && <g className={animated ? 'capi-fog' : undefined} stroke="#d0ddeb" strokeWidth="2.4" strokeLinecap="round" opacity=".65">
      <path d="M6 35h17m-20 6h12m83-3h18m-23 5h16M3 70h14m81-12h17" />
    </g>}
    {effect === 'cloud' && <path className={animated ? 'capi-cloud' : undefined}
      d="M98 35h11a3 3 0 0 0 0-6 4 4 0 0 0-7.6.4A3 3 0 1 0 98 35Z" fill="#d1dcf4" opacity=".8" />}
    {effect === 'sun' && <g className={animated ? 'capi-sun' : undefined} stroke="#ffe0a4" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="103" cy="30" r="4" fill="#ffd48a" /><path d="M103 21v2m0 14v2m-9-9h2m14 0h2m-15-6 1.2 1.2m9.5 9.5 1.1 1.1m0-12-1.1 1.2m-9.5 9.5-1.2 1.2" />
    </g>}
    {effect === 'snow' && <g className={animated ? 'capi-snowfall' : undefined} fill="#e7f4ff" opacity=".86">
      <circle cx="11" cy="23" r="1.7" /><circle cx="9" cy="48" r="1.45" />
      <circle cx="27" cy="14" r="1.2" /><circle cx="108" cy="31" r="1.8" />
      <circle cx="101" cy="52" r="1.3" /><circle cx="113" cy="69" r="1.8" />
    </g>}

    <ellipse cx="61" cy="111" rx="38" ry="5" fill="#11152d" opacity=".35" />
    <g className={animated && cold ? 'capi-shiver' : undefined}>
      <g stroke={FUR_OUTLINE} strokeWidth="1.55" strokeLinejoin="round">
        <path d="M33 101q-5 5-4 8 1 3 7 3h15q6 0 6-5m27-6q6 5 5 8-1 3-7 3H68q-6 0-6-5"
          fill="#9c7060" />
        <path d="M39 65q-11 7-11 23c0 16 10 22 32 22s33-7 33-22q0-15-13-23Z" fill={tone.fur} />
        <path d="M25 78q-11 10-10 17c1 6 9 8 16 1l8-11Zm64 .5q14 9 15 16c0 6-8 9-15 3l-8-12Z"
          fill="#a97a67" />
      </g>
      <path d="M39 88q2 18 21 18t20-18Z" fill="#edc5a6" />
      {gear('legs')}
      <CapiClothing item={suit} id={id + '-outfit'} neckCovered={!!look.neck && CAPI_ITEMS[look.neck].model !== 'pin'} />
      {gear('shoes')}
      {gear('waist')}
      {gear('neck')}
      {gear('hands')}
      {gear('watch')}

      <g className={animated ? 'capi-ears' : undefined} stroke={FUR_OUTLINE} strokeWidth="1.45" strokeLinejoin="round">
        <path d="M50.6 17.4C47.2 11.9 50.5 6.5 54.4 5.7c3.6-.7 6.2 3.4 7.8 9.4Z" fill="#b57b5d" />
      </g>
      <path d="M78 16.8c2.1-4.7 6.3-8.9 10.4-8.5 4.9.5 7.8 5.2 7.1 9.2-.5 3.4-3 5.5-6.9 7.6
        3.6 4.9 4.1 12.7 4.8 19.8 1 8.7 2.5 15.9-3.8 21.1-8.1 6.8-28.5 7.6-47.4 5.7
        C27.9 70.2 19 66.4 17.9 56.3c-.8-7.1-.6-16.2.5-23.1 1-6.5 5.6-11.3 12.7-14.2
        C43.5 13.7 66.2 10.9 78 16.8Z" fill="#ac7253" stroke={FUR_OUTLINE} strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M79.3 18.7c8.4 1.5 9.1 10.6 10.2 19.6 1.3 10.3 2.1 18-4.2 22.6
        -8.7 6.5-26.8 7.5-42 6.7-13.8-.8-22.5-3.6-23.5-14.4-.7-8.1.2-15.3 1.5-21.1
        1.5-5.9 5.6-9.5 12.4-12.1 13.9-5.2 35.9-6.7 45.6-1.3Z" fill={tone.fur} />
      <path d="M20.4 34.2c2.3-6.9 7.4-10.4 15-13.4 12.8-5 33.3-6.7 43.9-2" fill="none"
        stroke="#f3c8a2" strokeWidth="1.45" strokeOpacity=".82" strokeLinecap="round" />
      <path d="M78 16.8c2.1-4.7 6.3-8.9 10.4-8.5 4.9.5 7.8 5.2 7.1 9.2-.5 3.4-3 5.5-6.9 7.6l-3-3.35Z"
        fill="#bc896f" />
      <path d="M78.1 17.5q5.2-10 10.6-8.1m-4.95 12.5q.9-4.4 4.25-7.4m.7 10.6q3.55-1.8 5.3-4.4"
        fill="none" stroke={FUR_OUTLINE} strokeWidth="1.45" strokeLinecap="round" />

      <path d="M20.1 35.4c1-6.1 4.8-7.8 11-7.7 10.2.2 16.5 4.5 16.5 14.9v9.7c-.1 7.8-4.8 12.1-13.3 11.7
        -9.2-.4-14.2-4.5-14.8-11.2-.5-5.8-.2-11.9.6-17.4Z" fill="#a97e6d" />
      <path d="M23 34.2c-2.3 1-1.6 4.3 1.2 4.9 1.2.3 1.9 1 2.1 1.6.3.6 1.45.5 1.6-.4.35-2.7-2.1-7.4-4.9-6.1Zm14.4.6c2.35.2 2.55 3.1.3 4.15-1.1.55-2.6.4-3.05 1.45-.4 1.1-1.6.9-1.6-.35 0-2.4 2.2-5.47 4.35-5.25Z" fill={FUR_OUTLINE} />
      <path d="M30.7 41.6q-1.25 7.2 1.25 12.95" fill="none" stroke={FUR_OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
      <path d={MOUTH[mood]} fill={mood === 'cheer' ? FUR_OUTLINE : 'none'} stroke={FUR_OUTLINE}
        strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      {mood === 'cheer' && <path d="M29.7 56.7q3.8-1.6 8-.8-.9 2.2-4 2.5-2.45.1-4-1.7Z" fill="#ff8e95" />}
      <ellipse cx="77.3" cy="45" rx="4.35" ry="2.45" fill="#ff9398" opacity=".9" />
      {closedEye ? <path
        d={mood === 'sleep' ? 'M64 34q6 6.5 12 0' : 'M64 36q6-7 12 0'}
        fill="none" stroke={FUR_OUTLINE} strokeWidth="2" strokeLinecap="round" />
        : <g className={animated ? 'tuca-blink' : undefined}>
          <circle cx="70" cy="34" r="7.8" fill="#fffdf9" stroke={FUR_OUTLINE} strokeWidth="1.55" />
          <circle cx={pupilX} cy={pupilY} r="5.15" fill="#11172e" />
          <circle cx={pupilX - 2.55} cy={pupilY - 2.8} r="2.03" fill="#fff" />
          <circle cx={pupilX + 2.4} cy={pupilY + 2.2} r="1.05" fill="#fff" />
        </g>}
      {mood === 'think' && <path d="M65.6 24.3q4.5-3.1 9.2-1.4" fill="none" stroke={FUR_OUTLINE} strokeWidth="1.4" strokeLinecap="round" />}
      {mood === 'sad' && <path d="M65 24.1q5 2 10.5.6" fill="none" stroke={FUR_OUTLINE} strokeWidth="1.4" strokeLinecap="round" />}
      {mood === 'grumpy' && <path d="M64.1 26.1q5.2-.7 12.7-3.9" fill="none" stroke={FUR_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />}
      {mood === 'proud' && <path d="M63.8 24.3q5.5-3.8 11.9-1.4" fill="none" stroke={FUR_OUTLINE} strokeWidth="1.5" strokeLinecap="round" />}
      {feminine && <>
        <path d="M40 17.3q12-6 27-4.4 7 1 11 5.1-18-4.1-30 4.3l2.2-3.9q-5.8 2.6-11.3 2.6Z"
          fill="#8e5b46" opacity=".89" />
        {!closedEye && <path d="M76 28.9q4.5-.6 5.5-2.5m-4.5 5q4.3 0 5.5-1.6"
          fill="none" stroke={FUR_OUTLINE} strokeWidth="1.45" strokeLinecap="round" />}
      </>}
      {gear('glasses')}
      {gear('ears')}
      {gear('head')}
      {gear('carry')}
    </g>

    {cold && <g className={animated ? 'capi-breath' : undefined} fill="none" stroke="#e4f3fd" strokeWidth="1.4" strokeLinecap="round" opacity=".62">
      <path d="M19 51q-6-3-9 .4m8 3.2q-5-1.3-8 .6m3.3 3q-3-.1-5.2 1" />
    </g>}
    {(effect === 'warm' || effect === 'sun') && <path className={animated ? 'capi-sweat' : undefined}
      d="M83 45c-3.3 4.2-3.9 6.2-1.2 7.2 2.8 1.1 4.4-1.9 1.2-7.2Z"
      fill="#addef3" stroke="#6c9cbf" strokeWidth=".65" opacity=".75" />}
    {rainy && <g className={animated ? (wind || rain === 'heavy' ? 'tuca-umbrella capi-umbrella-wind' : 'tuca-umbrella') : undefined}>
      <path d="M105 89 94 17m11 72q2 8-4 7" stroke="#bac6ee" strokeWidth="2.3" strokeLinecap="round" fill="none" />
      <path d="M51 21Q81-12 114 18c-6-3-12-3-17 1-5-3-11-3-17 1-6-3-11-3-16 1-4-3-9-3-13 0Z"
        fill={ref('umbrella')} stroke="#bec7ff" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M81 5q-11 5-17 16M81 5l-1 15m1-15q10 4 16 14" fill="none" stroke="#4f61ae" strokeWidth="1.15" />
      <path d="M10 37l-3 6m4 8-3 6m103-19-3 6" stroke="#9bd8ff" strokeWidth="1.8" strokeLinecap="round" />
      {effect === 'storm' && <path d="m13 58-4 8h4l-2 7 8-11h-5l3-4Z" fill="#fce39c" />}
    </g>}
    {!reaction && ritual && <RegionalRitual ritual={ritual} animated={animated && mood !== 'sleep'} />}
    {reaction && <ReactionProp reaction={reaction} animated={animated} />}
    {mood === 'cheer' && <path className={animated ? 'tuca-twinkle' : undefined} d="m104 44 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ffe3a2" />}
    {mood === 'think' && <text x="8" y="32" fill={tone.rim} fontSize="16" fontWeight="800">?</text>}
    {mood === 'sleep' && <text x="11" y="21" fill={tone.rim} fontSize="11" fontWeight="800">z z</text>}
  </>;
}

function RegionalRitual({ ritual, animated }: { ritual: Ritual; animated: boolean }) {
  if (ritual === 'acai') return <g className={animated ? 'capi-snack' : undefined}>
    <path d="M64 88h28q-3 15-14 15-11 0-14-15Z" fill="#8c6199" stroke="#d7a4da" strokeWidth="1.2" />
    <ellipse cx="78" cy="88" rx="14" ry="3.7" fill="#432847" stroke="#d7a4da" strokeWidth="1" />
    <path d="m77 88 10-13m-14 13 1 .1m9-1 1 .1m-4 2 1 .1" stroke="#f1cf87" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="67" cy="95" rx="5" ry="3.5" fill="#b67b55" />
  </g>;
  return <g className={animated ? 'capi-sip' : undefined}>
    {ritual === 'terere'
      ? <><path d="M73 85h18l-3 16q-4 4-12 0Z" fill="#aa784c" stroke="#ebc583" strokeWidth="1.2" /><path d="M75 96q5 3 14 0" stroke="#e7c386" strokeWidth="1.6" fill="none" /></>
      : <path d="M72 85h20l-3 5q4 8-2 11-7 3-12 0-5-4 0-11Z" fill="#9b612f" stroke="#eac88f" strokeWidth="1.2" />}
    <ellipse cx="82" cy="85" rx="10" ry="3" fill={ritual === 'terere' ? '#7da78c' : '#8f9d54'} stroke="#dfc392" strokeWidth="1" />
    <path d="m84 85 3-13 3-2" stroke="#e7e4d8" strokeWidth="1.65" fill="none" strokeLinecap="round" />
    <ellipse cx="74" cy="94" rx="5" ry="3.6" fill="#b67b55" />
    {ritual === 'chimarrao' ? <path className={animated ? 'capi-steam' : undefined} d="M79 80q-4-3 0-7t0-7m6 12q-3-4 0-7" fill="none" stroke="#fff1d8" strokeOpacity=".72" strokeWidth="1.1" strokeLinecap="round" />
      : <path d="M78 92l1 3m6-4 1 2" stroke="#d2f5ed" strokeWidth="1.2" strokeLinecap="round" />}
  </g>;
}

function ReactionProp({ reaction, animated }: { reaction: CapiReaction; animated: boolean }) {
  if (reaction === 'first') return <g className={animated ? 'capi-high-five' : undefined}>
    <path d="M37 92q-14 2-18-12" stroke="#a26748" strokeWidth="7" fill="none" strokeLinecap="round" />
    <ellipse cx="18" cy="77" rx="6" ry="8" fill="#e3a874" stroke="#88583e" strokeWidth="1" />
    <path d="m8 71-2-3m12-3v-4m9 9 3-2" stroke="#ffe3a2" strokeWidth="1.7" strokeLinecap="round" />
  </g>;
  if (reaction !== 'incorrect' && reaction !== 'recovered') return null;
  return <g transform="rotate(-10 86 95)">
    <rect x="71" y="88" width="30" height="16" rx="3" fill="#5c6489" stroke="#cad4eb" strokeWidth="1.2" />
    <path d="M86 90v12m-10-9h7m6 0h8m-8 3h6" stroke="#dbe2f4" strokeWidth="1.15" opacity=".7" />
    <path className={animated ? 'capi-bookmark' : undefined} d="M82 85h5v12l-2.5-2L82 97Z" fill="#ffcf79" data-remove={reaction === 'recovered' || undefined} />
  </g>;
}
