/**
 * EditProjectNameModal — renommage d'un projet.
 *
 * S'ouvre en cliquant sur le nom du projet dans le header.
 */

import { T, sInp, sBtnA, sBtn } from '../../styles/theme';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function EditProjectNameModal({ name, onChange, onConfirm, onCancel }) {
  if (name === null) return null;

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
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: T.ac }}>
          Renommer le projet
        </h3>
        <input
          style={{ ...sInp, fontSize: 18, fontWeight: 700, marginBottom: 16 }}
          value={name}
          onChange={e => onChange(e.target.value)}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) onConfirm();
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={sBtnA} onClick={onConfirm} disabled={!name.trim()}>
            Renommer
          </button>
          <button style={sBtn} onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
