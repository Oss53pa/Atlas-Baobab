import { useEffect, type ReactNode } from 'react';
import {
  ArrowUpRight, ArrowRight, ShieldCheck, WifiOff, Wallet, Users, Lock, BadgeCheck,
  HeartPulse, GraduationCap, Compass, Sparkles,
} from 'lucide-react';
import { AVATARS, avatarGlyph } from '../lib/avatars.js';
import { KIND_GLYPH, KIND_TINT } from '../components/glyphs.js';
import type { CSSProperties } from 'react';

/** Apparition des cartes au défilement + parallaxe léger du visuel héro.
 * Respecte « réduire les animations ». */
function useLandingMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const els = Array.from(document.querySelectorAll(
      '.soft-card, .step, .feat, .price-card, .badge-item, .compagnon, .forces-band, .founder',
    ));
    els.forEach((e) => e.classList.add('reveal-on-scroll'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));

    const visual = document.querySelector<HTMLElement>('.lp-hero-visual');
    const scrollY = () => (document.scrollingElement?.scrollTop ?? 0) || window.scrollY || 0;
    const onScroll = () => {
      if (visual) visual.style.transform = `translateY(${Math.min(scrollY() * 0.08, 44)}px)`;
    };
    // capture:true attrape le défilement quel que soit l'élément qui scrolle
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    onScroll();
    return () => { io.disconnect(); document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions); };
  }, []);
}

/**
 * Landing commerciale, pensée par et pour des parents d'enfants autistes.
 * Tendre, premium, un peu ludique, pleine d'espoir. Tout en clair (CDC §9).
 */
