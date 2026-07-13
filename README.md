# Atlas Baobab

> Écosystème d'accompagnement des enfants autistes et de leurs familles — offline-first, Android-first, FCFA, Afrique francophone. Conforme au **CDC v1.0** (11 juil. 2026).

PWA local-first réunissant le **cockpit parent** et **l'instrument enfant** sur un même appareil (réalité du terrain : appareil bas de gamme partagé, §2.3/§14), branchée sur le moteur **Jumeau déterministe** et un backend **Supabase** (schéma `ab_*` déployé).

## Invariants non négociables (CDC §1.3)

1. **Aucun LLM ne calcule.** Scores, seuils, déclencheurs, prédictions → moteur TypeScript déterministe versionné (`packages/twin-engine`). Voir [`ALGORITHMS.md`](ALGORITHMS.md).
2. **CAA sanctuarisée** : jamais quotée, jamais bloquée, offline, gratuite.
3. **Aucun fond sombre**, nulle part (§9). 5 thèmes enfant clairs + thème parent.
4. **Montants** : entiers FCFA, jamais de float.
5. **Local-first** : tout fonctionne hors ligne ; sync chiffrée optionnelle.
6. **Langage non pathologisant** : forces et besoins, jamais déficits.

## Structure (monorepo npm workspaces)

```
packages/
  twin-engine/   Moteur Jumeau déterministe : profil sensoriel, déclencheurs, Radar. 46 tests, >99% couv.
  sync/          Offline-first : HLC, fusion last-write-wins par champ, outbox. 18 tests.
  moderation/    Filtre pré-publication déterministe multilingue (fr/ivoirien/nouchi). 12 tests. CDC C01 §B4.
  ui/            Design system (§9) : tokens des 5 thèmes + thème parent, suggestion de thème.
src/             App PWA (React 18 + TS) : cockpit parent + instrument enfant.
supabase/
  migrations/    0001 schéma (§7), 0002 RLS (§6.1), 0003 hardening. Déployées sur le projet Atlas Studio.
ALGORITHMS.md    Formules versionnées du Jumeau.
```

## Modules livrés (Vague 1 + extraits)

| Code | Module | État |
|---|---|---|
| M1 | Porte d'Entrée (pré-dépistage 3 niveaux, offline, sans compte) | ✅ |
| M2 | Journal d'observation (saisie 3 taps) | ✅ |
| M3 | Radar (score de tension, guidance de crise personnalisée) | ✅ |
| — | Jumeau (profil sensoriel + déclencheurs, suggestion de thème) | ✅ |
| E1/E2 | Coquille sensorielle enfant + quotas (CAA exemptée) | ✅ |
| E3 | Jeu sonde « mémoire visuelle » (télémétrie → Jumeau) | ✅ |
| E4 | CAA (pictos contextuels, TTS fr, journal d'usage) | ✅ |
| E5 | Coin Calme (respiration guidée) | ✅ |
| — | CORTEX (ex-« Jumeau », avenant C02) + Avatars personnalisables | ✅ |
| M7+ | Forums parents (avenant C01 C-B, gratuit) — charte, modération multilingue live, parrainage | ✅ |
| — | Réglages (thèmes, quota, PIN, sync, abonnement FCFA) | ✅ |

## Démarrer

```bash
npm install          # installe et lie les workspaces
npm run dev          # PWA sur http://localhost:5178
npm run build        # build de production
npm test             # tests de tous les packages
```

Données de démonstration (~3 semaines d'historique pour l'enfant « Kessy ») générées au premier lancement pour rendre le Jumeau et le Radar immédiatement parlants. « Réinitialiser la démo » dans Réglages. PIN parent démo : `0000`.

## Backend Supabase

Base **partagée** Atlas Studio (`vgtmljfayiysuvrcmunt`). Toutes les tables Atlas Baobab sont préfixées **`ab_`** (convention maison, évite les collisions). 18 tables, RLS activée partout, helper `ab_has_child_access` (§7.1). Clé publishable/anon côté client (protégée par RLS). La sync réelle (outbox → Supabase, Realtime multi-aidants) est le prochain lot d'intégration ; l'app est pleinement fonctionnelle en local-first.

## Réserves / suite

- RLS déployée et passée au security advisor Supabase (0 alerte bloquante sur `ab_*`) mais la **recette sécurité §13.3** (accès croisé entre enfants réels, révocation < 1 min) reste à jouer avec des comptes de test.
- Contenus cliniques (items de bilan, questionnaire de repérage, guidances) = **placeholders** ; livrables du partenariat clinique (§8, §14), à valider et signer avant tout lancement public.
- Suite Vague 1/2 : câblage sync Supabase + Auth, M4 Coach (RAG PROPH3T), M5 Bilan 360, multi-aidants temps réel, packaging Capacitor Android + SQLCipher.

---
*Atlas Studio · toute évolution passe par avenant versionné.*
