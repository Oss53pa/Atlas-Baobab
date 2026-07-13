/** @atlas-baobab/moderation — filtre pré-publication déterministe (CDC C01 §B4). */
export { moderateContent, normalize, type ModerationResult, type ModerationStatus } from './filter.js';
export { LEXICON_VERSION, DANGER_RULES, PII_RULES, type DangerCategory } from './lexicons.js';
