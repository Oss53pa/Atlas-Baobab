# Kit de prompts — illustrations de la landing Atlas Baobab

Objectif : un jeu cohérent d'illustrations chaleureuses (style livre d'enfant /
aquarelle douce), familles afro-descendantes, palette Atlas Baobab, pour peupler
la page d'accueil.

## Outil recommandé
**Adobe Firefly** (firefly.adobe.com) — c'est le seul grand générateur entraîné
sur du stock licencié + domaine public, avec **droits commerciaux garantis et
indemnisés**. DALL·E (ChatGPT) fonctionne aussi. Éviter Midjourney pour un
produit vendu (droits plus flous selon l'offre).

## Réglage Firefly (à garder identique pour TOUTES les images)
- Content type : **Art**
- Style : coller l'**ancre de style** ci-dessous dans chaque prompt.
- Cohérence : générer d'abord le **héros**, puis activer **« Référence de
  style »** (Style reference) en pointant le héros retenu pour toutes les
  suivantes. Garde la même palette de mots à chaque fois.
- Aspect ratio : voir chaque scène.

## Ancre de style (STYLE — à coller à la fin de chaque prompt)
```
warm soft watercolor and colored-pencil children's-book illustration, cozy and
tender mood, gentle natural window light, muted earthy palette of sage green,
warm amber, terracotta and cream, delicate linework with subtle paper grain,
soft flat shading, wholesome hopeful storybook aesthetic, West-African /
Afro-descendant family with warm brown skin and natural coily hair depicted
joyfully and with dignity, clean uncluttered composition with soft negative
space, light airy background, no text, no logo, no watermark, no harsh neon
colors, no dark background
```

## Négatif (si l'outil a un champ « éviter »)
```
extra fingers, deformed hands, distorted faces, blurry, harsh outlines, neon,
dark moody background, text, letters, watermark, logo, photo, 3d render
```

---

## Les 6 scènes (+ 1 bonus)

### 1. Héros — la famille réunie  · ratio 4:5 · `hero-famille.png`
```
A warm cozy living room at golden hour, a loving family together on a soft
couch — a mother, a father and two young children, one child gently absorbed in
his own world holding a small toy, everyone relaxed and content, a small dog
resting nearby, plants and books around, blankets. [STYLE]
```

### 2. Note fondatrice — maman & enfant  · ratio 1:1 · `fondatrice.png`
```
Tender close moment between a young mother and her autistic child, foreheads
gently touching, the mother smiling softly with love, the child calm and
serene, soft cream background, intimate and reassuring. [STYLE]
```

### 3. Comprendre — observer avec patience  · ratio 4:3 · `comprendre.png`
```
A calm parent sitting on the floor attentively and lovingly watching her child
play with wooden blocks and shapes, patient understanding gaze, warm home, soft
daylight. [STYLE]
```

### 4. La parole (CAA) — à hauteur d'enfant  · ratio 4:3 · `parole.png`
```
A father kneeling down to his young child's eye level, the child happily
pointing at a colorful picture-card communication board, joyful connection,
encouraging, bright warm room. [STYLE]
```

### 5. Apaiser — le câlin qui rassure  · ratio 1:1 · `apaiser.png`
```
A mother softly holding and comforting her child in a cozy calm corner with
cushions and a soft blanket, peaceful and safe, gentle muted warm tones. [STYLE]
```

### 6. Célébrer les forces — le petit pas  · ratio 4:3 · `celebrer.png`
```
A proud young child joyfully showing a drawing to a delighted parent who claps,
celebrating a small victory, a small stylized baobab tree in a pot nearby,
uplifting and warm. [STYLE]
```

### Bonus — CTA final : marche vers le baobab  · ratio 16:9 · `cta-baobab.png`
```
A parent and child walking hand in hand outdoors toward a large majestic baobab
tree at warm golden sunset, hopeful journey, soft rolling savanna. [STYLE]
```

---

## Export & dépôt (pour que l'intégration soit automatique)
1. Exporter en **PNG**, ~**1600 px** sur le grand côté (héros jusqu'à 2000 px).
2. Nommer **exactement** comme ci-dessus (`hero-famille.png`, `fondatrice.png`,
   `comprendre.png`, `parole.png`, `apaiser.png`, `celebrer.png`,
   `cta-baobab.png`).
3. Déposer les fichiers dans **`public/art/`**.
4. C'est tout : le composant `ArtImage` les affiche automatiquement aux bonnes
   sections (un cadre doux « à venir » s'affiche tant que le fichier manque).

> Astuce cohérence : générez 3–4 variantes par scène, gardez celles qui
> partagent le mieux la même lumière et la même palette. Le héros donne le ton :
> choisissez-le en premier et servez-vous-en comme référence de style.
