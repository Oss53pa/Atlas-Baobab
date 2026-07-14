# Illustrations de la landing

Illustrations générées (ChatGPT/DALL·E, cf. `docs/illustrations-prompts.md`),
converties en **WebP** (qualité 82) pour rester légères hors ligne. Fichiers
servis par le composant `ArtImage` :

| Fichier | Section | Ratio réel |
|---|---|---|
| `hero-famille.webp` | La boucle | 5:4 |
| `fondatrice.webp` | Note fondatrice | 4:5 |
| `comprendre.webp` | On connaît ce chemin | 4:3 |
| `parole.webp` | Les outils (CAA) | 4:3 |
| `apaiser.webp` | Manifeste | 1:1 |
| `celebrer.webp` | Célébration des forces | 5:4 |
| `cta-baobab.webp` | CTA final | 3:2 |

Pour régénérer/optimiser : script `scratchpad/conv.py` (Pillow) — resize max
1600 px + WebP q82. Total ~1,7 Mo pour les 7. Tant qu'un fichier manque, un
cadre doux « à venir » s'affiche — la mise en page ne casse jamais.
