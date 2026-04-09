/**
 * AppHeader — barre de navigation du wiki (affiché quand un projet est ouvert).
 *
 * Contient :
 * - Bouton retour vers la liste des projets
 * - Nom du projet (cliquable pour le renommer)
 * - Boutons : export JSON, import JSON, déconnexion, recherche
 */

import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { T, sBs, sBtn } from '../../styles/theme';

export function AppHeader({ project, onGoProjects, onEditName, onSearch, onExport, onImport }) {
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
        <button
          style={{ ...sBs, padding: '4px 10px' }}
          onClick={onGoProjects}
        >
          🌍
        </button>
        <div>
          <p
            style={{
              fontSize: 10,
              color: T.dm,
              letterSpacing: 3,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            Encyclopédie
          </p>
          <h1
            onClick={() => onEditName(project?.name || '')}
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: T.ac,
              letterSpacing: 1,
              textTransform: 'uppercase',
              margin: 0,
              cursor: 'pointer',
              borderBottom: '1px dashed ' + T.ac + '44',
            }}
          >
            {project?.name}
          </h1>
        </div>
      </div>

      {/* Droite : actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={sBs} onClick={onExport} title="Exporter en JSON">
          📥
        </button>
        <button style={sBs} onClick={onImport} title="Importer un JSON">
          📤
        </button>
        <button style={sBs} onClick={() => signOut(auth)} title="Déconnexion">
          🚪
        </button>
        <button style={sBtn} onClick={onSearch} title="Rechercher (Ctrl+K)">
          🔍
        </button>
      </div>
    </div>
  );
}
