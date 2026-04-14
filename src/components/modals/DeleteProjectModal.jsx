/**
 * DeleteProjectModal — confirmation de suppression d'un projet.
 *
 * Avertit que toutes les fiches seront supprimées.
 */

import { T, sBtn, sBtnA } from '../../styles/theme';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function DeleteProjectModal({ project, onConfirm, onCancel }) {
  if (!project) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div
        style={{
          background: T.bgC,
          border: `1px solid ${T.bd}`,
          borderRadius: 8,
          padding: 'clamp(16px, 5vw, 30px)',
          width: '90%',
          maxWidth: 420,
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Supprimer ?</div>
        <div style={{ color: T.mu, marginBottom: 8 }}>« {project.name} »</div>
        <div style={{ color: '#9b4d4d', fontSize: 13, marginBottom: 20 }}>
          Toutes les fiches seront supprimées.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={sBtn} onClick={onCancel}>
            Annuler
          </button>
          <button style={{ ...sBtnA, background: '#9b4d4d' }} onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
