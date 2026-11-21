import { useId } from 'react';
import { motion } from 'motion/react';
import { CAPI_ITEMS, type CapiLook } from '../content/capiCatalog';
import { CapybaraArt } from './CapybaraArt';
import { useAmbient } from './ambient';
import { capiScene, CAPI_WEATHER_LABEL, RITUAL_NAME, type CapiReaction, type Mood } from './capi';
import { useCapiWardrobe } from './CapiWardrobe';
import { isLowPerformance, reducedMotion, useSettings } from './settings';

const EXPRESSIONS: Record<Mood, string> = {
  happy: 'contente', cheer: 'comemorando', think: 'em concentração', sad: 'triste',
  sleep: 'com sono', grumpy: 'fazendo bico', proud: 'com orgulho',
};
const LOOK_POSES = {
  dance: { y: [0, -5, 0, -2, 0], rotate: [0, -8, 7, -3, 0] },
  speech: { y: [0, -3, 0], rotate: [0, -4, 0] },
  adventure: { y: [0, -4, 0], rotate: [0, 6, 0] },
  oratory: { y: [0, -2, 0], rotate: [0, 4, -2, 0] },
};
export type CapiPose = keyof typeof LOOK_POSES;

export function Mascot({ mood = 'happy', size = 96, decorative = false, still = false, reaction, scene = false, preview, avatar, posePreview }: {
  mood?: Mood; size?: number; decorative?: boolean; still?: boolean; reaction?: CapiReaction; scene?: boolean;
  preview?: CapiLook; avatar?: boolean; posePreview?: CapiPose;
}) {
  const id = `capivara-${useId().replace(/[^a-z0-9_-]/gi, '')}`;
  const amb = useAmbient();
  const { weather } = useSettings();
  const { equipped, gender } = useCapiWardrobe();
  const look = preview ?? equipped;
  const surroundings = capiScene(amb, weather, scene);
  const { effect, ritual } = surroundings;
  const staticPose = still || avatar || reducedMotion() || isLowPerformance();
  const pose = reaction === 'correct' || reaction === 'first' || reaction === 'recovered'
    ? { y: [0, -9, 0, -4, 0], rotate: [0, -8, 6, -3, 0], scale: [1, 1.09, .97, 1.03, 1] }
    : reaction === 'incorrect' ? { y: [0, 3, 0], rotate: [0, -7, 0] }
      : mood === 'cheer' ? { y: [0, -6, 0], rotate: [0, -4, 0] }
        : posePreview ? LOOK_POSES[posePreview] : undefined;
  const name = gender === 'feminino' ? 'A Capi' : 'O Capi';
  return (
    <motion.svg width={size} height={size} viewBox={avatar ? '5 -3 110 117' : '-3 -3 126 126'}
      role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} focusable="false"
      aria-label={decorative ? undefined : [name, EXPRESSIONS[mood],
        ...Object.values(look).flatMap((item) => item ? [CAPI_ITEMS[item].name.toLowerCase()] : []),
        effect && CAPI_WEATHER_LABEL[effect], ritual && 'com ' + RITUAL_NAME[ritual]].filter(Boolean).join(', ')}
      data-suit={look.suit} data-glasses={look.glasses ?? undefined} data-watch={look.watch ?? undefined}
      data-gender={gender} data-mood={mood} data-capi-weather={effect ?? undefined} data-ritual={ritual} data-reaction={reaction}
      animate={staticPose || !pose ? { y: 0, rotate: 0, scale: 1 } : pose}
      transition={{ duration: staticPose || !pose ? 0 : posePreview ? 1.1 : .7, ease: 'easeInOut' }}>
      <CapybaraArt id={id} mood={mood} period={amb.period} look={look} gender={gender} scene={surroundings}
        portrait={avatar} animated={!staticPose && (scene || !!reaction)} reaction={reaction} />
    </motion.svg>
  );
}

export function MascotQuestion({ text }: { text: string }) {
  return (
    <div className="mascot-question">
      <Mascot mood="think" size={38} decorative />
      <h2>{text}</h2>
    </div>
  );
}
