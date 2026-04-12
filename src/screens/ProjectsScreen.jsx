/**
 * ProjectsScreen — liste des projets de l'utilisateur.
 *
 * Affiche les projets propres et les projets suivis.
 * Permet de créer, ouvrir, supprimer des projets, et de suivre un projet via code.
 */

import { useState } from 'react';
import { saveProject, deleteProjectDB, sendFollowRequest } from '../lib/firestore';
import { DeleteProjectModal } from '../components/modals/DeleteProjectModal';
import { Toast } from '../components/layout/Toast';
import { T, sCard, sInp, sLbl, sBtnA, sBtn, sBs } from '../styles/theme';

export function ProjectsScreen({
  projects, followedProjects = [], currentUser, userProfile,
  onProjectOpen, onFollowedProjectOpen, onProjectsChange, onProfile,
}) {
  const [newProj, setNewProj] = useState(null);
  const [delProj, setDelProj] = useState(null);
  const [toast, setToast] = useState(null);
  const [followModal, setFollowModal] = useState(false);
  const [followCode, setFollowCode] = useState('');
  const [followMsg, setFollowMsg] = useState(null); // { type: 'success'|'error', text }
  const [followLoading, setFollowLoading] = useState(false);

  const flash = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Créer un projet ────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newProj?.name?.trim()) { flash('Nom obligatoire'); return; }
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

  // ── Suivre un projet via code ──────────────────────────────────────────

  const handleFollowSubmit = async () => {
    if (!followCode.trim() || !currentUser) return;
    setFollowLoading(true);
    setFollowMsg(null);
    const result = await sendFollowRequest(
      currentUser.uid,
      userProfile?.displayName || currentUser.email,
      followCode,
    );
    setFollowLoading(false);
    if (result.success) {
      setFollowMsg({ type: 'success', text: `Demande envoyée pour "${result.projectName}" — en attente d'approbation.` });
      setFollowCode('');
    } else {
      setFollowMsg({ type: 'error', text: result.error });
    }
  };

  const closeFollowModal = () => {
    setFollowModal(false);
    setFollowCode('');
    setFollowMsg(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

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
        <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ac, letterSpacing: 2, textTransform: 'uppercase' }}>
          World Builder
        </h1>
        <p style={{ color: T.mu, fontSize: 15, marginTop: 8 }}>Wiki de World-Building</p>
      </div>

      <div style={{ width: '100%', maxWidth: 500 }}>

        {/* ── Mes projets ── */}
        {projects.length > 0 && (
          <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            Mes projets
          </div>
        )}

        {projects.map(p => (
          <div
            key={p.id}
            style={{ ...sCard, cursor: 'pointer', marginBottom: 12, borderLeft: `4px solid ${T.ac}`, position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.bgH; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.bgC; }}
          >
            <div onClick={() => onProjectOpen(p, null)}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
              {p.description && <p style={{ fontSize: 14, color: T.mu, lineHeight: 1.5 }}>{p.description}</p>}
            </div>
            <button
              onClick={ev => { ev.stopPropagation(); setDelProj(p); }}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: '1px solid #9b4d4d44', color: '#9b4d4d', padding: '4px 8px', fontSize: 12, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
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

        {/* ── Projets suivis ── */}
        {followedProjects.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', margin: '28px 0 10px' }}>
              Projets suivis
            </div>
            {followedProjects.map(fp => (
              <div
                key={fp.projectId}
                style={{ ...sCard, cursor: 'pointer', marginBottom: 12, borderLeft: `4px solid ${T.mu}` }}
                onClick={() => onFollowedProjectOpen(fp.ownerUid, fp.projectId, fp.projectName)}
                onMouseEnter={e => { e.currentTarget.style.background = T.bgH; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.bgC; }}
              >
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{fp.projectName}</h3>
                <p style={{ fontSize: 12, color: T.dm, margin: 0 }}>👁 Lecture seule</p>
              </div>
            ))}
          </>
        )}

        {/* Bouton suivre un projet */}
        <button
          style={{ ...sBtn, width: '100%', marginTop: 12, fontSize: 14, padding: '11px 20px' }}
          onClick={() => setFollowModal(true)}
        >
          🔗 Suivre un projet
        </button>
      </div>

      {/* ── Modal : supprimer projet ── */}
      <DeleteProjectModal project={delProj} onConfirm={handleDelete} onCancel={() => setDelProj(null)} />

      {/* ── Modal : créer projet ── */}
      {newProj && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setNewProj(null)}
        >
          <div
            style={{ background: T.bgC, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 30, width: '90%', maxWidth: 450 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: T.ac }}>Nouveau projet</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...sLbl, color: T.ac }}>Nom *</label>
              <input
                style={{ ...sInp, fontSize: 18, fontWeight: 700 }}
                value={newProj.name}
                onChange={e => setNewProj({ ...newProj, name: e.target.value })}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
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
              <button style={sBtnA} onClick={handleCreate}>Créer</button>
              <button style={sBtn} onClick={() => setNewProj(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : suivre un projet ── */}
      {followModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeFollowModal}
        >
          <div
            style={{ background: T.bgC, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 30, width: '90%', maxWidth: 420 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: T.ac }}>Suivre un projet</h3>
            <p style={{ fontSize: 13, color: T.mu, marginBottom: 20, lineHeight: 1.6 }}>
              Entre le code de partage fourni par le propriétaire du projet. Ta demande devra être approuvée avant que tu puisses y accéder.
            </p>

            {followMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 4, marginBottom: 14, fontSize: 13,
                background: followMsg.type === 'success' ? '#5a8f6e22' : '#9b4d4d22',
                border: `1px solid ${followMsg.type === 'success' ? '#5a8f6e44' : '#9b4d4d44'}`,
                color: followMsg.type === 'success' ? '#8ec8a0' : '#e88',
              }}>
                {followMsg.text}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ ...sLbl, color: T.ac }}>Code de partage</label>
              <input
                style={{ ...sInp, fontSize: 22, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', textAlign: 'center' }}
                value={followCode}
                onChange={e => { setFollowCode(e.target.value.toUpperCase()); setFollowMsg(null); }}
                onKeyDown={e => { if (e.key === 'Enter') handleFollowSubmit(); }}
                placeholder="A3F7KQ"
                maxLength={6}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...sBtnA, padding: '9px 20px', opacity: followLoading || !followCode.trim() ? 0.6 : 1 }}
                onClick={handleFollowSubmit}
                disabled={followLoading || !followCode.trim()}
              >
                {followLoading ? 'Envoi…' : 'Envoyer la demande'}
              </button>
              <button style={sBtn} onClick={closeFollowModal}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}
