/**
 * ProfileScreen — page profil utilisateur (overlay plein écran).
 *
 * Permet de modifier le pseudo, l'email et le mot de passe.
 * Affiche les sections : Mes projets / Projets suivis / Demandes de suivi.
 */

import { useState } from 'react';
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { setUserProfile } from '../lib/firestore';
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
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.mu, fontSize: 14, padding: 0,
        }}
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

export function ProfileScreen({ user, userProfile, onClose, onProfileUpdate, projects, onProjectOpen }) {
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

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: T.bg, overflowY: 'auto',
        fontFamily: "'Cormorant Garamond', serif",
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '30px 20px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button style={{ ...sBtn, padding: '6px 12px' }} onClick={onClose}>← Retour</button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ac, letterSpacing: 1.5, textTransform: 'uppercase', flex: 1 }}>
            Profil
          </h1>
          <button
            style={{ ...sBs, color: '#9b4d4d', borderColor: '#9b4d4d44' }}
            onClick={() => signOut(auth)}
          >
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
            <button
              style={{ ...sBtnA, padding: '8px 16px', minWidth: 80 }}
              onClick={handleSaveName}
            >
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
                <input
                  style={sInp}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ ...sLbl, color: T.mu }}>Mot de passe actuel (confirmation)</label>
                <PasswordInput
                  value={emailPassword}
                  onChange={e => setEmailPassword(e.target.value)}
                  placeholder="Mot de passe actuel"
                />
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
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => { onProjectOpen && onProjectOpen(p, null); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: T.bgI, borderRadius: 5,
                    border: `1px solid ${T.bd}`,
                    cursor: onProjectOpen ? 'pointer' : 'default',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (onProjectOpen) e.currentTarget.style.borderColor = T.ac + '88'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.bd; }}
                >
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                  {p.description && <span style={{ fontSize: 12, color: T.mu }}>{p.description}</span>}
                  {onProjectOpen && <span style={{ fontSize: 12, color: T.dm }}>→</span>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Projets suivis (à venir) ── */}
        <Section title="Projets suivis">
          <p style={{ color: T.dm, fontSize: 13, fontStyle: 'italic' }}>
            Fonctionnalité à venir — vous pourrez visualiser les projets d'autres utilisateurs auxquels vous avez accès.
          </p>
        </Section>

        {/* ── Demandes de suivi (à venir) ── */}
        <Section title="Demandes de suivi">
          <p style={{ color: T.dm, fontSize: 13, fontStyle: 'italic' }}>
            Fonctionnalité à venir — vous verrez ici les demandes d'accès à vos projets.
          </p>
        </Section>

      </div>
    </div>
  );
}
