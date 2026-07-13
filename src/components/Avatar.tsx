import { avatarGlyph, type AvatarKey, type AvatarMotion } from '../lib/avatars.js';

/** Incarnation visuelle de l'Avatar CORTEX (CDC C02). Respecte le réglage de
 * mouvement : 'static' = zéro animation (garde-fou sensoriel §C2.5.3). */
export function Avatar({
  avatarKey,
  growthStage = 1,
  motion = 'slow',
  size = 56,
  breathing = false,
}: {
  avatarKey: AvatarKey;
  growthStage?: number;
  motion?: AvatarMotion;
  size?: number;
  breathing?: boolean;
}) {
  const animate = motion !== 'static' && breathing && motion === 'slow';
  return (
    <span
      className={animate ? 'avatar-badge avatar-breathe' : 'avatar-badge'}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
      aria-hidden
    >
      {avatarGlyph(avatarKey, growthStage)}
    </span>
  );
}
