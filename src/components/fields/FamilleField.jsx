/**
 * FamilleField — gestion de l'arbre familial d'un personnage.
 *
 * Chaque membre de famille a : un lien (Père, Mère...), un nom, une description.
 * Quand on choisit « Autres… » dans le lien familial, un champ inline apparaît
 * pour saisir un nouveau type qui est ajouté à la liste.
 */

import { useState } from 'react';
import { FAMILY_TYPES_BASE } from '../../constants/options';
import { MentionField } from '../ui/MentionField';
import { T, sInp, sSel, sLbl, sBs } from '../../styles/theme';
import { RichText } from '../ui/RichText';

export function FamilleEditor({ value, onChange, entries }) {
  const members = Array.isArray(value) ? value : [];
  const [familyTypes, setFamilyTypes] = useState([...FAMILY_TYPES_BASE]);
  // editingCustom : { [memberIndex]: currentInputValue }
  const [editingCustom, setEditingCustom] = useState({});

  const confirmCustomType = (i) => {
    const val = (editingCustom[i] ?? '').trim();
    if (val && !familyTypes.includes(val)) {
      setFamilyTypes(prev => [...prev, val]);
    }
    const updated = [...members];
    updated[i] = { ...updated[i], type: val };
    onChange(updated);
    setEditingCustom(prev => { const next = { ...prev }; delete next[i]; return next; });
  };

  return (
    <div>
      {members.map((member, i) => (
        <div
          key={i}
          style={{
            background: T.bgI,
            border: `1px solid ${T.bd}`,
            borderRadius: 6,
            padding: 12,
            marginBottom: 8,
            position: 'relative',
          }}
        >
          {/* Bouton supprimer */}
          <button
            onClick={() => onChange(members.filter((_, j) => j !== i))}
            style={{ position: 'absolute', top: 8, right: 8, ...sBs, color: '#9b4d4d', padding: '2px 8px' }}
          >
            ✕
          </button>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {/* Lien familial */}
            <div style={{ flex: '0 0 180px' }}>
              <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Lien familial</label>

              {editingCustom[i] !== undefined ? (
                /* Saisie d'un nouveau type personnalisé */
                <input
                  autoFocus
                  style={{ ...sInp, fontSize: 13, padding: '6px 10px' }}
                  value={editingCustom[i]}
                  onChange={ev => setEditingCustom(prev => ({ ...prev, [i]: ev.target.value }))}
                  onKeyDown={ev => {
                    if (ev.key === 'Enter') { ev.preventDefault(); confirmCustomType(i); }
                    if (ev.key === 'Escape') {
                      setEditingCustom(prev => { const next = { ...prev }; delete next[i]; return next; });
                    }
                  }}
                  onBlur={() => confirmCustomType(i)}
                  placeholder="Nouveau lien… (Entrée pour valider)"
                />
              ) : (
                <select
                  style={{ ...sSel, fontSize: 13, padding: '6px 10px' }}
                  value={member.type}
                  onChange={ev => {
                    if (ev.target.value === '__autres__') {
                      setEditingCustom(prev => ({ ...prev, [i]: '' }));
                    } else {
                      const updated = [...members];
                      updated[i] = { ...updated[i], type: ev.target.value };
                      onChange(updated);
                    }
                  }}
                >
                  <option value="">— Type —</option>
                  {familyTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="__autres__">Autres…</option>
                </select>
              )}
            </div>

            {/* Nom */}
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Nom</label>
              <input
                style={{ ...sInp, fontSize: 13, padding: '6px 10px' }}
                value={member.name}
                onChange={ev => {
                  const updated = [...members];
                  updated[i] = { ...updated[i], name: ev.target.value };
                  onChange(updated);
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Description</label>
            <MentionField
              value={member.description || ''}
              onChange={v => {
                const updated = [...members];
                updated[i] = { ...updated[i], description: v };
                onChange(updated);
              }}
              entries={entries}
              placeholder="Description…"
              multiline
              style={{ minHeight: 50, fontSize: 13 }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => onChange([...members, { type: '', name: '', description: '' }])}
        style={{ ...sBs, color: T.ac, borderColor: T.ac + '44' }}
      >
        + Membre
      </button>
    </div>
  );
}

export function FamilleView({ value, entries, onNav }) {
  const members = Array.isArray(value) ? value : [];
  if (!members.length) return null;

  return (
    <div>
      {members.map((member, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 8,
            padding: '6px 0',
            borderBottom: `1px solid ${T.bd}22`,
            alignItems: 'baseline',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: T.ac, fontWeight: 700, fontSize: 13, minWidth: 130 }}>
            {member.type || '—'}
          </span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{member.name || '—'}</span>
          {member.description && (
            <span style={{ color: T.mu, fontSize: 13, flex: 1 }}>
              {' — '}
              <RichText text={member.description} entries={entries} onNav={onNav} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
