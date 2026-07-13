import { useMemo, useState } from 'react';
import { moderateContent } from '@atlas-baobab/moderation';
import { ArrowLeft, Flag, Heart, Plus, Users, Volume2, Dices, Check, HeartHandshake, VenetianMask, Ban, MessageSquareOff } from 'lucide-react';
import { actions, useAppState } from '../lib/store.js';
import { FORUMS, CHARTER_VERSION, makePseudonym } from '../lib/forums.js';
import { relativeDay } from '../lib/format.js';
import { speak } from '../lib/tts.js';

type View = { k: 'forums' } | { k: 'threads'; forumId: string } | { k: 'thread'; threadId: string };

export function Forum() {
  const state = useAppState();
  const [view, setView] = useState<View>({ k: 'forums' });
  const [reported, setReported] = useState<Set<string>>(new Set());

  if (!state.settings.charterAccepted) return <Charter />;

  if (view.k === 'threads') {
    return <ThreadList forumId={view.forumId} onBack={() => setView({ k: 'forums' })} onOpen={(id) => setView({ k: 'thread', threadId: id })} />;
  }
  if (view.k === 'thread') {
    return <ThreadView threadId={view.threadId} onBack={(fid) => setView({ k: 'threads', forumId: fid })} reported={reported} onReport={(id) => setReported((s) => new Set(s).add(id))} />;
  }

  // Liste des forums
  return (
    <div className="reveal">
      <h2 style={{ fontSize: 22, margin: '4px 4px 4px' }}>Communauté</h2>
      <p className="muted" style={{ fontSize: 13, margin: '0 4px 14px' }}>
        Entre parents. Gratuit, à vie. Vous publiez en tant que <b>{state.settings.pseudonym}</b>.
      </p>
      {FORUMS.map((f) => {
        const count = state.forumThreads.filter((t) => t.forum_id === f.id && (t.status === 'published' || t.own)).length;
        return (
          <div className="card" key={f.id} style={{ padding: 14, marginBottom: 10 }} role="button" onClick={() => setView({ k: 'threads', forumId: f.id })}>
            <div className="row between">
              <div className="row" style={{ gap: 12 }}>
                <div className="ico">{f.emoji}</div>
                <div>
                  <b style={{ fontSize: 15 }}>{f.title}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{count} discussion{count > 1 ? 's' : ''}{f.age_band ? ` · ${f.age_band} ans` : ''}</div>
                </div>
              </div>
              <span className="muted">→</span>
            </div>
          </div>
        );
      })}
      <div className="notice" style={{ marginTop: 8 }}>
        <Users size={13} style={{ verticalAlign: -2 }} /> Pas de messagerie privée. Pour un accompagnement, demandez le <b>parrainage encadré</b> (parent expérimenté, sur volontariat, visible de la modération).
      </div>
    </div>
  );
}

const RULES: { Icon: typeof Heart; red?: boolean; t: string; d: string }[] = [
  { Icon: HeartHandshake, t: 'Respect et bienveillance', d: 'On partage son expérience, on ne juge jamais celle des autres. Chaque enfant, chaque famille est différente.' },
  { Icon: VenetianMask, t: 'Ici, vous êtes votre pseudonyme', d: 'Aucune photo d’enfant, aucun prénom d’enfant, aucun numéro — s’ils apparaissent, ils sont masqués automatiquement, pour votre sécurité.' },
  { Icon: Ban, red: true, t: 'Zéro « remède miracle »', d: 'Aucun traitement, cure ou produit « qui guérit » — ces messages sont mis de côté avant publication et relus par un humain. Toujours.' },
  { Icon: MessageSquareOff, t: 'Pas de messages privés', d: 'Pour être accompagnée de plus près : le parrainage encadré, visible de la modération. C’est ce qui garde cet endroit sûr.' },
  { Icon: Flag, t: 'Un signalement suffit', d: 'Un doute sur un message ? Un tap sur ⚑ et un modérateur regarde sous 24 h. Les modérateurs sont des parents et des membres d’associations.' },
];

