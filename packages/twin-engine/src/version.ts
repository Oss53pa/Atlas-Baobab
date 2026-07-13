/**
 * Versions d'algorithme, tracees dans chaque TwinProfile (`algorithm_version`).
 * Regle CDC 8.2 : aucun de ces calculs ne passe jamais par un LLM.
 * Toute modification d'une formule DOIT incrementer la version correspondante
 * et etre documentee dans ALGORITHMS.md (avenant versionne, CDC 3.3).
 */

/** Moteur Jumeau v1 : profil sensoriel + detection de declencheurs (CDC Vague 1). */
export const TWIN_ALGO_VERSION = 'twin-1.0.0';

/**
 * Radar / score de tension. Formule specifiee au CDC 3.3 mais rattachee a la
 * Vague 2 ("pas encore de Radar predictif" en Vague 1). Implementee, testee et
 * versionnee separement pour etre prete, marquee experimentale tant que non
 * validee cliniquement.
 */
export const RADAR_ALGO_VERSION = 'radar-0.1.0-experimental';
