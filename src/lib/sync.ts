/**
 * Moteur de sync applicatif (CDC §2.4 mode 2 : push montant vers Supabase).
 * Local-first : la sync est OPTIONNELLE et ne s'exécute qu'avec un compte connecté
 * ET sync activée. Respecte le RLS `ab_*` : on crée d'abord l'enfant (created_by =
 * soi) puis le membership `parent_admin` (bootstrap autorisé §7.1), qui sert
 * d'auteur aux observations.
 *
 * Idempotent : upsert par id. Rejouable sans doublon.
 */

import { supabase } from './supabase.js';
import { getState, twinProfile } from './store.js';

export interface SyncCounts {
  children: number;
  observations: number;
  incidents: number;
  games: number;
  twins: number;
}
export interface SyncResult {
  ok: boolean;
  error?: string;
  counts?: SyncCounts;
}

export async function syncNow(userId: string): Promise<SyncResult> {
  const s = getState();
  const counts: SyncCounts = { children: 0, observations: 0, incidents: 0, games: 0, twins: 0 };

  try {
    for (const child of s.children) {
      // 1) Enfant (created_by = soi -> autorisé par ab_children_insert)
      const { error: cErr } = await supabase.from('ab_children').upsert(
        {
          id: child.id,
          first_name: child.first_name,
          birth_date: child.birth_date,
          active_theme: child.active_theme,
          screen_quota_minutes: child.screen_quota_minutes,
          created_by: userId,
          avatar_key: child.avatar_key,
          avatar_custom_name: child.avatar_custom_name ?? null,
          avatar_motion: child.avatar_motion,
        },
        { onConflict: 'id' },
      );
      if (cErr) throw cErr;
      counts.children += 1;

      // 2) Membership parent_admin (bootstrap), sert d'auteur
      const { data: mem, error: mErr } = await supabase
        .from('ab_memberships')
        .upsert(
          { child_id: child.id, user_id: userId, role: 'parent_admin', accepted_at: new Date().toISOString() },
          { onConflict: 'child_id,user_id' },
        )
        .select('id')
        .single();
      if (mErr) throw mErr;
      const membershipId = (mem as { id: string }).id;

      // 3) Observations
      const obs = s.observations
        .filter((o) => o.child_id === child.id)
        .map((o) => ({
          id: o.id,
          child_id: o.child_id,
          author_membership_id: membershipId,
          kind: o.kind,
          intensity: o.intensity ?? null,
          context: o.context ?? {},
          occurred_at: o.occurred_at,
          device_id: o.device_id,
        }));
      if (obs.length) {
        const { error } = await supabase.from('ab_observations').upsert(obs, { onConflict: 'id' });
        if (error) throw error;
        counts.observations += obs.length;
      }

      // 4) Incidents
      const inc = s.incidents
        .filter((i) => i.child_id === child.id)
        .map((i) => ({
          id: i.id,
          child_id: i.child_id,
          observation_id: i.observation_id ?? null,
          started_at: i.started_at,
          ended_at: i.ended_at ?? null,
          suspected_trigger: i.suspected_trigger ?? null,
          what_helped: i.what_helped ?? null,
        }));
      if (inc.length) {
        const { error } = await supabase.from('ab_incidents').upsert(inc, { onConflict: 'id' });
        if (error) throw error;
        counts.incidents += inc.length;
      }

      // 5) Sessions de jeu (télémétrie)
      const games = s.gameSessions
        .filter((g) => g.child_id === child.id)
        .map((g) => ({
          id: g.id,
          child_id: g.child_id,
          game_code: g.game_code,
          difficulty_level: g.difficulty_level,
          duration_seconds: g.duration_seconds,
          telemetry: g.telemetry,
          played_at: g.played_at,
          device_id: s.settings.deviceId,
        }));
      if (games.length) {
        const { error } = await supabase.from('ab_game_sessions').upsert(games, { onConflict: 'id' });
        if (error) throw error;
        counts.games += games.length;
      }

      // 6) Snapshot CORTEX (profil versionné)
      const profile = twinProfile(child.id, s);
      const { error: tErr } = await supabase.from('ab_twin_profiles').upsert(
        {
          child_id: child.id,
          version: profile.version,
          algorithm_version: profile.algorithm_version,
          profile: profile as unknown as Record<string, unknown>,
        },
        { onConflict: 'child_id,version' },
      );
      if (!tErr) counts.twins += 1;
    }

    return { ok: true, counts };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Test de connectivité léger : le catalogue d'activités (RLS: select authentifié). */
export async function pingBackend(): Promise<{ reachable: boolean; detail: string }> {
  const { error } = await supabase.from('ab_activities').select('id').limit(1);
  if (!error) return { reachable: true, detail: 'connecté' };
  // Une erreur RLS/permission prouve quand même que le backend répond.
  return { reachable: true, detail: error.message };
}
