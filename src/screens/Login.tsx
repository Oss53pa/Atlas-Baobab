import { useState } from 'react';
import { ArrowLeft, Cloud } from 'lucide-react';
import { signInWithPassword, signUpWithPassword, resetPassword } from '../lib/auth.js';
import { actions } from '../lib/store.js';

/** Page de connexion (Mon espace). L'utilisateur saisit lui-même ses identifiants ;
 * l'app ne crée jamais de compte à sa place. Une session valide fait passer la
 * porte d'entrée automatiquement (voir App). */
export function Login({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doSignIn() {
    setBusy(true); setMsg(null);
    const { error } = await signInWithPassword(email.trim(), pw);
    if (error) setMsg(error.message);
    setBusy(false);
  }
  async function doSignUp() {
    setBusy(true); setMsg(null);
    const { error } = await signUpWithPassword(email.trim(), pw);
    setMsg(error ? error.message : 'Compte créé. Confirmez votre email, puis connectez-vous.');
    setBusy(false);
  }
  async function doReset() {
    if (!email.trim()) { setMsg('Entrez votre email d’abord.'); return; }
    setBusy(true); setMsg(null);
    const { error } = await resetPassword(email.trim());
    setMsg(error ? error.message : 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.');
    setBusy(false);
  }

  return (
    <div className="login-page reveal">
      <div className="login-card">
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 8 }}><ArrowLeft size={16} /> Accueil</button>

        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span className="avatar-badge" style={{ width: 56, height: 56, margin: '0 auto', background: '#f4ecdd' }}>
              <img className="logo-anim" src="/baobab.png" width={44} height={44} alt="" style={{ filter: 'brightness(0.32) saturate(1.4)' }} />
            </span>
            <h2 style={{ fontSize: 22, marginTop: 10 }}>Mon espace</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Sauvegarde chiffrée & multi-aidants. Optionnel.</p>
          </div>

          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <Cloud size={16} color="var(--primary)" />
            <span className="muted" style={{ fontSize: 12 }}>Connexion au cloud Atlas Baobab</span>
          </div>

          <div className="stack">
            <div>
              <label className="lbl">Email</label>
              <input className="field" type="email" placeholder="vous@exemple.ci" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="lbl">Mot de passe</label>
              <input className="field" type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
            </div>
          </div>

          {msg && <p style={{ fontSize: 12.5, marginTop: 10, color: 'var(--radar-red)' }}>{msg}</p>}

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} disabled={busy || !email || !pw} onClick={doSignIn}>
            Se connecter
          </button>
          <button className="btn btn-block" style={{ marginTop: 10 }} disabled={busy || !email || !pw} onClick={doSignUp}>
            Créer un compte
          </button>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button className="btn-ghost" style={{ border: 'none', background: 'none', color: '#b07c2a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} disabled={busy} onClick={doReset}>
              Mot de passe oublié ?
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className="btn-ghost" style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }} onClick={() => actions.setEntered(true)}>
              Continuer sans compte (mode local) →
            </button>
          </div>
        </div>

        <p className="notice" style={{ marginTop: 12 }}>
          Aucune donnée de l’enfant ne quitte l’appareil sans compte connecté (CDC §10).
        </p>
      </div>
    </div>
  );
}
