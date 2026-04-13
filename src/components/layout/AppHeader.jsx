/**
 * AppHeader — barre de navigation du wiki (affiché quand un projet est ouvert).
 *
 * Contient :
 * - Bouton retour vers la liste des projets
 * - Nom du projet (cliquable pour le renommer)
 * - Barre de recherche inline avec dropdown de résultats
 * - Bouton export PDF
 * - Bouton profil
 */

import { useRef } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { T, sBs, sBtn, sInp } from '../../styles/theme';

export function AppHeader({
  project,
  onGoProjects,
  onEditName,
  onExportPdf,
  onProfile,
  userProfile,
  searchQuery,
  onSearchChange,
  searchResults,
  onNav,
}) {
  const inputRef = useRef(null);

  const handleSelect = id => {
    onNav(id);
    onSearchChange('');
  };

  return (
    <div
      style={{
        padding: '20px 0 14px',
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {/* Gauche : bouton globe + nom du projet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button style={{ ...sBs, padding: '4px 10px' }} onClick={onGoProjects}>
          🌍
        </button>
        <div>
          <p style={{ fontSize: 10, color: T.dm, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
            Encyclopédie
          </p>
          <h1
            onClick={() => onEditName(project?.name || '')}
            style={{
              fontSize: 18, fontWeight: 700, color: T.ac,
              letterSpacing: 1, textTransform: 'uppercase', margin: 0,
              cursor: 'pointer', borderBottom: '1px dashed ' + T.ac + '44',
            }}
          >
            {project?.name}
          </h1>
        </div>
      </div>

      {/* Centre : barre de recherche */}
      <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Rechercher une fiche…"
          style={{
            ...sInp,
            width: '100%',
            fontSize: 14,
            padding: '6px 12px',
          }}
        />

        {/* Dropdown résultats */}
        {searchResults?.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 200,
              background: T.bgC,
              border: `1px solid ${T.bd}`,
              borderRadius: 6,
              marginTop: 4,
              maxHeight: 320,
              overflowY: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            }}
          >
            {searchResults.map(entry => {
              const cat = CATEGORIES[entry.category];
              return (
                <div
                  key={entry.id}
                  onMouseDown={() => handleSelect(entry.id)}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom: `1px solid ${T.bd}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.bgH)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.tx }}>{entry.name}</div>
                    <div style={{ fontSize: 11, color: T.mu }}>{cat?.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Droite : actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <button style={sBs} onClick={onExportPdf} title="Exporter en PDF">
          📄
        </button>
        <button
          onClick={onProfile}
          title="Mon profil"
          style={{
            ...sBs,
            color: T.ac,
            borderColor: T.ac + '44',
            fontWeight: 600,
            letterSpacing: 0.5,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {userProfile?.displayName || 'Profil'}
        </button>
      </div>
    </div>
  );
}