export function Landing({ onEnter, onLogin, onScreening }: { onEnter: () => void; onLogin: () => void; onScreening: () => void }) {
  useLandingMotion();
  return (
    <div className="lp reveal">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-in">
          <div className="lp-logo">
            <span className="avatar-badge" style={{ width: 38, height: 38, background: '#f4ecdd' }}>
              <img className="logo-anim" src="/baobab.png" width={30} height={30} alt="" style={{ filter: 'brightness(0.32) saturate(1.4)' }} />
            </span>
            <span style={{ fontFamily: 'var(--font-brand)', fontSize: 26, color: '#ef9f27' }}>Atlas Baobab</span>
          </div>
          <div className="lp-nav-links">
            <a href="#chemin">Notre approche</a>
            <a href="#outils">Les outils</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#ethique">Confiance</a>
          </div>
          <div className="lp-nav-cta">
            <button className="btn btn-ghost" onClick={onLogin}>Se connecter</button>
            <button className="btn btn-accent" onClick={onEnter}>Essayer, c’est gratuit <ArrowUpRight size={16} /></button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="lp-wrap">
        <section className="lp-hero">
          <span className="blob a" /><span className="blob b" /><span className="blob c" />
          <div>
            <div className="eyebrow fade-up"><i className="dot" /> Conçu par des parents, avec des cliniciens</div>
            <h1 className="lp-title fade-up" style={{ animationDelay: '.08s' }}>
              Votre enfant est une graine de <span className="script">baobab</span>. Ensemble, regardons-le grandir.
            </h1>
            <p className="lp-sub fade-up" style={{ animationDelay: '.16s' }}>
              De la première inquiétude jusqu’à l’autonomie, on marche à vos côtés, pour <b>comprendre</b> votre enfant,
              lui <b>rendre la parole</b>, apaiser les jours difficiles et <b>célébrer chaque petit pas</b>.
              Sur votre téléphone. Même sans réseau. En toute douceur.
            </p>
            <div className="lp-cta-row fade-up" style={{ animationDelay: '.24s' }}>
              <button className="btn btn-accent btn-lg pulse" onClick={onEnter}>Commencer, c’est gratuit <ArrowRight size={18} /></button>
              <button className="btn btn-lg" onClick={onScreening}>Faire le point en 3 min</button>
            </div>
            <div className="trust-chips fade-up" style={{ animationDelay: '.32s' }}>
              <span className="trust-chip"><Lock size={14} /> Sans compte</span>
              <span className="trust-chip"><WifiOff size={14} /> Sans internet</span>
              <span className="trust-chip"><ShieldCheck size={14} /> Sans publicité</span>
              <span className="trust-chip"><Wallet size={14} /> Gratuit, à vie, pour l’essentiel</span>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="floaty"><PhoneMock /></div>
          </div>
        </section>
      </div>

      {/* ── Note fondatrice (de maman à maman) ─────────────── */}
      <div className="lp-wrap" style={{ paddingBottom: 8 }}>
        <div className="founder">
          <div className="row" style={{ gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <span className="face">👩🏾</span>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow"><i className="dot" /> Le mot qui a tout lancé</div>
              <blockquote style={{ marginTop: 10 }}>
                « Je suis maman d’un enfant autiste. J’ai connu l’attente, le doute, la fatigue,
                et l’<span className="hl">immense fierté des petites victoires</span>. Atlas Baobab, c’est l’outil
                que j’aurais tant voulu avoir dès le premier jour. »
              </blockquote>
              <cite>De maman à maman, l’équipe Atlas Baobab</cite>
            </div>
          </div>
        </div>
      </div>

      {/* ── On connaît ce chemin (problème, en douceur) ───── */}
      <section className="lp-section surface" id="chemin">
        <div className="lp-wrap">
          <div className="eyebrow"><i className="dot" /> On connaît ce chemin</div>
          <h2 className="lp-h2">Les murs qu’on rencontre, on les ouvre, une porte à la fois.</h2>
          <div className="grid3">
            <Pain emoji="❓" title="Le doute" text="« Est-ce que je m’inquiète pour rien ? » On vous aide à y voir clair, sans dramatiser." />
            <Pain emoji="🤍" title="La solitude" text="Pas d’orthophoniste à portée ? Vous devenez, en confiance, le premier allié de votre enfant." />
            <Pain emoji="💬" title="Le silence" text="Il a mille choses à dire. On lui donne enfin le moyen de les exprimer." />
            <Pain emoji="✨" title="Les forces cachées" text="On ne verra plus seulement ce qui manque : on révèle ce qu’il sait déjà faire." />
            <Pain emoji="🧭" title="L’avenir flou" text="École, forces, métier : un cap se dessine, pas à pas, à votre rythme." />
            <Pain emoji="🫂" title="L’épuisement" text="On veille aussi sur vous. Parce qu’un parent apaisé, c’est un enfant plus serein." />
          </div>
        </div>
      </section>

      {/* ── La boucle ──────────────────────────────────────── */}
      <section className="lp-section tint-brume">
        <div className="lp-wrap lp-center">
          <div className="eyebrow" style={{ justifyContent: 'center' }}><i className="dot" /> Une appli, tout le chemin</div>
          <h2 className="lp-h2">Rien n’est laissé de côté.</h2>
          <p className="lp-lead2">Là où d’autres traitent un symptôme, Atlas Baobab accompagne toute une vie.</p>
          <div className="steps">
            <Step title="Dépister" text="Un point gratuit, sans compte, dès le premier doute." />
            <Step title="Comprendre" text="Un portrait tout en douceur : forces et besoins." />
            <Step title="Développer" text="Parler, jouer, apaiser, chaque jour un petit pas." />
            <Step title="Orienter" text="École, forces, métier : un cap à discuter." />
            <Step title="S’épanouir" text="Un carnet de fiertés jusqu’à l’autonomie." />
          </div>
        </div>
      </section>

      {/* ── Compagnons (avatars), le côté ludique enfant ──── */}
      <section className="lp-section">
        <div className="lp-wrap lp-center">
          <div className="eyebrow" style={{ justifyContent: 'center' }}><i className="dot" /> Un ami rien qu’à lui</div>
          <h2 className="lp-h2">Un petit compagnon qui grandit avec votre enfant.</h2>
          <p className="lp-lead2">Il accueille, rassure, respire avec lui, félicite ses réussites. Il est heureux de le voir, <b>jamais</b> triste de ne pas le voir.</p>
          <div className="compagnons">
            {AVATARS.map((a, i) => (
              <div className="compagnon" key={a.key}>
                <div className={i % 2 ? 'face floaty-2' : 'face floaty'} style={{ background: ['#f1ebdf', '#e2ecee', '#ece8ef', '#f3e6de', '#e7eee2'][i] }}>
                  {avatarGlyph(a.key, 4)}
                </div>
                <small>{a.suggestedName}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Les outils (fonctionnalités, chaleureuses) ─────── */}
      <section className="lp-section surface" id="outils">
        <div className="lp-wrap">
          <div className="eyebrow"><i className="dot" /> Ce qui vous accompagne au quotidien</div>
          <h2 className="lp-h2">Des outils tendres et puissants, dans votre poche.</h2>

          <Feature
            glyph="🧠" sparks={['💡', '🌙']} bg="linear-gradient(150deg,#f7f3ec,#e8f0e9)"
            chip="CORTEX, le moteur"
            title="Une petite intelligence qui apprend votre enfant par cœur"
            text="CORTEX observe vos notes et devine, tout doucement, ce qui apaise et ce qui déclenche. Le Radar vous prévient des jours à risque et vous souffle le bon geste au bon moment."
            bullets={['« Les crises arrivent souvent en fin de journée »', 'Les stratégies qui marchent remontent en premier', 'Des calculs fiables, jamais laissés au hasard de l’IA']}
          />
          <Feature
            glyph="💬" sparks={['🍚', '🤗']} bg="linear-gradient(150deg,#eef4f5,#e2ecee)" rev
            chip="La CAA, sa voix"
            title="Rendez la parole à votre enfant"
            text="Un tableau d’images pensé pour ici (attiéké, alloco, taxi, maquis…), qui parle avec une voix française, même sans réseau. Gratuit à vie. Et si vous voulez, c’est la vraie voix de maman qui dit « j’ai faim »."
            bullets={['Des images claires + vos propres photos', 'Voix immédiate, moins de 0,3 seconde', 'Jamais coupée : c’est sa voix, on n’y touche pas']}
          />
          <Feature
            glyph="🎓" sparks={['📖', '⭐']} bg="linear-gradient(150deg,#f4f2f5,#ece8ef)"
            chip="Le Coach"
            title="Vous n’êtes plus seuls, on vous forme, pas à pas"
            text="Des mini-leçons de 5 minutes, choisies pour VOTRE enfant. Des histoires personnalisées avec son prénom et ses lieux à lui. Tout est relu et signé par des cliniciens."
            bullets={['« Il refuse de se brosser les dents, je fais quoi ? »', 'Histoires sociales à imprimer', 'Zéro jargon, que du concret']}
          />
          <Feature
            glyph="🤝" sparks={['💛', '🌍']} bg="linear-gradient(150deg,#f9f1ec,#f3e6de)" rev
            chip="La communauté"
            title="Un cercle de parents qui comprennent vraiment"
            text="Des échanges bienveillants, gratuits, modérés en français, en ivoirien et en nouchi. Pas de messages privés : un parrainage encadré met en lien un parent qui sait et un parent qui débute."
            bullets={['Poser une question, même anonymement', 'Les mauvais conseils écartés avant publication', 'Maman, nounou, grand-mère : tous reliés']}
          />
        </div>
      </section>

      {/* ── Célébration des forces ─────────────────────────── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="forces-band">
            <div className="eyebrow" style={{ justifyContent: 'center' }}><i className="dot" /> Le cœur de tout</div>
            <h2 className="lp-h2" style={{ margin: '10px auto 0' }}>On ne « répare » pas votre enfant. On <span style={{ color: '#7a9e7e' }}>révèle ses forces</span>.</h2>
            <p className="lp-lead2" style={{ margin: '12px auto 0' }}>Chaque enfant a ses îlots de génie. Atlas les cherche, les nomme, et les fait grandir.</p>
            <div className="forces-tags">
              <span className="force-tag">🎵 Le rythme</span>
              <span className="force-tag">🧩 La mémoire visuelle</span>
              <span className="force-tag">🔢 La logique</span>
              <span className="force-tag">🎨 Le détail</span>
              <span className="force-tag">💗 La tendresse</span>
              <span className="force-tag">🚗 Les passions intenses</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pour qui ───────────────────────────────────────── */}
      <section className="lp-section surface" id="pourqui">
        <div className="lp-wrap">
          <div className="eyebrow"><i className="dot" /> Autour de l’enfant</div>
          <h2 className="lp-h2">Tout le monde compte, tout le monde est relié.</h2>
          <div className="grid2">
            <ForWhom icon={<HeartPulse size={22} />} title="Les parents" text="Le tableau de bord complet : Radar, journal, coach, bilan. Vous pilotez, l’app vous rend fort." />
            <ForWhom icon={<Users size={22} />} title="Les aidants" text="Nounou, grand-mère, grande sœur : une vue toute simple, 3 gestes pour noter et apaiser." />
            <ForWhom icon={<GraduationCap size={22} />} title="Les professionnels" text="Médecins, psys, orthophonistes : des bilans clairs, exportables, respectueux." />
            <ForWhom icon={<Compass size={22} />} title="Écoles et associations" text="Une fiche « comment il fonctionne » pour l’enseignant, un suivi pour la structure." />
          </div>
        </div>
      </section>

      {/* ── Différenciateurs ───────────────────────────────── */}
      <section className="lp-section tint-coton">
        <div className="lp-wrap">
          <div className="eyebrow"><i className="dot" /> Fait pour la vraie vie, ici</div>
          <h2 className="lp-h2">Des promesses qui ne bougent jamais.</h2>
          <div className="badge-row">
            <Badge icon={<WifiOff size={18} />} text="Tout marche sans réseau" />
            <Badge icon={<Sparkles size={18} />} text="Sur un simple Android, même modeste" />
            <Badge icon={<Wallet size={18} />} text="Payable en Mobile Money" />
            <Badge icon={<Lock size={18} />} text="Les données de l’enfant restent chez vous" />
            <Badge icon={<ShieldCheck size={18} />} text="L’IA conseille, elle ne décide jamais" />
            <Badge icon={<BadgeCheck size={18} />} text="Zéro pub, zéro traceur, pour toujours" />
          </div>
        </div>
      </section>

      {/* ── Manifeste ──────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-wrap manifesto">
          <blockquote>
            « On m’a dit tout ce que mon enfant ne ferait <span className="hl">jamais</span>.
            Personne ne m’a dit tout ce qu’il pouvait <span className="hl">devenir</span>. Alors nous l’avons construit. »
          </blockquote>
          <cite>La promesse Atlas Baobab</cite>
        </div>
      </section>

      {/* ── Tarifs ─────────────────────────────────────────── */}
      <section className="lp-section surface" id="tarifs">
        <div className="lp-wrap">
          <div className="eyebrow"><i className="dot" /> Tarifs</div>
          <h2 className="lp-h2">Gratuit pour commencer. Doux pour continuer.</h2>
          <div className="price-grid">
            <Price tier="Gratuit" amount="0" unit="à vie" features={['Le pré-dépistage', 'La CAA de base', 'Le journal', 'Les fiches à partager']} cta="Commencer" onClick={onEnter} />
            <Price tier="Famille" amount="10 000" unit="FCFA/mois" featured features={['CORTEX complet', 'Radar et guidances', 'Coach et bilan 360', '2 aidants']} cta="Choisir Famille" onClick={onLogin} />
            <Price tier="Famille+" amount="20 000" unit="FCFA/mois" features={['Cap d’orientation', 'Carnet de fiertés', 'Aidants illimités', 'Voix et packs premium']} cta="Choisir Famille+" onClick={onLogin} />
            <Price tier="École / Asso" amount="Sur devis" unit="par structure" features={['Suivi multi-enfants', 'Pont École étendu', 'Formation', 'Accompagnement']} cta="Nous écrire" onClick={onLogin} />
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>💛 Une famille abonnée aide une famille qui n’en a pas les moyens (bourses solidaires).</p>
        </div>
      </section>

      {/* ── Confiance ──────────────────────────────────────── */}
      <section className="lp-section" id="ethique">
        <div className="lp-wrap">
          <div className="eyebrow"><i className="dot" /> La confiance avant tout</div>
          <h2 className="lp-h2">Le soin qu’on doit à un enfant.</h2>
          <div className="grid3">
            <div className="soft-card"><div className="ic">🩺</div><h3>Ce n’est pas un diagnostic</h3><p>Un outil de soutien et de repérage. On vous oriente toujours vers un professionnel et les structures près de chez vous.</p></div>
            <div className="soft-card"><div className="ic">✅</div><h3>Relu par des cliniciens</h3><p>Chaque contenu est vérifié et signé avant d’arriver à vous. Rien qui puisse égarer.</p></div>
            <div className="soft-card"><div className="ic">🔒</div><h3>Vos données restent à vous</h3><p>Conformité Loi CI 2013-450 et esprit RGPD. Synchronisation chiffrée, ou mode 100 % local.</p></div>
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="final-cta">
            <div className="eyebrow" style={{ justifyContent: 'center' }}><i className="dot" /> 🌿 Le premier pas</div>
            <h2 className="lp-h2" style={{ margin: '12px auto 0' }}>Il est gratuit. Et il change déjà quelque chose.</h2>
            <p className="lp-lead2" style={{ margin: '12px auto 0' }}>Quelques secondes, sans compte, sans engagement. Juste pour souffler un peu.</p>
            <div className="lp-cta-row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-accent btn-lg" onClick={onEnter}>Commencer maintenant <ArrowRight size={18} /></button>
              <button className="btn btn-lg" onClick={onScreening}>Faire le point en 3 min</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot-grid">
            <div>
              <div style={{ fontFamily: 'var(--font-brand)', fontSize: 24, color: '#ef9f27', marginBottom: 10 }}>Atlas Baobab</div>
              <p className="muted" style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>
                Accompagner les enfants autistes et leurs familles, avec tendresse et exigence. Pensé nativement pour l’Afrique francophone.
              </p>
            </div>
            <div><h5>Le produit</h5><a onClick={onScreening} role="button">Pré-dépistage</a><a href="#outils">Les outils</a><a href="#tarifs">Tarifs</a></div>
            <div><h5>Pour qui</h5><a href="#pourqui">Parents et aidants</a><a href="#pourqui">Professionnels</a><a href="#pourqui">Écoles et assos</a></div>
            <div><h5>Confiance</h5><a href="#ethique">Éthique et données</a><a onClick={onLogin} role="button">Se connecter</a><a onClick={onEnter} role="button">Entrer dans l’app</a></div>
          </div>
          <div className="lp-foot-bottom">
            <span>© 2026 Atlas Studio, Atlas Baobab. Outil de soutien, pas un diagnostic médical.</span>
            <span>Fait avec 💛 en Côte d’Ivoire, pour l’UEMOA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sous-composants ──────────────────────────────────────── */

function PhoneMock() {
  const r = 44, c = 2 * Math.PI * r, filled = 0.72 * c;
  const chips: string[] = ['mood', 'sleep', 'meal', 'success', 'weather'];
  return (
    <div className="phone" aria-hidden>
      <div className="phone-screen">
        <div className="pm-head">
          <div className="pm-label">Radar du jour</div>
          <span className="pm-band">Vigilance douce</span>
        </div>
        <div className="mini-gauge">
          <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="56" cy="56" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="56" cy="56" r={r} fill="none" stroke="var(--radar-orange)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${filled} ${c - filled}`} />
          </svg>
          <div className="mini-gauge-val"><b>72</b><small>/100</small></div>
        </div>
        <div className="mini-card">
          <span className="pm-dot" />
          <span><b>Bibo</b> a remarqué que les crises arrivent souvent en fin de journée.</span>
        </div>
        <div className="pm-chips">
          {chips.map((k) => {
            const G = KIND_GLYPH[k];
            return (
              <span className="pm-chip" key={k} style={{ '--tint': KIND_TINT[k] } as CSSProperties}>
                {G ? <G size={18} /> : null}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Pain({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return <div className="soft-card"><div className="ic">{emoji}</div><h3>{title}</h3><p>{text}</p></div>;
}

function Step({ title, text }: { title: string; text: string }) {
  return <div className="step"><span className="n" /><div><h4>{title}</h4><p>{text}</p></div></div>;
}

function Feature({ glyph, sparks, bg, chip, title, text, bullets, rev }: { glyph: string; sparks: string[]; bg: string; chip: string; title: string; text: string; bullets: string[]; rev?: boolean }) {
  return (
    <div className={rev ? 'feat rev' : 'feat'}>
      <div className="feat-copy">
        <span className="chip">{chip}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        <ul>{bullets.map((b) => <li key={b}>{b}</li>)}</ul>
      </div>
      <div className="feat-visual" style={{ background: bg }}>
        <span className="spark floaty-2" style={{ top: 20, left: 26 }}>{sparks[0]}</span>
        <span className="glyph floaty">{glyph}</span>
        <span className="spark floaty-2" style={{ bottom: 22, right: 28 }}>{sparks[1]}</span>
      </div>
    </div>
  );
}

function ForWhom({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="soft-card">
      <div className="ic" style={{ color: 'var(--primary)' }}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Badge({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="badge-item"><span className="bic">{icon}</span>{text}</div>;
}

function Price({ tier, amount, unit, features, cta, onClick, featured }: { tier: string; amount: string; unit: string; features: string[]; cta: string; onClick: () => void; featured?: boolean }) {
  return (
    <div className={featured ? 'price-card featured' : 'price-card'}>
      {featured && <span className="chip" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>Le plus choisi</span>}
      <div className="tier">{tier}</div>
      <div className="amt">{amount}{unit && <small> {unit}</small>}</div>
      <ul>{features.map((f) => <li key={f}>{f}</li>)}</ul>
      <button className={featured ? 'btn btn-accent btn-block' : 'btn btn-block'} onClick={onClick}>{cta}</button>
    </div>
  );
}
