import { useState } from 'react';

/**
 * Illustration raster de la landing (générée par IA, style aquarelle chaud —
 * cf. docs/illustrations-prompts.md). Tant que le fichier n'est pas déposé dans
 * public/art/, un cadre doux « à venir » s'affiche : la mise en page ne casse
 * jamais, et l'image apparaît d'elle-même dès que le PNG est présent.
 */
export function ArtImage({
  name, alt, ratio = '4 / 3', className,
}: { name: string; alt: string; ratio?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`art-img ${className ?? ''}`} style={{ aspectRatio: ratio }}>
      {failed ? (
        <span className="art-ph" role="img" aria-label={alt}>
          <img src="/baobab.png" width={34} height={34} alt="" style={{ opacity: 0.5, filter: 'saturate(1.2)' }} />
          <small>{alt}</small>
        </span>
      ) : (
        <img
          src={`/art/${name}`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </figure>
  );
}
