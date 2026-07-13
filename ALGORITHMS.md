# ALGORITHMS.md — Moteur Jumeau (déterministe, versionné)

> **Règle absolue (CDC §4.4, §8.2).** Tous les scores, seuils, détections et
> prédictions ci-dessous sont calculés par du code TypeScript déterministe et
> versionné. **Aucun LLM (PROPH3T) n'entre jamais dans ces calculs.** PROPH3T ne
> fait que _formuler_ en langage naturel des résultats déjà calculés.
>
> Toute modification d'une formule **doit** incrémenter la version d'algorithme
> concernée (`src/version.ts`) et être consignée ici (avenant versionné, CDC §3.3).

Implémentation : `packages/twin-engine/`. Tests : `packages/twin-engine/test/`
(46 cas, couverture > 99 %). Le moteur est **pur** : mêmes entrées → même sortie,
aucun effet de bord, aucun accès réseau. L'instant de calcul (`computedAt`) est
toujours passé explicitement — jamais de lecture d'horloge implicite — pour la
reproductibilité.

---

## Versions actives

| Constante | Valeur | Portée |
|---|---|---|
| `TWIN_ALGO_VERSION` | `twin-1.0.0` | Profil sensoriel + déclencheurs (Vague 1) |
| `RADAR_ALGO_VERSION` | `radar-0.1.0-experimental` | Score de tension (spécifié §3.3, rattaché Vague 2) |

---

## 1. Fenêtre glissante

Détection sur une fenêtre `[computedAt − windowDays, computedAt]`, **30 jours par
défaut** (CDC §3.3). Un enregistrement dont l'horodatage est hors fenêtre, dans le
futur (> `computedAt`), ou non parsable, est écarté. Référence : `src/time.ts`.

Tranches horaires (UTC), utilisées comme facteur `time` :

| Bucket | Heure (h, UTC) |
|---|---|
| `morning` | 6 ≤ h < 12 |
| `afternoon` | 12 ≤ h < 17 |
| `evening` | 17 ≤ h < 22 |
| `night` | sinon (22–6) |

---

## 2. Profil sensoriel (`computeSensoryProfile`)

Agrège les `SensorySignal` (canal, direction hypo/hyper, intensité 1–5) portés par
le contexte des observations **et** des incidents, dans la fenêtre. 8 canaux
(CDC §3.2) : visual, auditory, tactile, gustatory, olfactory, vestibular,
proprioceptive, interoceptive.

Pour chaque canal, avec `count` = nombre de signaux du canal :

```
hypo_score  = Σ intensité(hypo)  / (count × 5)      ∈ [0, 1]
hyper_score = Σ intensité(hyper) / (count × 5)      ∈ [0, 1]
```

Les intensités sont bornées `[0, 5]` (valeurs hors plage / non finies neutralisées).
`hypo_score + hyper_score ≤ 1`.

**Classification** (`SensoryClassification`) :

| Condition | Résultat |
|---|---|
| `count < 3` | `insufficient_data` |
| `hypo_score < 0.1` **et** `hyper_score < 0.1` | `neutral` |
| `|hyper_score − hypo_score| < 0.15` | `mixed` |
| `hyper_score > hypo_score` | `hyper` |
| sinon | `hypo` |

**Confiance** (par taille d'échantillon, jamais présentée comme certitude) :

| `count` | Confiance |
|---|---|
| < 3 | `insufficient` |
| 3–4 | `faible` |
| 5–9 | `moyen` |
| ≥ 10 | `fort` |

---

## 3. Détection de déclencheurs (`detectTriggers`)

Corrélation événement/incident sur la fenêtre glissante, **seuil minimal de 3
occurrences** (CDC §3.3). Référence : `src/triggers.ts`.

**Facteurs candidats** dérivés de chaque enregistrement :

| Dimension | Source |
|---|---|
| `place` | `context.place` |
| `people` | chaque personne de `context.people` (entrées vides ignorées) |
| `noise` = `high` | `context.noise_level ≥ 4` |
| `time` | tranche horaire de l'horodatage |
| `suspected` | `incident.suspected_trigger` (trimé ; incidents uniquement) |

Un facteur compte **une fois par enregistrement** (dédoublonnage).

Pour chaque facteur :

```
support     = nb d'incidents distincts (fenêtre) portant le facteur   [exigé ≥ 3]
factorTotal = nb d'enregistrements (incidents + observations) portant le facteur
baseRate    = totalIncidents / totalRecords
lift        = (support / factorTotal) / baseRate
```

> `lift` n'est **défini que si** des enregistrements non-incident portent aussi le
> facteur (`factorTotal > support`). Sinon il reste indéfini (le facteur n'apparaît
> qu'avec des crises : pas de base de comparaison). Les observations de `kind =
> 'incident'` sont exclues du dénominateur pour éviter le double comptage avec la
> table `incidents`.

**Confiance** — palier de base par `support`, ajusté par le `lift` :

| `support` | Palier de base |
|---|---|
| 3–4 | `faible` |
| 5–7 | `moyen` |
| ≥ 8 | `fort` |

Ajustement : `lift < 1.2` → −1 palier (min `faible`) ; `lift ≥ 2` → +1 palier
(max `fort`) ; `1.2 ≤ lift < 2` → inchangé ; `lift` indéfini → inchangé.

Tri de sortie (déterministe) : confiance décroissante, puis `support` décroissant,
puis `dimension` puis `value` alphabétiques.

---

## 4. Radar — score de tension (`computeTensionScore`)

> Spécifié au CDC §3.3. Marqué **expérimental** : le CDC rattache le Radar
> prédictif à la Vague 2 ; la formule est implémentée, testée et versionnée pour
> être prête, mais reste soumise à validation clinique avant activation en
> production. Référence : `src/radar.ts`.

Score journalier `0–100`, combinaison linéaire bornée, sur les 4 facteurs du CDC :

```
score = clamp( routineRuptures × 12
             + sensoryPoints   × 3      // Σ intensité des signaux HYPER du jour
             + sleepDeficit    × 8      // (5 − qualité du dernier sommeil du jour), 0..4
             + triggerHits     × 15,    // déclencheurs actifs (moyen/fort) présents ce jour
             0, 100 )
```

- `routineRuptures` : observations du jour avec `context.routine_break === true`.
- `sensoryPoints` : somme des intensités des signaux de direction `hyper` du jour.
- `sleepDeficit` : `5 − qualité`, où `qualité` = intensité de la **dernière**
  observation `kind = 'sleep'` du jour ; absente → déficit 0.
- `triggerHits` : nombre de déclencheurs de confiance `moyen`/`fort` dont la clé
  apparaît dans les facteurs du jour (observations **et** incidents).

**Bandes** (CDC §3.3) : `vert < 40`, `orange 40–70`, `rouge > 70`. Les facteurs à
contribution non nulle sont renvoyés triés (contribution décroissante) pour
affichage « en clair » à l'aidant (CDC §M3).

---

## Journal des versions

| Date | Version | Changement |
|---|---|---|
| 2026-07-11 | `twin-1.0.0` | Version initiale : profil sensoriel + déclencheurs (Vague 1). |
| 2026-07-11 | `radar-0.1.0-experimental` | Formule de tension initiale (préparée pour Vague 2). |
