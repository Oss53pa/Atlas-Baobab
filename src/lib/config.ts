/**
 * Configuration runtime. La clé "publishable" (anon) est publique par design :
 * l'accès réel est verrouillé par les policies RLS `ab_*` (CDC §7.1). Elle peut
 * donc être embarquée côté client. Surchargeable via variables d'env Vite.
 */

const env = import.meta.env as Record<string, string | undefined>;

// Projet Supabase DÉDIÉ Atlas Studio — Applications Mobiles (easoqoswtmvtkdwwkqtc).
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'https://easoqoswtmvtkdwwkqtc.supabase.co';

export const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_uU7x6fV-hcWbuaSJFU_a7Q_yedbUvLM';

/** Préfixe des tables Atlas Baobab dans la base partagée Atlas Studio. */
export const TABLE_PREFIX = 'ab_';

/** Version des règles/algorithmes affichée dans l'UI (traçabilité). */
export const APP_VERSION = '0.1.0';
