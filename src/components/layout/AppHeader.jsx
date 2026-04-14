/**
 * AppHeader — barre de navigation du wiki (affiché quand un projet est ouvert).
 *
 * Contient :
 * - Bouton retour vers la liste des projets
 * - Nom du projet (cliquable pour le renommer)
 * - Barre de recherche inline avec dropdown de résultats
 * - Bouton export PDF
 * - Bouton profil
 *
 * Mobile : deux lignes — nav (globe + nom + actions) puis recherche pleine largeur.
 */

import { useRef } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { T, sBs, sInp } from '../../styles/theme';
import { useIsMobile } from '../../lib/useIsMobile';

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
  const isMobile = useIsMobile();

  const handleSelect = id => {
    onNav(id);
    onSearchChange('');
  };

  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 8 : 12,
      }}
    >
      {/* Ligne 1 (mobile) / rangée unique (desktop) : nav + actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Bouton globe */}
        <button style={{ ...sBs, padding: '4px 10px', flexShrink: 0 }} onClick={onGoProjects}>
          🌍
        </button>

        {/* Nom du projet */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: T.dm, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
            Encyclopédie
          </p>
          <h1
            onClick={() => onEditName(project?.name || '')}
            style={{
              fontSize: isMobile ? 15 : 18,
              fontWeight: 700,
              color: T.ac,
              letterSpacing: 1,
              textTransform: 'uppercase',
              margin: 0,
              cursor: 'pointer',
              borderBottom: '1px dashed ' + T.ac + '44',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project?.name}
          </h1>
        </div>

        {/* Barre de recherche (desktop uniquement ici, mobile = ligne 2) */}
        {!isMobile && (
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <SearchInput
              inputRef={inputRef}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              searchResults={searchResults}
              handleSelect={handleSelect}
            />
          </div>
        )}

        {/* Actions : PDF + Profil */}
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
              maxWidth: isMobile ? 90 : 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userProfile?.displayName || 'Profil'}
          </button>
        </div>
      </div>

      {/* Ligne 2 mobile : barre de recherche pleine largeur */}
      {isMobile && (
        <div style={{ position: 'relative' }}>
          <SearchInput
            inputRef={inputRef}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            searchResults={searchResults}
            handleSelect={handleSelect}
          />
        </div>
      )}
    </div>
  );
}

function SearchInput({ inputRef, searchQuery, onSearchChange, searchResults, handleSelect }) {
  return (
    <>
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
    </>
  );
}
