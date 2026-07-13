import { useMemo, useState } from 'react';
import { GraduationCap, Volume2, Check, ChevronRight, Heart, Search, ArrowLeft, ShieldCheck } from 'lucide-react';
import { activeChild, actions, useAppState } from '../lib/store.js';
import {
  PARCOURS, LESSONS, lessonOfDay, lessonById, isHardTime, helpsForChild, parcoursOf,
  HELP_BADGE_LABEL, type Lesson,
} from '../lib/coach.js';
import { speak } from '../lib/tts.js';
import { Tabs } from '../components/Tabs.js';
import type { View } from '../App.js';

const FB_CHOICES: { key: 'helped' | 'unsure' | 'not' | 'couldnt'; label: string }[] = [
  { key: 'helped', label: 'Ça a aidé' },
  { key: 'unsure', label: 'Pas sûr' },
  { key: 'not', label: 'Pas cette fois' },
  { key: 'couldnt', label: 'On n’a pas pu' },
];
const MOODS: { key: 'bien' | 'moyen' | 'dur'; label: string; msg: string }[] = [
  { key: 'bien', label: 'Bien', msg: 'Contente de le lire. Prenez soin de vous aussi.' },
  { key: 'moyen', label: 'Moyen', msg: 'Merci d’être honnête. La fiche « Souffler 5 minutes » est là si besoin.' },
  { key: 'dur', label: 'Dur', msg: 'Vous n’êtes pas seule. Des ressources sont là, quand vous voudrez.' },
];

