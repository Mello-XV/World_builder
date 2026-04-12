/**
 * ProjectsScreen — liste des projets de l'utilisateur.
 *
 * C'est le premier écran affiché après la connexion.
 * Permet de créer, ouvrir et supprimer des projets.
 */

import { useState } from 'react';
import { saveProject, deleteProjectDB } from '../lib/firestore';
import { DeleteProjectModal } from '../components/modals/DeleteProjectModal';
import { Toast } from '../components/layout/Toast';
import { T, sCard, sInp, sLbl, sBtnA, sBtn, sBs } from '../styles/theme';

export function ProjectsScreen({ projects, onProjectOpen, onProjectsChange, onProfile, userProfile }) {
  const [newProj, setNewProj] = useState(null);  // null = modal fermé, {} = modal ouvert
  const [delProj, setDelProj] = useState(null);
  const [toast, setToast] = useState(null);

  const flash = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreate = async () => {
    if (!newProj?.name?.trim()) {
      flash('Nom obligatoire');
      return;
    }
    const project = {
      id: Date.now().toString(),
      name: newProj.name.trim(),
      description: newProj.description || '',
      createdAt: Date.now(),
    };
    await saveProject(project);
    onProjectsChange([...projects, project]);
    setNewProj(null);
    onProjectOpen(project, { entries: {}, nextId: 1 });
    flash('Créé !');
  };

  const handleDelete = async () => {
    await deleteProjectDB(delProj.id);
    onProjectsChange(projects.filter(p => p.id !== delProj.id));
    setDelProj(null);
    flash('Supprimé');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Bouton profil (haut droite) */}
      {onProfile && (
        <button
          onClick={onProfile}
          style={{ ...sBs, position: 'fixed', top: 20, right: 20, color: T.ac, borderColor: T.ac + '44', fontWeight: 600 }}
        >
          {userProfile?.displayName || 'Profil'}
        </button>
      )}

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌍</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: T.ac,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          World Builder
        </h1>
        <p style={{ color: T.mu, fontSize: 15, marginTop: 8 }}>Wiki de World-Building</p>
      </div>

      {/* Liste des projets */}
      <div style={{ width: '100%', maxWidth: 500 }}>
        {projects.map(p => (
          <div
            key={p.id}
            style={{
              ...sCard,
              cursor: 'pointer',
              marginBottom: 12,
              borderLeft: `4px solid ${T.ac}`,
              position: 'relative',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = T.bgH;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = T.bgC;
            }}
          >
            <div onClick={() => onProjectOpen(p, null)}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
              {p.description && (
                <p style={{ fontSize: 14, color: T.mu, lineHeight: 1.5 }}>{p.description}</p>
              )}
            </div>
            <button
              onClick={ev => {
                ev.stopPropagation();
                setDelProj(p);
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: `1px solid #9b4d4d44`,
                color: '#9b4d4d',
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🗑
            </button>
          </div>
        ))}

        <button
          style={{ ...sBtnA, width: '100%', marginTop: 8, fontSize: 16, padding: '14px 20px' }}
          onClick={() => setNewProj({ name: '', description: '' })}
        >
          + Nouveau projet
        </button>
      </div>

      {/* Modal : supprimer projet */}
      <DeleteProjectModal
        project={delProj}
        onConfirm={handleDelete}
        onCancel={() => setDelProj(null)}
      />

      {/* Modal : créer projet */}
      {newProj && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setNewProj(null)}
        >
          <div
            style={{
              background: T.bgC,
              border: `1px solid ${T.bd}`,
              borderRadius: 8,
              padding: 30,
              width: '90%',
              maxWidth: 450,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: T.ac }}>
              Nouveau projet
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ ...sLbl, color: T.ac }}>Nom *</label>
              <input
                style={{ ...sInp, fontSize: 18, fontWeight: 700 }}
                value={newProj.name}
                onChange={e => setNewProj({ ...newProj, name: e.target.value })}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ ...sLbl, color: T.ac }}>Description</label>
              <textarea
                style={{ ...sInp, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
                value={newProj.description}
                onChange={e => setNewProj({ ...newProj, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={sBtnA} onClick={handleCreate}>
                Créer
              </button>
              <button style={sBtn} onClick={() => setNewProj(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
