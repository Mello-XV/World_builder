/**
 * DeleteEntryModal — confirmation de suppression d'une fiche.
 */

import { T, sBtn, sBtnA } from '../../styles/theme';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  zIndex: 1500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function DeleteEntryModal({ entry, onConfirm, onCancel }) {
  if (!entry) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div
        style={{
          background: T.bgC,
          border: `1px solid ${T.bd}`,
          borderRadius: 8,
          padding: 'clamp(16px, 5vw, 30px)',
          width: '90%',
          maxWidth: 400,
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Supprimer ?</div>
        <div style={{ color: T.mu, marginBottom: 24 }}>« {entry.name} »</div>
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
