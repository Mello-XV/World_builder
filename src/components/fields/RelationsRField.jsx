/**
 * RelationsRField — relations d'un personnage avec des nations ou organisations.
 *
 * Chaque relation contient : la cible (nation/org) + une description.
 */

import { useMemo } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { SearchSelect } from '../ui/SearchSelect';
import { MentionField } from '../ui/MentionField';
import { RichText } from '../ui/RichText';
import { T, sLbl, sBs } from '../../styles/theme';

export function RelationsREditor({ value, onChange, entries }) {
  const relations = Array.isArray(value) ? value : [];

  const targets = useMemo(
    () =>
      Object.values(entries).filter(
        e => e.category === 'nation' || e.category === 'organisation',
      ),
    [entries],
  );
  const options = targets.map(t => ({
    value: String(t.id),
    label: t.name,
    icon: CATEGORIES[t.category]?.icon,
  }));

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
            <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Nation / Organisation</label>
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
            <label style={{ ...sLbl, color: T.mu, fontSize: 10 }}>Description</label>
            <MentionField
              value={rel.description || ''}
              onChange={v => {
                const updated = [...relations];
                updated[i] = { ...updated[i], description: v };
                onChange(updated);
              }}
              entries={entries}
              placeholder="Décrivez…"
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
        + Relation
      </button>
    </div>
  );
}

export function RelationsRView({ value, entries, onNav }) {
  const relations = Array.isArray(value) ? value : [];
  if (!relations.length) return null;

  return (
    <div>
      {relations.map((rel, i) => {
        const target = rel.targetId ? entries[rel.targetId] : null;
        const cat = target ? CATEGORIES[target.category] : null;
        return (
          <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${T.bd}22` }}>
            {target ? (
              <span
                onClick={() => onNav(target.id)}
                style={{
                  color: cat?.color || T.ac,
                  cursor: 'pointer',
                  borderBottom: `1px dotted ${cat?.color}`,
                  fontWeight: 700,
                }}
              >
                {cat?.icon + ' ' + target.name}
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