function Charter() {
  const state = useAppState();
  const [pseudo, setPseudo] = useState(state.settings.pseudonym);
  const [consent, setConsent] = useState(state.settings.forumInsightsConsent);

  const peek = useMemo(() => FORUMS.slice(0, 4).map((f) => ({
    emoji: f.emoji, title: f.title,
    n: state.forumThreads.filter((t) => t.forum_id === f.id && (t.status === 'published' || t.own)).length,
  })), [state.forumThreads]);

  const charterSpeech = 'Cinq règles. Un : respect et bienveillance. Deux : ici, vous êtes votre pseudonyme. Trois : zéro remède miracle. Quatre : pas de messages privés. Cinq : un signalement suffit.';

  return (
    <div className="reveal onb">
      <aside className="onb-aside">
        <div className="fm-hero">
          <div className="fm-hero-e">🤝</div>
          <h2 style={{ fontSize: 22 }}>Vous n’êtes pas seule.</h2>
          <p className="muted" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>Ici, des parents qui vivent la même chose que vous s’entraident, sans jugement. Avant d’entrer, 5 règles — elles protègent tout le monde, surtout nos enfants.</p>
        </div>

        <div className="fm-peek">
          {peek.map((p) => <span key={p.title}>{p.emoji} {p.title.split('(')[0].trim()} · <b>{p.n}</b></span>)}
        </div>

        <p className="onb-note">
          <Users size={15} /> Modération humaine, issue des associations partenaires · réponse sous 24 h
        </p>
      </aside>

      <div className="onb-main">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center' }}>Les 5 règles de la maison
            <button className="rp-aud" style={{ marginLeft: 'auto', width: 'auto', margin: 0, padding: '6px 12px', fontSize: 11.5 }} onClick={() => speak(charterSpeech)}><Volume2 size={13} /> Écouter</button>
          </div>
          {RULES.map((r) => (
            <div className={`fm-rule ${r.red ? 'red' : ''}`} key={r.t}>
              <span className="fm-rule-ic"><r.Icon size={18} /></span>
              <div><b className="fm-rule-t">{r.t}</b><div className="fm-rule-d">{r.d}</div></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Votre nom ici</div>
          <div className="row" style={{ gap: 8 }}>
            <input className="field" value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={20} style={{ fontWeight: 600 }} />
            <button className="btn" onClick={() => setPseudo(makePseudonym(Math.floor(Math.random() * 1e6)))} aria-label="Un autre pseudo"><Dices size={18} /></button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>🔒 <b style={{ color: 'var(--radar-green)' }}>Ni les membres, ni les modérateurs</b> ne peuvent relier ce pseudonyme à votre compte. Vous pouvez tout dire.</p>
        </div>

        <button className="fm-consent" onClick={() => setConsent((c) => !c)}>
          <span className={`fm-cb ${consent ? 'on' : ''}`}>{consent && <Check size={16} />}</span>
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>J’accepte que les <b>grandes tendances des sujets</b> (jamais mes messages, jamais mon pseudo) aident la recherche sur l’autisme en Afrique.<small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 3 }}>Entièrement refusable — vous entrez quoi que vous cochiez.</small></span>
        </button>

        <button className="btn btn-accent btn-block btn-lg" style={{ marginTop: 12 }}
          onClick={() => { actions.setPseudonym(pseudo.trim() || state.settings.pseudonym); actions.setForumInsightsConsent(consent); actions.acceptCharter(); }}>
          🌳 J’accepte les 5 règles — j’entre
        </button>
        <p className="muted mono" style={{ fontSize: 10.5, textAlign: 'center', marginTop: 12 }}>{CHARTER_VERSION} · relisible à tout moment</p>
      </div>
    </div>
  );
}

function ThreadList({ forumId, onBack, onOpen }: { forumId: string; onBack: () => void; onOpen: (id: string) => void }) {
  const state = useAppState();
  const forum = FORUMS.find((f) => f.id === forumId)!;
  const [composing, setComposing] = useState(false);
  const threads = state.forumThreads
    .filter((t) => t.forum_id === forumId && (t.status === 'published' || t.own))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="reveal">
      <div className="row between" style={{ margin: '4px 4px 12px' }}>
        <button className="btn" style={{ padding: '8px 12px' }} onClick={onBack}><ArrowLeft size={18} /></button>
        <b>{forum.emoji} {forum.title}</b>
        <button className="btn btn-primary" style={{ padding: '8px 12px' }} onClick={() => setComposing((v) => !v)}><Plus size={18} /></button>
      </div>

      {composing && <Composer kind="thread" forumId={forumId} onDone={() => setComposing(false)} />}

      {threads.map((t) => (
        <div className="card" key={t.id} style={{ padding: 14, marginBottom: 10, opacity: t.status === 'quarantined' ? 0.7 : 1 }} role="button" onClick={() => t.status !== 'quarantined' && onOpen(t.id)}>
          <div className="row between">
            <b style={{ fontSize: 15 }}>{t.title}</b>
            {t.status === 'quarantined' && <span className="badge" style={{ background: 'var(--radar-orange)', color: '#fff' }}>en relecture</span>}
          </div>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>{truncate(t.body, 120)}</p>
          <div className="row between" style={{ fontSize: 12 }}>
            <span className="muted">{t.pseudonym} · {relativeDay(t.created_at)}</span>
            <span className="chip"><Heart size={12} /> {t.helped_count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadView({ threadId, onBack, reported, onReport }: { threadId: string; onBack: (forumId: string) => void; reported: Set<string>; onReport: (id: string) => void }) {
  const state = useAppState();
  const thread = state.forumThreads.find((t) => t.id === threadId);
  if (!thread) return <div className="card">Discussion introuvable.</div>;
  const posts = state.forumPosts
    .filter((p) => p.thread_id === threadId && (p.status === 'published' || p.own))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="reveal">
      <button className="btn" style={{ padding: '8px 12px', marginBottom: 12 }} onClick={() => onBack(thread.forum_id)}><ArrowLeft size={18} /> Retour</button>

      <div className="card">
        <h3 style={{ fontSize: 17 }}>{thread.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: '10px 0' }}>{thread.body}</p>
        <div className="row between" style={{ fontSize: 12 }}>
          <span className="muted">{thread.pseudonym} · {relativeDay(thread.created_at)}</span>
          <div className="row" style={{ gap: 8 }}>
            <HelpedBtn count={thread.helped_count} onClick={() => actions.markThreadHelped(thread.id)} />
            <ReportBtn id={thread.id} reported={reported} onReport={onReport} />
          </div>
        </div>
      </div>

      <div className="section-title">Réponses</div>
      {posts.map((p) => (
        <div className="card" key={p.id} style={{ padding: 14, marginBottom: 10, opacity: p.status === 'quarantined' ? 0.7 : 1 }}>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{p.body}</p>
          {p.status === 'quarantined' && <span className="badge" style={{ background: 'var(--radar-orange)', color: '#fff' }}>en relecture</span>}
          <div className="row between" style={{ fontSize: 12, marginTop: 8 }}>
            <span className="muted">{p.pseudonym} · {relativeDay(p.created_at)}</span>
            <div className="row" style={{ gap: 8 }}>
              <HelpedBtn count={p.helped_count} onClick={() => actions.markPostHelped(p.id)} />
              <ReportBtn id={p.id} reported={reported} onReport={onReport} />
            </div>
          </div>
        </div>
      ))}

      <Composer kind="reply" threadId={threadId} onDone={() => undefined} />
    </div>
  );
}

function Composer({ kind, forumId, threadId, onDone }: { kind: 'thread' | 'reply'; forumId?: string; threadId?: string; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [anon, setAnon] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const childNames = useAppState().children.map((c) => c.first_name);

  // Aperçu de modération EN DIRECT (pré-publication, §B4 + M02 §3.1 : le prénom de
  // l'enfant est masqué localement, AVANT tout envoi, et l'aperçu le montre).
  const preview = useMemo(() => (body.trim() ? moderateContent(body, { childNames }) : null), [body, childNames]);
  const nameMasked = preview?.reasons.includes('pii:child_name') ?? false;

  function submit() {
    if (kind === 'thread') {
      if (!title.trim() || !body.trim() || !forumId) return;
      const r = actions.createThread(forumId, title, body, anon);
      setFlash(r.status === 'quarantined' ? 'Votre message part en relecture (contenu à vérifier). Il n’est pas encore public.' : 'Publié. Merci du partage.');
      setTitle(''); setBody('');
      setTimeout(onDone, 1400);
    } else {
      if (!body.trim() || !threadId) return;
      const r = actions.replyToThread(threadId, body);
      setFlash(r.status === 'quarantined' ? 'Votre réponse part en relecture. Elle n’est pas encore publique.' : 'Réponse publiée.');
      setBody('');
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="section-title" style={{ margin: '0 0 10px' }}>{kind === 'thread' ? 'Nouvelle discussion' : 'Répondre'}</div>
      {kind === 'thread' && <input className="field" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} style={{ marginBottom: 8 }} />}
      <textarea className="field" placeholder="Partagez votre expérience…" value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ resize: 'vertical' }} />

      {nameMasked && (
        <div className="notice" style={{ marginTop: 8, background: 'color-mix(in srgb, var(--radar-green) 10%, var(--surface))', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          🔒 <span>Nous avons masqué le prénom de votre enfant — c’est notre règle, pour lui. Rien ne quitte votre téléphone sans ce masquage.</span>
        </div>
      )}
      {preview && (preview.status === 'quarantined' || preview.reasons.some((r) => r !== 'pii:child_name')) && (
        <div className="notice" style={{ marginTop: 8, background: preview.status === 'quarantined' ? 'color-mix(in srgb, var(--radar-red) 10%, var(--surface))' : undefined }}>
          {preview.status === 'quarantined'
            ? '⚠ Ce message sera mis en relecture (contenu de type « cure/traitement » non autorisé).'
            : 'ℹ Aperçu : les données personnelles seront masquées → ' + truncate(preview.masked, 90)}
        </div>
      )}

      {kind === 'thread' && (
        <label className="row" style={{ gap: 8, marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Poser en anonyme
        </label>
      )}

      {flash && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{flash}</p>}
      <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={submit} disabled={!body.trim() || (kind === 'thread' && !title.trim())}>
        Publier
      </button>
    </div>
  );
}

function HelpedBtn({ count, onClick }: { count: number; onClick: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <button className="chip" onClick={() => { if (!done) { onClick(); setDone(true); } }}
      style={done ? { background: 'var(--primary)', color: 'var(--primary-ink)', borderColor: 'transparent' } : undefined}>
      <Heart size={12} /> {count + (done ? 1 : 0)} ça m’a aidé
    </button>
  );
}

function ReportBtn({ id, reported, onReport }: { id: string; reported: Set<string>; onReport: (id: string) => void }) {
  const isReported = reported.has(id);
  return (
    <button className="chip" onClick={() => !isReported && onReport(id)} aria-label="Signaler"
      style={isReported ? { color: 'var(--radar-red)' } : undefined}>
      <Flag size={12} /> {isReported ? 'Signalé' : 'Signaler'}
    </button>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