export function Coach({ go }: { go: (v: View) => void }) {
  const state = useAppState();
  const child = activeChild(state);
  const [query, setQuery] = useState('');
  const [viewed, setViewed] = useState<Lesson | null>(null);
  const [tab, setTab] = useState<'today' | 'parcours'>('today');

  const today = new Date().toISOString().slice(0, 10);
  const dayPick = useMemo(() => (child ? lessonOfDay(child.id, state) : null), [child, state]);
  const helps = useMemo(() => (child ? helpsForChild(child.id, state) : []), [child, state]);

  if (!child || !dayPick) return null;
  const hard = isHardTime(child.id, state);
  const lesson = viewed ?? dayPick.lesson;
  const why = viewed ? null : dayPick.why;

  const triedToday = state.coachActions.some((a) => a.child_id === child.id && a.lesson_id === lesson.id && a.day === today);
  const pending = state.coachActions.find((a) => a.child_id === child.id && !a.feedback && a.day < today);
  const pendingLesson = pending ? lessonById(pending.lesson_id) : null;
  const moodToday = state.parentMoods.find((m) => m.at.slice(0, 10) === today);
  const explored = new Set(state.coachActions.filter((a) => a.child_id === child.id).map((a) => a.lesson_id)).size;

  const results = query.trim().length >= 2
    ? LESSONS.filter((l) => `${l.title} ${l.situation} ${l.triggerKeys.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="reveal co-wrap">
      <div className="co-head">
        <div>
          <p className="muted" style={{ fontSize: 14 }}>Un geste par jour, choisi pour {child.first_name} — jamais plus.</p>
        </div>
        <span className="pill-soft">{explored} leçon{explored > 1 ? 's' : ''} explorée{explored > 1 ? 's' : ''}</span>
      </div>

      {hard && (
        <div className="co-hard">
          <Heart size={18} />
          <span><b>Cette semaine semble rude. Une seule chose à la fois.</b> Le Coach se concentre sur le calme et sur vous ; les apprentissages attendront sans rien perdre.</span>
        </div>
      )}

      <Tabs tabs={[{ key: 'today', label: 'Aujourd’hui' }, { key: 'parcours', label: 'Les 8 parcours' }]} active={tab} onChange={setTab} />

      {tab === 'today' && <>
      {/* Retour d'hier */}
      {pendingLesson && (
        <div className="card co-retour">
          <div>
            <b style={{ fontSize: 15.5 }}>Hier : « {pendingLesson.aujourdhui} »</b>
            <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>Ça a donné quoi ? (une réponse suffit)</p>
          </div>
          <div className="co-fb">
            {FB_CHOICES.map((c) => (
              <button key={c.key} onClick={() => { actions.coachFeedback(pendingLesson.id, c.key); speak(c.key === 'helped' ? 'Merci, c’est noté.' : 'C’est noté.'); }}>{c.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="co-grid">
        {/* Leçon du jour */}
        <div className="card co-lesson">
          <div className="row between" style={{ alignItems: 'center' }}>
            <span className={`co-tag ${hard && lesson.tempsDifficile ? 'hard' : ''}`}>{viewed ? 'Leçon' : 'Leçon du jour'} · {lesson.minutes} min</span>
            <button className="co-listen" onClick={() => speak(`${lesson.title}. ${lesson.situation} ${lesson.gestes.join(' ')}`)}><Volume2 size={14} /> Écouter</button>
          </div>
          {viewed && <button className="co-back" onClick={() => setViewed(null)}><ArrowLeft size={13} /> Revenir à la leçon du jour</button>}
          <h3 className="co-title">{lesson.title}</h3>
          {why && <p className="co-why"><Heart size={13} /> {why}</p>}

          <details className="co-bloc" open><summary><span className="co-n">1</span> La situation</summary><div className="co-bd">{lesson.situation}</div></details>
          <details className="co-bloc"><summary><span className="co-n">2</span> Ce qui se passe pour lui</summary><div className="co-bd">{lesson.pourLui}</div></details>
          <details className="co-bloc"><summary><span className="co-n">3</span> Les 3 gestes</summary><div className="co-bd"><ol className="co-gestes">{lesson.gestes.map((g, i) => <li key={i}>{g}</li>)}</ol></div></details>
          <details className="co-bloc"><summary><span className="co-n">4</span> Essayer aujourd’hui</summary><div className="co-bd">Ce soir : uniquement {lesson.aujourdhui}. Une seule chose à la fois.</div></details>
          <details className="co-bloc"><summary><span className="co-n">5</span> Si ça n’a pas marché</summary><div className="co-bd">{lesson.siRate}</div></details>

          {triedToday ? (
            <div className="co-tried"><Check size={16} /> C’est parti pour aujourd’hui. On vous demandera demain si ça a aidé — une seule fois.</div>
          ) : (
            <button className="co-action" onClick={() => { actions.coachTry(lesson.id); speak('C’est noté pour aujourd’hui.'); }}>
              <span className="co-check"><Check size={15} /></span> Essayer aujourd’hui : {lesson.aujourdhui}
            </button>
          )}
          <p className="notice" style={{ marginTop: 12 }}><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Contenu relu et signé par un clinicien.</p>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          {/* Ce qui aide */}
          <div className="card">
            <h3 style={{ fontSize: 17 }}>Ce qui aide {child.first_name} 🍃</h3>
            <p className="muted" style={{ fontSize: 13 }}>Le journal, vos activités, le Coach — une seule vérité.</p>
            {helps.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>À découvrir au fil des moments notés.</p>
            ) : (
              <div className="co-helps">
                {helps.map((h) => (
                  <span className="co-help" key={h.label}>{h.label} <span className={`co-badge ${h.badge}`}>{HELP_BADGE_LABEL[h.badge]}</span></span>
                ))}
              </div>
            )}
            <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => go('jumeau')}>Voir « ce qui l’apaise » <ChevronRight size={14} /></button>
          </div>

          {/* Et vous ? */}
          <div className="card co-vous">
            <span className="pill-soft">ET VOUS ?</span>
            <h3 style={{ fontSize: 17, marginTop: 10 }}>Comment allez-vous, cette semaine ?</h3>
            <p className="muted" style={{ fontSize: 13 }}>Vos réponses restent ici — jamais dans les données de {child.first_name}, jamais dans un rapport.</p>
            {moodToday ? (
              <p className="co-moodmsg">{MOODS.find((m) => m.key === moodToday.level)?.msg}</p>
            ) : (
              <div className="co-fb" style={{ marginTop: 12 }}>
                {MOODS.map((m) => <button key={m.key} onClick={() => { actions.logParentMood(m.key); speak(m.msg); }}>{m.label}</button>)}
              </div>
            )}
          </div>
        </div>
      </div>
      </>}

      {tab === 'parcours' && <>
      {/* Les 8 parcours */}
      <p className="muted" style={{ fontSize: 13.5 }}>Naviguez librement — la sélection du jour n’est qu’un raccourci.</p>
      <div className="co-search">
        <Search size={16} />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cherchez une situation : « il ne dort pas », « transitions », « refus »…" aria-label="Chercher une leçon" />
      </div>

      {results.length > 0 ? (
        <div className="co-results">
          {results.map((l) => (
            <button className="co-result" key={l.id} onClick={() => { setViewed(l); setQuery(''); setTab('today'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <span className="co-result-t">{l.title}</span>
              <span className="co-result-p">{parcoursOf(l.parcours).label} <ChevronRight size={13} /></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="co-parcours">
          {PARCOURS.map((p) => {
            const done = new Set(state.coachActions.filter((a) => a.child_id === child.id && lessonById(a.lesson_id)?.parcours === p.key).map((a) => a.lesson_id)).size;
            const first = LESSONS.find((l) => l.parcours === p.key);
            return (
              <button className="co-parc" key={p.key} onClick={() => { if (first) { setViewed(first); setTab('today'); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}>
                <b>{p.label}</b>
                <span className="co-bar"><i style={{ width: `${(done / p.total) * 100}%` }} /></span>
                <span className="co-parc-n">{done} / {p.total}</span>
              </button>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}
