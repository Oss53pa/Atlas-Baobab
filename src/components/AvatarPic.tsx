import { avatarGlyph, avatarImage, type AvatarKey } from '../lib/avatars.js';

/**
 * Rend l'avatar : illustration webp si le pack existe, sinon l'emoji (fallback
 * propre). À placer dans un conteneur rond/carré (.face, .set-av-e…) : l'image
 * remplit le conteneur, l'emoji hérite de la taille de police du parent.
 */
export function AvatarPic({ akey, stage = 4, className, alt = '' }: {
  akey: AvatarKey; stage?: number; className?: string; alt?: string;
}) {
  const img = avatarImage(akey);
  if (img) return <img className={`avatar-pic ${className ?? ''}`} src={img} alt={alt} loading="lazy" decoding="async" />;
  return <>{avatarGlyph(akey, stage)}</>;
}
