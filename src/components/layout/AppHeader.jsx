/**
 * AppHeader — barre de navigation du wiki (affiché quand un projet est ouvert).
 *
 * Contient :
 * - Bouton retour vers la liste des projets
 * - Nom du projet (cliquable pour le renommer)
 * - Bouton profil (pseudo de l'utilisateur)
 * - Bouton export PDF
 * - Recherche
 */

import { T, sBs, sBtn } from '../../styles/theme';

export function AppHeader({ project, onGoProjects, onEditName, onSearch, onExportPdf, onProfile, userProfile }) {
  return (
    <div
      style={{
        padding: '20px 0 14px',
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      {/* Gauche : bouton globe + nom du projet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

      {/* Droite : actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={sBs} onClick={onExportPdf} title="Exporter en PDF">
          📄
        </button>
        <button style={sBtn} onClick={onSearch} title="Rechercher (Ctrl+K)">
          🔍
        </button>
        {/* Bouton profil — affiche le pseudo */}
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
