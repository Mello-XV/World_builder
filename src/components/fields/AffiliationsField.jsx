/**
 * AffiliationsField — gestion des affiliations d'un personnage.
 *
 * Permet de lier un personnage à des organisations, nations ou religions.
 * Affichage en lecture : liste de liens cliquables vers les entrées liées.
 * Affichage en édition : MultiSearchSelect filtré sur ces catégories.
 */

import { useMemo } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { MultiSearchSelect } from '../ui/MultiSearchSelect';
import { T } from '../../styles/theme';

export function AffiliationsEditor({ value, onChange, entries }) {
  const targets = useMemo(
    () =>
      Object.values(entries).filter(
        e => e.category === 'organisation' || e.category === 'nation' || e.category === 'religion',
      ),
    [entries],
  );
  const options = targets.map(e => ({
    value: String(e.id),
    label: e.name,
    icon: CATEGORIES[e.category]?.icon,
  }));

  return (
    <MultiSearchSelect
      value={(Array.isArray(value) ? value : []).map(String)}
      onChange={v => onChange(v.map(Number))}
      options={options}
      placeholder="+ Ajouter une affiliation…"
    />
  );
}

export function AffiliationsView({ value, entries, onNav }) {
  const ids = Array.isArray(value) ? value : [];
  if (!ids.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ids.map(id => {
        const entry = entries[id];
        if (!entry) return null;
        const cat = CATEGORIES[entry.category];
        return (
          <span
            key={id}
            onClick={() => onNav(id)}
            style={{
              color: cat?.color || T.ac,
              cursor: 'pointer',
              borderBottom: `1px dotted ${cat?.color}`,
              fontWeight: 600,
            }}
          >
            {cat?.icon + ' ' + entry.name}
          </span>
        );
      })}
    </div>
  );
}
