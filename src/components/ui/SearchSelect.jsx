/**
 * SearchSelect — liste déroulante avec recherche (choix unique).
 *
 * Affiche un champ de recherche en haut de la liste pour filtrer les options.
 * La croix (✕) permet de désélectionner.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { T, sInp } from '../../styles/theme';

export function SearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const ref = useRef(null);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, filter]);

  // Ferme la liste si on clique ailleurs
  useEffect(() => {
    if (!open) return;
    const handler = ev => {
      if (ref.current && !ref.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Champ affiché (cliquable pour ouvrir) */}
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
        <span style={{ color: selected ? T.tx : T.mu }}>
          {selected ? selected.label : placeholder || '— Sélectionner —'}
        </span>
        <span style={{ color: T.mu, fontSize: 10 }}>▼</span>
      </div>

      {/* Bouton de suppression */}
      {value && (
        <span
          onClick={ev => {
            ev.stopPropagation();
            onChange('');
          }}
          style={{
            position: 'absolute',
            right: 30,
            top: '50%',
            transform: 'translateY(-50%)',
            color: T.mu,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ✕
        </span>
      )}

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
              style={{ ...sInp, border: 'none', background: 'transparent', padding: 0, fontSize: 14 }}
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
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 14,
                color: o.value === value ? T.ac : T.tx,
              }}
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
  );
}
