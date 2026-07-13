import { X } from 'lucide-react';
import { activeChild, useAppState } from '../lib/store.js';

/**
 * Carte Calme (SFD-C1 Partie J, audit 1). Affichable plein écran en 1 tap
 * pendant une crise en public : désamorce le regard des autres, protège l'enfant
 * et le parent. Formulation validée, déclinable. Anti-stigmatisation directe.
 */
export function CarteCalme({ onClose }: { onClose: () => void }) {
  const child = activeChild(useAppState());
  return (
    <div className="calm-screen">
      <button className="btn close" onClick={onClose} aria-label="Fermer"><X size={18} /> Fermer</button>
      <div className="calm-card">
        <div className="leaf">🌿</div>
        <div className="lead">{child ? `${child.first_name} est autiste.` : 'Mon enfant est autiste.'}</div>
        <p>Ce n’est pas un enfant mal élevé. Il traverse un moment difficile.</p>
        <p>Le calme et un peu d’espace autour de lui l’aident beaucoup.</p>
        <p className="thanks">Merci pour votre bienveillance. 💛</p>
      </div>
      <p className="calm-foot">Montrez simplement cet écran. Respirez : vous faites ce qu’il faut.</p>
    </div>
  );
}
