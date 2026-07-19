import { useMemo, useState } from 'react';
import { CHILD_THEMES } from '@atlas-baobab/ui';
import { Minus, Plus, RotateCcw, Volume2, LogOut, RefreshCw, Cloud, UserPlus, Lock, Download, Smartphone, ChevronRight, Hourglass } from 'lucide-react';
import { activeChild, actions, growthPoints, twinProfile, useAppState } from '../lib/store.js';
import { formatXof } from '../lib/format.js';
import { useAuth, signInWithPassword, signUpWithPassword, signOut } from '../lib/auth.js';
import { syncNow } from '../lib/sync.js';
import {
  AVATARS, avatarDisplayName, computeGrowthStage, isValidAvatarName,
  type AvatarMotion,
} from '../lib/avatars.js';
import { speak } from '../lib/tts.js';
import { AvatarPic } from '../components/AvatarPic.js';
import { Tabs } from '../components/Tabs.js';
import { INTEREST_SUGGESTIONS, profileNeedsReview, SENSORY_PREF_LABEL } from '../lib/childProfile.js';
import type { CommunicationLevel, SensoryPref, SupportLevel } from '../lib/types.js';

const COMM_LABEL: Record<CommunicationLevel, string> = {
  verbal: 'Verbal fluide', verbal_emergent: 'Verbal émergent',
  non_verbal_aac: 'Non-verbal · utilise la CAA', non_verbal_no_aac: 'Non-verbal ou peu verbal',
};
const SUPPORT_LABEL: Record<SupportLevel, string> = {
  autonomous: 'Autonome', partial: 'Accompagnement partiel', full: 'Accompagnement complet',
};
const SENSORY_CHANNEL_LABEL = { auditory: 'Auditif', visual: 'Visuel', tactile: 'Tactile', vestibular: 'Vestibulaire' } as const;

const ROLE: Record<string, { role: string; e: string }> = {
  'Maman': { role: 'Parent', e: '👩🏾' }, 'Papa': { role: 'Parent', e: '👨🏾' },
  'Aidant·e': { role: 'Aidant·e', e: '🤝' }, 'Enseignant·e': { role: 'Enseignant·e', e: '🧑🏾‍🏫' },
  'Moi': { role: 'Parent admin', e: '👤' },
};

