/**
 * Toast — notification temporaire en bas de l'écran.
 *
 * Affiché 2,5 secondes puis disparaît automatiquement.
 * Utilisé pour confirmer les sauvegardes, suppressions, erreurs, etc.
 */

import { T } from '../../styles/theme';

export function Toast({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(30px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: T.ac,
        color: '#0f0e0d',
        padding: '10px 24px',
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 14,
        zIndex: 2000,
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  );
}
