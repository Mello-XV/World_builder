/**
 * ProfileScreen — page profil utilisateur (overlay plein écran).
 *
 * Sections :
 * - Pseudo (modifiable)
 * - Email (modifiable avec confirmation de mot de passe)
 * - Mot de passe (modifiable)
 * - Mes projets (avec code de partage)
 * - Demandes de suivi reçues (approuver / refuser)
 * - Projets suivis (lecture seule, cliquables)
 */

import { useState, useEffect } from 'react';
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  setUserProfile,
  getOrCreateShareCode,
  getFollowRequestsForOwner,
  respondToFollowRequest,
} from '../lib/firestore';
import { T, sCard, sInp, sLbl, sBtnA, sBtn, sBs } from '../styles/theme';

// ── Champ mot de passe avec icône visible/caché ───────────────────────────

function PasswordInput({ value, onChange, placeholder, style }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ ...sInp, paddingRight: 36, ...style }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.mu, fontSize: 14, padding: 0 }}
        title={visible ? 'Masquer' : 'Afficher'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
}

// ── Section avec titre ────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ ...sCard, cursor: 'default', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────

export function ProfileScreen({
  user, userProfile, onClose, onProfileUpdate,
  projects, followedProjects = [],
  onProjectOpen, onFollowedProjectOpen,
}) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [nameSaved, setNameSaved] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(user.email || '');
  const [emailPassword, setEmailPassword] = useState('');

  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  // Codes de partage par projet (état local)
  const [shareCodes, setShareCodes] = useState({}); // { [projectId]: code | 'loading' }
  const [copiedId, setCopiedId] = useState(null);

  // Demandes de suivi reçues
  const [followRequests, setFollowRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  useEffect(() => {
    getFollowRequestsForOwner(user.uid).then(reqs => {
      setFollowRequests(reqs);
      setRequestsLoading(false);
    });
  }, [user.uid]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  // ── Pseudo ──────────────────────────────────────────────────────────────

  const handleSaveName = async () => {
    const name = displayName.trim();
    if (!name) return;
    await setUserProfile(user.uid, { displayName: name });
    onProfileUpdate({ ...userProfile, displayName: name });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  // ── Email ───────────────────────────────────────────────────────────────

  const handleSaveEmail = async () => {
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateEmail(auth.currentUser, email.trim());
      flash('success', 'Email mis à jour');
      setEditingEmail(false);
      setEmailPassword('');
    } catch (e) {
      flash('error',
        e.code === 'auth/wrong-password' ? 'Mot de passe incorrect' :
        e.code === 'auth/requires-recent-login' ? 'Reconnectez-vous puis réessayez' :
        e.message
      );
    }
  };

  // ── Mot de passe ────────────────────────────────────────────────────────

  const handleSavePassword = async () => {
    if (newPwd !== confirmPwd) { flash('error', 'Les mots de passe ne correspondent pas'); return; }
    if (newPwd.length < 6) { flash('error', 'Minimum 6 caractères'); return; }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPwd);
      flash('success', 'Mot de passe modifié');
      setEditingPassword(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      flash('error',
        e.code === 'auth/wrong-password' ? 'Mot de passe actuel incorrect' :
        e.code === 'auth/requires-recent-login' ? 'Reconnectez-vous puis réessayez' :
        e.message
      );
    }
  };

  // ── Code de partage ─────────────────────────────────────────────────────

  const handleGetShareCode = async (projectId) => {
    setShareCodes(prev => ({ ...prev, [projectId]: 'loading' }));
    const code = await getOrCreateShareCode(projectId);
    setShareCodes(prev => ({ ...prev, [projectId]: code || 'Erreur' }));
    if (code) {
      navigator.clipboard?.writeText(code).catch(() => {});
      setCopiedId(projectId);
      setTimeout(() => setCopiedId(c => c === projectId ? null : c), 2500);
    }
  };

  // ── Demandes de suivi ───────────────────────────────────────────────────

  const handleRespond = async (req, approve) => {
    await respondToFollowRequest(req.id, approve, req);
    setFollowRequests(prev =>
      prev.map(r => r.id === req.id ? { ...r, status: approve ? 'approved' : 'rejected' } : r)
    );
  };

  const pendingRequests = followRequests.filter(r => r.status === 'pending');
  const pastRequests = followRequests.filter(r => r.status !== 'pending');

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: T.bg, overflowY: 'auto', fontFamily: "'Cormorant Garamond', serif" }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '30px 20px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button style={{ ...sBtn, padding: '6px 12px' }} onClick={onClose}>← Retour</button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ac, letterSpacing: 1.5, textTransform: 'uppercase', flex: 1 }}>
            Profil
          </h1>
          <button style={{ ...sBs, color: '#9b4d4d', borderColor: '#9b4d4d44' }} onClick={() => signOut(auth)}>
            🚪 Déconnexion
          </button>
        </div>

        {/* Message flash */}
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13,
            background: msg.type === 'success' ? '#5a8f6e22' : '#9b4d4d22',
            border: `1px solid ${msg.type === 'success' ? '#5a8f6e44' : '#9b4d4d44'}`,
            color: msg.type === 'success' ? '#8ec8a0' : '#e88',
          }}>
            {msg.text}
          </div>
        )}

        {/* ── Pseudo ── */}
        <Section title="Pseudo">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...sLbl, color: T.mu }}>Pseudo visible par les autres utilisateurs</label>
              <input
                style={sInp}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Votre pseudo"
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              />
            </div>
            <button style={{ ...sBtnA, padding: '8px 16px', minWidth: 80 }} onClick={handleSaveName}>
              {nameSaved ? '✓ Sauvé' : 'Sauvegarder'}
            </button>
          </div>
        </Section>

        {/* ── Email ── */}
        <Section title="Adresse e-mail">
          {!editingEmail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 15, color: T.tx }}>{user.email}</span>
              <button style={sBs} onClick={() => setEditingEmail(true)}>Modifier</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ ...sLbl, color: T.mu }}>Nouvelle adresse e-mail</label>
                <input style={sInp} type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              <div>
                <label style={{ ...sLbl, color: T.mu }}>Mot de passe actuel (confirmation)</label>
                <PasswordInput value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="Mot de passe actuel" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...sBtnA, padding: '7px 16px' }} onClick={handleSaveEmail}>Confirmer</button>
                <button style={sBtn} onClick={() => { setEditingEmail(false); setEmail(user.email); setEmailPassword(''); }}>Annuler</button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Mot de passe ── */}
        <Section title="Mot de passe">
          {!editingPassword ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 15, color: T.mu, letterSpacing: 4 }}>••••••••</span>
              <button style={sBs} onClick={() => setEditingPassword(true)}>Modifier</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ ...sLbl, color: T.mu }}>Mot de passe actuel</label>
                <PasswordInput value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Mot de passe actuel" />
              </div>
              <div>
                <label style={{ ...sLbl, color: T.mu }}>Nouveau mot de passe</label>
                <PasswordInput value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nouveau (min 6 caractères)" />
              </div>
              <div>
                <label style={{ ...sLbl, color: T.mu }}>Confirmer</label>
                <PasswordInput value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirmer le nouveau" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...sBtnA, padding: '7px 16px' }} onClick={handleSavePassword}>Confirmer</button>
                <button style={sBtn} onClick={() => { setEditingPassword(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }}>Annuler</button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Mes projets ── */}
        <Section title="Mes projets">
          {projects.length === 0 ? (
            <p style={{ color: T.mu, fontSize: 14 }}>Aucun projet créé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {projects.map(p => {
                const code = shareCodes[p.id];
                const copied = copiedId === p.id;
                return (
                  <div key={p.id} style={{ background: T.bgI, borderRadius: 5, border: `1px solid ${T.bd}`, overflow: 'hidden' }}>
                    {/* Ligne projet */}
                    <div
                      onClick={() => { onProjectOpen && onProjectOpen(p, null); onClose(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: onProjectOpen ? 'pointer' : 'default' }}
                      onMouseEnter={e => { if (onProjectOpen) e.currentTarget.style.background = T.bgH; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                      {p.description && <span style={{ fontSize: 12, color: T.mu }}>{p.description}</span>}
                      {onProjectOpen && <span style={{ fontSize: 12, color: T.dm }}>→</span>}
                    </div>
                    {/* Ligne code de partage */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderTop: `1px solid ${T.bd}` }}>
                      <span style={{ fontSize: 11, color: T.dm }}>Code de partage :</span>
                      {!code ? (
                        <button
                          onClick={() => handleGetShareCode(p.id)}
                          style={{ fontSize: 11, background: 'none', border: `1px solid ${T.bd}`, color: T.mu, borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Générer
                        </button>
                      ) : code === 'loading' ? (
                        <span style={{ fontSize: 12, color: T.dm }}>…</span>
                      ) : (
                        <>
                          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: 3, color: T.ac }}>{code}</span>
                          <button
                            onClick={() => handleGetShareCode(p.id)}
                            style={{ fontSize: 11, background: 'none', border: `1px solid ${T.bd}`, color: copied ? '#8ec8a0' : T.mu, borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            {copied ? '✓ Copié' : '📋 Copier'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Demandes de suivi reçues ── */}
        <Section title={`Demandes de suivi${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`}>
          {requestsLoading ? (
            <p style={{ color: T.dm, fontSize: 13 }}>Chargement…</p>
          ) : followRequests.length === 0 ? (
            <p style={{ color: T.dm, fontSize: 13, fontStyle: 'italic' }}>Aucune demande reçue.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: T.bgI, borderRadius: 5, border: `1px solid ${T.ac}44` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.tx }}>{req.fromDisplayName}</span>
                    <span style={{ fontSize: 12, color: T.mu }}> veut accéder à </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ac }}>{req.projectName}</span>
                  </div>
                  <button
                    onClick={() => handleRespond(req, true)}
                    style={{ fontSize: 12, background: '#5a8f6e22', border: '1px solid #5a8f6e44', color: '#8ec8a0', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ✓ Approuver
                  </button>
                  <button
                    onClick={() => handleRespond(req, false)}
                    style={{ fontSize: 12, background: '#9b4d4d22', border: '1px solid #9b4d4d44', color: '#e88', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    ✕ Refuser
                  </button>
                </div>
              ))}
              {pastRequests.length > 0 && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontSize: 12, color: T.dm, cursor: 'pointer' }}>
                    Historique ({pastRequests.length})
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {pastRequests.map(req => (
                      <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: T.bgI, borderRadius: 4, border: `1px solid ${T.bd}` }}>
                        <span style={{ flex: 1, fontSize: 12, color: T.mu }}>
                          {req.fromDisplayName} → {req.projectName}
                        </span>
                        <span style={{ fontSize: 11, color: req.status === 'approved' ? '#8ec8a0' : '#e88' }}>
                          {req.status === 'approved' ? '✓ Approuvé' : '✕ Refusé'}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </Section>

        {/* ── Projets suivis ── */}
        <Section title="Projets suivis">
          {followedProjects.length === 0 ? (
            <p style={{ color: T.dm, fontSize: 13, fontStyle: 'italic' }}>
              Aucun projet suivi — utilise le bouton "🔗 Suivre un projet" sur l'écran d'accueil.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {followedProjects.map(fp => (
                <div
                  key={fp.projectId}
                  onClick={() => { onFollowedProjectOpen && onFollowedProjectOpen(fp.ownerUid, fp.projectId, fp.projectName); onClose(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: T.bgI, borderRadius: 5, border: `1px solid ${T.bd}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.mu; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.bd; }}
                >
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{fp.projectName}</span>
                  <span style={{ fontSize: 11, color: T.dm }}>👁 Lecture seule</span>
                  <span style={{ fontSize: 12, color: T.dm }}>→</span>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}