export function Reglages() {
  const state = useAppState();
  const child = activeChild(state);
  const [newName, setNewName] = useState('');
  const [newBirth, setNewBirth] = useState('');
  const [nameDraft, setNameDraft] = useState(child?.avatar_custom_name ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [sensitivityDraft, setSensitivityDraft] = useState('');
  const [tab, setTab] = useState<'enfant' | 'profil' | 'entourage' | 'compte'>('enfant');

  const team = useMemo(() => {
    if (!child) return [];
    const freq = new Map<string, { notes: number }>();
    for (const o of state.observations) { if (o.child_id !== child.id || !o.author) continue; const c = freq.get(o.author) ?? { notes: 0 }; c.notes += 1; freq.set(o.author, c); }
    return [...freq.entries()].sort((a, b) => b[1].notes - a[1].notes);
  }, [state.observations, child?.id]);

  const version = useMemo(() => (child ? twinProfile(child.id, state).version : 0), [child, state]);

  return (
    <div className="reveal">
      <h2 style={{ fontSize: 24, margin: '2px 2px 16px' }}>Réglages</h2>

      <Tabs
        tabs={[
          { key: 'enfant', label: 'L’enfant' },
          { key: 'profil', label: 'Son profil' },
          { key: 'entourage', label: 'Entourage' },
          { key: 'compte', label: 'Données & compte' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'enfant' && (
      <div className="set-cards">
          {/* Profil enfant */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Profil de l’enfant</div>
            {child && (
              <div className="set-kid">
                <span className="set-kid-av"><AvatarPic akey={child.avatar_key} stage={computeGrowthStage(growthPoints(child.id, state))} /></span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 17 }}>{child.first_name}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>{ageOf(child.birth_date)} · profil créé {createdAgo(child.created_at)} · portrait v{version}</div>
                </div>
              </div>
            )}
            {state.children.length > 1 && (
              <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
                {state.children.map((c) => (
                  <button key={c.id} className="chip" onClick={() => actions.setActiveChild(c.id)}
                    style={c.id === child?.id ? { background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'transparent' } : undefined}>{c.first_name}</button>
                ))}
              </div>
            )}
            <button className="set-addkid" onClick={() => setAddOpen((o) => !o)}><UserPlus size={15} /> Ajouter un enfant — chaque enfant a son monde, son arbre, son portrait</button>
            {addOpen && (
              <div className="stack" style={{ marginTop: 10 }}>
                <input className="field" placeholder="Prénom" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input className="field" type="date" value={newBirth} onChange={(e) => setNewBirth(e.target.value)} />
                <button className="btn btn-primary btn-block" disabled={!newName || !newBirth}
                  onClick={() => { actions.createChild({ first_name: newName, birth_date: newBirth }); setNewName(''); setNewBirth(''); setAddOpen(false); }}>Créer le profil</button>
              </div>
            )}
          </div>

          {child && (<>
            {/* Thème — aperçus réels (palette de l'app) */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Le monde de {child.first_name} · thème</div>
              <div className="set-themes">
                {CHILD_THEMES.map((t) => (
                  <button key={t.key} className={`set-th ${child.active_theme === t.key ? 'on' : ''}`} onClick={() => actions.updateChild(child.id, { active_theme: t.key })}>
                    <span className="set-prev" style={{ background: t.swatch.bg }}>
                      <span className="set-prev-dot" style={{ background: t.swatch.primary }} />
                      <span className="set-prev-dot2" style={{ background: t.swatch.secondary }} />
                      <span className="set-prev-bar" style={{ background: t.swatch.primary }} />
                    </span>
                    <span className="set-th-n">{t.label}</span>
                    <span className="set-th-d">{child.active_theme === t.key ? 'actif ✓' : t.badge}</span>
                  </button>
                ))}
              </div>
              <p className="notice" style={{ marginTop: 10 }}>Aucun fond sombre, jamais (CDC §9). CORTEX peut suggérer un thème plus doux selon la sensibilité de {child.first_name} — vous décidez.</p>
            </div>

            {/* Compagnon */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Son compagnon</div>
              <div className="set-avs">
                {AVATARS.map((a) => (
                  <button key={a.key} className={`set-av ${child.avatar_key === a.key ? 'on' : ''}`} onClick={() => actions.updateChild(child.id, { avatar_key: a.key })}>
                    <span className="set-av-e"><AvatarPic akey={a.key} stage={4} /></span><span className="set-av-n">{a.suggestedName}</span>
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <input className="field" placeholder={AVATARS.find((a) => a.key === child.avatar_key)?.suggestedName} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={12} />
                <button className="btn" onClick={() => nameDraft.trim() && speak(nameDraft.trim())} aria-label="Écouter"><Volume2 size={18} /></button>
                <button className="btn btn-primary" disabled={!isValidAvatarName(nameDraft)} onClick={() => { actions.updateChild(child.id, { avatar_custom_name: nameDraft.trim() }); speak(nameDraft.trim()); }}>OK</button>
              </div>
              <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>2 à 12 lettres. Écoutez-le : c’est la voix qui le portera chaque jour. {child.first_name} peut choisir avec vous.</p>
              <div className="set-seg">
                {(['slow', 'minimal', 'static'] as AvatarMotion[]).map((m) => (
                  <button key={m} className={child.avatar_motion === m ? 'on' : ''} onClick={() => actions.updateChild(child.id, { avatar_motion: m })}>
                    {m === 'slow' ? 'Mouvement doux' : m === 'minimal' ? 'Réduit' : 'Statique'}
                  </button>
                ))}
              </div>
              <p className="notice" style={{ marginTop: 10 }}>Le compagnon est heureux de voir {child.first_name}, jamais malheureux de ne pas le voir. Il ne réclame jamais, ne se fâche jamais, ne perd jamais rien.</p>
            </div>

            {/* Temps de jeu */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Temps de jeu quotidien</div>
              <div className="set-quota">
                <Hourglass size={26} color="var(--accent)" />
                <b className="mono" style={{ fontSize: 24 }}>{child.screen_quota_minutes} min</b>
                <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.3 }}>recommandé {ageYearsN(child.birth_date)} ans :<br />15 à 20 min</span>
                <div className="row" style={{ gap: 8, marginLeft: 'auto' }}>
                  <button className="set-step" onClick={() => actions.updateChild(child.id, { screen_quota_minutes: Math.max(5, child.screen_quota_minutes - 5) })}><Minus size={18} /></button>
                  <button className="set-step" onClick={() => actions.updateChild(child.id, { screen_quota_minutes: Math.min(60, child.screen_quota_minutes + 5) })}><Plus size={18} /></button>
                </div>
              </div>
              <div className="set-sanct">« Je parle » (sa voix) et « Ma bulle » ne sont <b>jamais</b> comptés ni bloqués. Jamais.</div>
              <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>Modification protégée par votre code PIN. Seuls les jeux sont concernés.</p>
            </div>
          </>)}
      </div>
      )}

      {tab === 'profil' && child && (
      <div className="set-cards">
            {/* Profil fonctionnel (CDC Kessy §3) : non-diagnostique, reconfigure l'app en douceur. */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Profil de {child.first_name}</div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Pas un diagnostic — juste de quoi adapter l’app à {child.first_name}. Modifiable à tout moment.</p>

              {profileNeedsReview(child) && (
                <p className="notice" style={{ marginBottom: 10 }}>Ça a peut-être changé — prenez un moment pour revoir ce profil.</p>
              )}

              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Communication</div>
              <div className="set-seg" style={{ flexWrap: 'wrap' }}>
                {(Object.keys(COMM_LABEL) as CommunicationLevel[]).map((v) => (
                  <button key={v} className={child.communication_level === v ? 'on' : ''}
                    onClick={() => actions.updateChild(child.id, { communication_level: v, profile_reviewed_at: new Date().toISOString() })}>
                    {COMM_LABEL[v]}
                  </button>
                ))}
              </div>
              {(child.communication_level === 'non_verbal_aac') && (
                <input className="field" style={{ marginTop: 8 }} placeholder="Quel système ? (PECS, pictogrammes, tablette…)"
                  value={child.aac_system ?? ''} onChange={(e) => actions.updateChild(child.id, { aac_system: e.target.value })} />
              )}

              <div className="muted" style={{ fontSize: 12, margin: '14px 0 4px' }}>Profil sensoriel par canal</div>
              {(Object.keys(SENSORY_CHANNEL_LABEL) as (keyof typeof SENSORY_CHANNEL_LABEL)[]).map((ch) => (
                <div key={ch} className="row" style={{ gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <span className="muted" style={{ fontSize: 12, width: 92, flex: '0 0 auto' }}>{SENSORY_CHANNEL_LABEL[ch]}</span>
                  <div className="set-seg" style={{ flex: 1 }}>
                    {(['hyper', 'hypo', 'neutral'] as SensoryPref[]).map((p) => (
                      <button key={p} className={child.sensory_input?.[ch] === p ? 'on' : ''}
                        onClick={() => actions.updateChild(child.id, {
                          sensory_input: { auditory: 'neutral', visual: 'neutral', tactile: 'neutral', vestibular: 'neutral', ...child.sensory_input, [ch]: p },
                          profile_reviewed_at: new Date().toISOString(),
                        })}>
                        {SENSORY_PREF_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="muted" style={{ fontSize: 12, margin: '14px 0 4px' }}>Niveau de soutien nécessaire</div>
              <div className="set-seg">
                {(Object.keys(SUPPORT_LABEL) as SupportLevel[]).map((v) => (
                  <button key={v} className={child.support_level === v ? 'on' : ''}
                    onClick={() => actions.updateChild(child.id, { support_level: v, profile_reviewed_at: new Date().toISOString() })}>
                    {SUPPORT_LABEL[v]}
                  </button>
                ))}
              </div>

              <div className="muted" style={{ fontSize: 12, margin: '14px 0 4px' }}>Intérêts spécifiques</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {INTEREST_SUGGESTIONS.map((i) => {
                  const on = child.interests?.includes(i) ?? false;
                  return (
                    <button key={i} className="chip" style={on ? { background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'transparent' } : undefined}
                      onClick={() => actions.updateChild(child.id, {
                        interests: on ? (child.interests ?? []).filter((x) => x !== i) : [...(child.interests ?? []), i],
                      })}>
                      {i}
                    </button>
                  );
                })}
              </div>

              <div className="muted" style={{ fontSize: 12, margin: '14px 0 4px' }}>Sensibilités à éviter (sons, couleurs, contact visuel imposé…)</div>
              <div className="row" style={{ gap: 8 }}>
                <input className="field" placeholder="Ex. sons aigus" value={sensitivityDraft} onChange={(e) => setSensitivityDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !sensitivityDraft.trim()) return;
                    actions.updateChild(child.id, { sensitivities_to_avoid: [...(child.sensitivities_to_avoid ?? []), sensitivityDraft.trim()] });
                    setSensitivityDraft('');
                  }} />
              </div>
              {!!child.sensitivities_to_avoid?.length && (
                <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                  {child.sensitivities_to_avoid.map((s, i) => (
                    <button key={i} className="chip" onClick={() => actions.updateChild(child.id, { sensitivities_to_avoid: child.sensitivities_to_avoid!.filter((_, j) => j !== i) })}>
                      {s} ✕
                    </button>
                  ))}
                </div>
              )}

              <div className="muted" style={{ fontSize: 12, margin: '14px 0 4px' }}>Pictogramme de la pause « je ne suis pas bien »</div>
              <input className="field" placeholder="Émoji déjà utilisé en famille (par défaut 🫧)" maxLength={4}
                value={child.exit_pictogram ?? ''} onChange={(e) => actions.updateChild(child.id, { exit_pictogram: e.target.value || null })} />

              <div className="set-drow" style={{ marginTop: 14 }}>
                <div className="grow"><b style={{ fontSize: 14 }}>Partage avec un professionnel référent</b><div className="muted" style={{ fontSize: 11.5 }}>jamais activé par défaut</div></div>
                <button className={`switch ${child.professional_sharing_enabled ? 'on' : ''}`}
                  onClick={() => actions.updateChild(child.id, { professional_sharing_enabled: !child.professional_sharing_enabled })} aria-label="Partage professionnel"><i /></button>
              </div>
            </div>
      </div>
      )}

      {tab === 'entourage' && child && (
      <div className="set-cards">
            {/* Aidants */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>L’équipe autour de {child.first_name}</div>
              {team.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Vous êtes seul·e à noter pour l’instant. Invitez les autres aidants : le regard croisé aide CORTEX.</p>
              ) : team.map(([author, s]) => {
                const r = ROLE[author] ?? { role: 'Aidant·e', e: '🤝' };
                return (
                  <div className="set-aid" key={author}>
                    <span className="set-aid-av">{r.e}</span>
                    <div className="grow" style={{ minWidth: 0 }}><b style={{ fontSize: 14 }}>{author}</b><div className="muted" style={{ fontSize: 11.5 }}>{s.notes} note{s.notes > 1 ? 's' : ''} au journal</div></div>
                    <span className="set-role">{r.role}</span>
                  </div>
                );
              })}
              <button className="set-invite"><UserPlus size={15} /> Inviter — lien + code à 6 chiffres, expire en 72 h</button>
            </div>
      </div>
      )}

      {tab === 'compte' && (
      <div className="set-cards">
          {/* Compte & données */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Vos données · votre contrôle</div>
            <div className="set-drow">
              <Lock size={17} color="var(--primary)" />
              <div className="grow"><b style={{ fontSize: 14 }}>Sauvegarde chiffrée + multi-aidants</b><div className="muted" style={{ fontSize: 11.5 }}>si le téléphone est perdu, l’historique l’est aussi. Recommandé.</div></div>
              <button className={`switch ${state.settings.syncEnabled ? 'on' : ''}`} onClick={() => actions.setSyncEnabled(!state.settings.syncEnabled)} aria-label="Sauvegarde"><i /></button>
            </div>
            <div className="set-drow"><Download size={17} color="var(--text-muted)" /><div className="grow"><b style={{ fontSize: 14 }}>Exporter le dossier</b><div className="muted" style={{ fontSize: 11.5 }}>PDF pour le médecin</div></div><button className="icon-btn" onClick={() => window.print()}><ChevronRight size={16} /></button></div>
            <div className="set-drow"><Smartphone size={17} color="var(--text-muted)" /><div className="grow"><b style={{ fontSize: 14 }}>Changer de téléphone</b><div className="muted" style={{ fontSize: 11.5 }}>tout transférer via un compte</div></div><ChevronRight size={16} color="var(--text-muted)" /></div>
          </div>

          {/* Compte */}
          <AccountSync />

          {/* Abonnement */}
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Abonnement</div>
            <div className="set-plan">
              <span style={{ fontSize: 26 }}>🌳</span>
              <div className="grow" style={{ minWidth: 0 }}><b style={{ fontSize: 16 }}>Famille</b><div className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>Portrait · Radar · Coach · RÉAGIR · Bilan 360 · programme · 2 aidants</div></div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}><b className="mono" style={{ fontSize: 18 }}>{formatXof(10000)}</b><div className="muted" style={{ fontSize: 11 }}>/mois</div></div>
            </div>
            <div className="set-drow" style={{ borderTop: '1px solid var(--border)', marginTop: 12 }}>
              <span style={{ fontSize: 22 }}>🌳</span>
              <div className="grow" style={{ minWidth: 0 }}><b style={{ fontSize: 14 }}>Famille+</b><div className="muted" style={{ fontSize: 11.5 }}>aidants illimités · voix et packs premium</div></div>
              <div style={{ textAlign: 'right', flex: '0 0 auto' }}><b className="mono" style={{ fontSize: 14 }}>{formatXof(20000)}</b><div className="muted" style={{ fontSize: 10.5 }}>/mois</div></div>
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
              {['Orange Money', 'MTN MoMo', 'Wave'].map((m) => <span key={m} className="chip" style={{ fontSize: 11.5 }}>{m}</span>)}
            </div>
            <div className="set-free">La CAA de base, le journal et le repérage restent <b>gratuits à vie</b>, abonné ou pas.</div>
          </div>

          <button className="btn btn-block" style={{ color: 'var(--radar-red)' }} onClick={() => { if (confirm('Réinitialiser les données de démonstration ?')) actions.resetAll(); }}>
            <RotateCcw size={16} /> Réinitialiser la démo
          </button>
      </div>
      )}
    </div>
  );
}

function ageYearsN(iso: string): number { const b = new Date(iso), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1; return Math.max(0, a); }
function ageOf(iso: string): string { return `${ageYearsN(iso)} ans`; }
function createdAgo(iso: string): string {
  const months = Math.floor((Date.now() - Date.parse(iso)) / (30 * 86400000));
  if (months >= 1) return `il y a ${months} mois`;
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  return days >= 7 ? `il y a ${Math.floor(days / 7)} semaine${days >= 14 ? 's' : ''}` : 'récemment';
}

function AccountSync() {
  const { session, loading } = useAuth();
  const state = useAppState();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function doSignIn() { setBusy(true); setMsg(null); const { error } = await signInWithPassword(email.trim(), pw); setMsg(error ? error.message : null); setBusy(false); }
  async function doSignUp() { setBusy(true); setMsg(null); const { error } = await signUpWithPassword(email.trim(), pw); setMsg(error ? error.message : 'Compte créé. Confirmez par email, puis connectez-vous.'); setBusy(false); }
  async function doSync() { if (!session) return; setBusy(true); setSyncMsg('Synchronisation…'); const r = await syncNow(session.user.id); setSyncMsg(r.ok && r.counts ? `Synchronisé : ${r.counts.observations} observations, ${r.counts.incidents} crises.` : `Erreur : ${r.error}`); setBusy(false); }

  if (loading) return <div className="card"><span className="muted">…</span></div>;
  if (!session) {
    return (
      <div className="card">
        <div className="section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Cloud size={16} color="var(--primary)" /> Compte (optionnel)</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Sans compte, tout fonctionne en local. Le compte active la sauvegarde chiffrée et le multi-aidants.</p>
        <div className="stack">
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className="field" type="password" placeholder="Mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        </div>
        {msg && <p style={{ fontSize: 12.5, marginTop: 8, color: 'var(--radar-red)' }}>{msg}</p>}
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn btn-primary grow" disabled={busy || !email || !pw} onClick={doSignIn}>Se connecter</button>
          <button className="btn grow" disabled={busy || !email || !pw} onClick={doSignUp}>Créer un compte</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="row between">
        <div className="grow"><b style={{ fontSize: 14 }}>Connecté</b><div className="muted" style={{ fontSize: 12 }}>{session.user.email}</div></div>
        <button className="btn" style={{ padding: 8 }} onClick={() => signOut()} aria-label="Déconnexion"><LogOut size={16} /></button>
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={busy || !state.settings.syncEnabled} onClick={doSync}><RefreshCw size={16} /> Synchroniser maintenant</button>
      {syncMsg && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{syncMsg}</p>}
    </div>
  );
}
