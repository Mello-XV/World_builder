/**
 * MultiSearchSelect — liste déroulante avec recherche (choix multiple).
 *
 * Affiche les éléments sélectionnés sous forme de tags.
 * Chaque tag a une croix (✕) pour le retirer.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { T, sInp, sTg } from '../../styles/theme';

export function MultiSearchSelect({ value, onChange, options, placeholder }) {
  const selected = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef(null);

  // Options disponibles = toutes sauf les déjà sélectionnées
  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) && !selected.includes(o.value));
  }, [options, filter, selected]);

  // Ferme la liste si on clique ailleurs
  useEffect(() => {
    if (!open) return;
    const handler = ev => {
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref}>
      {/* Tags des éléments sélectionnés */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map(id => {
            const opt = options.find(x => x.value === id);
            return (
              <span
                key={id}
                style={{
                  ...sTg,
                  color: T.ac,
                  background: T.ac + '18',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {opt?.icon || ''}
                {'  '}
                {opt?.label || id}
                <span
                  onClick={() => onChange(selected.filter(x => x !== id))}
                  style={{ cursor: 'pointer', marginLeft: 4, opacity: 0.6 }}
                >
                  ✕
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Bouton d'ajout */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={() => {
            setOpen(!open);
            setFilter('');
          }}
          style={{
            ...sInp,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: T.mu }}>{placeholder || '+ Ajouter…'}</span>
          <span style={{ color: T.mu, fontSize: 10 }}>▼</span>
        </div>

        {/* Liste déroulante */}
        {open && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              zIndex: 100,
              background: T.bgC,
              border: `1px solid ${T.bd}`,
              borderRadius: 6,
              maxHeight: 220,
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            }}
          >
            {/* Champ de recherche */}
            <div style={{ padding: '6px 10px', borderBottom: `1px solid ${T.bd}` }}>
              <input
                value={filter}
                onChange={ev => setFilter(ev.target.value)}
                placeholder="Rechercher…"
                style={{
                  ...sInp,
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontSize: 14,
                }}
                autoFocus
              />
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', color: T.mu, fontSize: 13 }}>Aucun résultat</div>
            )}

            {filtered.map(o => (
              <div
                key={o.value}
                onClick={() => {
                  onChange([...selected, o.value]);
                  setOpen(false);
                }}
                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={ev => {
                  ev.currentTarget.style.background = T.bgH;
                }}
                onMouseLeave={ev => {
                  ev.currentTarget.style.background = 'transparent';
                }}
              >
                {o.icon ? o.icon + ' ' : ''}
                {o.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
