import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.js';

/**
 * Session Supabase (CDC §2.2 auth). L'app reste local-first : sans compte, tout
 * fonctionne ; le compte ne sert qu'à la sync chiffrée optionnelle et au
 * multi-aidants (§2.1, §10). Aucune donnée enfant ne part sans compte connecté.
 */
export function useAuth(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, loading };
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

/** Envoie un email de réinitialisation du mot de passe (l'utilisateur le change
 * lui-même). Aucun mot de passe n'est manipulé par l'app. */
export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
}
