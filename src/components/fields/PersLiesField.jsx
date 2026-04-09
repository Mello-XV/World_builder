/**
 * PersLiesField — personnages secondaires liés à un personnage principal.
 *
 * Chaque lien contient : le personnage cible + une description du lien.
 */

import { useMemo } from 'react';
import { SearchSelect } from '../ui/SearchSelect';
import { MentionField } from '../ui/MentionField';
import { RichText } from '../ui/RichText';
import { T, sLbl, sBs } from '../../styles/theme';

export function PersLiesEditor({ value, onChange, entries }) {
  const relations = Array.isArray(value) ? value : [];

  const options = useMemo(
    () =>
      Object.values(entries)
        .filter(e => e.category === 'personnage')
        .map(p => ({ value: String(p.id), label: p.name, icon: '👤' })),
    [entries],
  );

  return (
    <div>
      {relations.map((rel, i) => (
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
          <button
            onClick={() => onChange(relations.filter((_, j) => j !== i))}
            style={{ position: 'absolute', top: 8, right: 8, ...sBs, color: '#9b4d4d', padding: '2px 8px' }}
          >
            ✕
          </button>

          <div style={{ marginBottom: 8 }}>
            <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Personnage</label>
            <SearchSelect
              value={rel.targetId ? String(rel.targetId) : ''}
              onChange={v => {
                const updated = [...relations];
                updated[i] = { ...updated[i], targetId: v ? parseInt(v) : null };
                onChange(updated);
              }}
              options={options}
              placeholder="Choisir…"
            />
          </div>

          <div>
            <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Descriptif</label>
            <MentionField
              value={rel.description || ''}
              onChange={v => {
                const updated = [...relations];
                updated[i] = { ...updated[i], description: v };
                onChange(updated);
              }}
              entries={entries}
              placeholder="Lien…"
              multiline
              style={{ minHeight: 60, fontSize: 13 }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => onChange([...relations, { targetId: null, description: '' }])}
        style={{ ...sBs, color: T.ac, borderColor: T.ac + '44' }}
      >
        + Personnage lié
      </button>
    </div>
  );
}

export function PersLiesView({ value, entries, onNav }) {
  const relations = Array.isArray(value) ? value : [];
  if (!relations.length) return null;

  return (
    <div>
      {relations.map((rel, i) => {
        const target = rel.targetId ? entries[rel.targetId] : null;
        return (
          <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${T.bd}22` }}>
            {target ? (
              <span
                onClick={() => onNav(target.id)}
                style={{
                  color: '#c9a84c',
                  cursor: 'pointer',
                  borderBottom: '1px dotted #c9a84c',
                  fontWeight: 700,
                }}
              >
                {'👤 ' + target.name}
              </span>
            ) : (
              <span style={{ color: T.mu }}>—</span>
            )}
            {rel.description && (
              <div style={{ marginTop: 4, fontSize: 14, textAlign: 'justify' }}>
                <RichText text={rel.description} entries={entries} onNav={onNav} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
