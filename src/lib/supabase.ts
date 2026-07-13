/**
 * Client Supabase (BaaS-only, CDC §2.2). Le JWT utilisateur est utilisé, jamais
 * la service key côté client (CDC §7.1). La sync est OPTIONNELLE : l'app est
 * local-first et fonctionne intégralement hors ligne (CDC §2.1, §10). Ce client
 * sert la sync montante en arrière-plan et le temps réel multi-aidants quand un
 * compte est connecté.
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
