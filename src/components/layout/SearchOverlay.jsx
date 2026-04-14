/**
 * SearchOverlay — overlay de recherche globale (Ctrl+K).
 *
 * Recherche dans le nom, la description et tous les champs texte des fiches.
 * Affiche au maximum 15 résultats cliquables.
 */

import { useRef, useEffect } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { T, sInp, hov } from '../../styles/theme';
import { useIsMobile } from '../../lib/useIsMobile';

export function SearchOverlay({ query, onQueryChange, results, onNav, onClose }) {
  const inputRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: isMobile ? 20 : 80,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 560,
          background: T.bgC,
          border: `1px solid ${T.bd}`,
          borderRadius: 8,
          overflow: 'hidden',
          maxHeight: isMobile ? '80vh' : '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Champ de recherche */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.bd}` }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Rechercher…"
            style={{ ...sInp, border: 'none', background: 'transparent', fontSize: 17, padding: 0 }}
            autoFocus
          />
        </div>

        {/* Résultats */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {!results.length && query.trim() && (
            <div style={{ padding: 20, color: T.mu, textAlign: 'center' }}>Aucun résultat</div>
          )}
          {results.map(entry => {
            const cat = CATEGORIES[entry.category];
            return (
              <div
                key={entry.id}
                onClick={() => onNav(entry.id)}
                style={{
                  padding: '10px 20px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${T.bd}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                onMouseEnter={e => hov(e, true)}
                onMouseLeave={e => hov(e, false)}
              >
                <span style={{ fontSize: 18 }}>{cat?.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
                  <div style={{ fontSize: 11, color: T.mu }}>{cat?.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
