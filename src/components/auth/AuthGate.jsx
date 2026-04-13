import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { auth, ADMIN_EMAIL } from '../../lib/firebase';
import { getUserStatus, createPendingUser, createUserProfile } from '../../lib/firestore';
import { T, sCard, sInp, sBtnA, sBtn } from '../../styles/theme';

export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [userStatus, setUserStatus] = useState(null); // 'pending' | 'approved' | 'rejected' | null
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        if (u.email === ADMIN_EMAIL) {
          setUserStatus('approved');
        } else {
          const statusData = await getUserStatus(u.uid);
          if (statusData) {
            setUserStatus(statusData.status);
          } else {
            // Nouvel utilisateur → créer statut pending + profil avec pseudo auto
            await Promise.all([createPendingUser(u.uid, u.email), createUserProfile(u.uid)]);
            setUserStatus('pending');
          }
        }
      } else {
        setUserStatus(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Chargement initial ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: T.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: T.tx, fontFamily: "'Cormorant Garamond',serif" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌍</div>
          <div style={{ fontSize: 14, color: T.mu, letterSpacing: 2 }}>Chargement…</div>
        </div>
      </div>
    );
  }

  // ── Utilisateur connecté et approuvé → application ────────────────────

  if (user && userStatus === 'approved') return <>{children}</>;

  // ── Compte en attente d'approbation ───────────────────────────────────

  if (user && userStatus === 'pending') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg,${T.bg} 0%,#12110f 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: "'Cormorant Garamond',serif",
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⏳</div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: T.ac,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Compte en attente
            </h1>
          </div>
          <div style={{ ...sCard, cursor: 'default', padding: 28, textAlign: 'center' }}>
            <p style={{ color: T.tx, fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
              Ton compte (<strong>{user.email}</strong>) est en attente de validation par
              l'administrateur.
            </p>
            <p style={{ color: T.mu, fontSize: 13, marginBottom: 24 }}>
              Tu recevras l'accès une fois ton compte approuvé. Rafraîchis la page après
              approbation.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={{ ...sBtnA, fontSize: 14 }} onClick={() => window.location.reload()}>
                Rafraîchir
              </button>
              <button style={{ ...sBtn, fontSize: 14 }} onClick={() => signOut(auth)}>
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Compte refusé ──────────────────────────────────────────────────────

  if (user && userStatus === 'rejected') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: `linear-gradient(180deg,${T.bg} 0%,#12110f 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: "'Cormorant Garamond',serif",
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🚫</div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#e88',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Accès refusé
            </h1>
          </div>
          <div style={{ ...sCard, cursor: 'default', padding: 28, textAlign: 'center' }}>
            <p style={{ color: T.tx, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Ta demande d'accès a été refusée par l'administrateur.
            </p>
            <button style={{ ...sBtn, fontSize: 14 }} onClick={() => signOut(auth)}>
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaires de connexion / inscription / reset ─────────────────────

  const handleLogin = () => {
    setError('');
    signInWithEmailAndPassword(auth, email, password).catch(e => {
      setError(
        e.code === 'auth/invalid-credential' ? 'Email ou mot de passe incorrect' : e.message,
      );
    });
  };

  const handleSignup = async () => {
    setError('');
    if (password !== confirm) {
      setError('Mots de passe différents');
      return;
    }
    if (password.length < 6) {
      setError('Min 6 caractères');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Le statut pending est créé automatiquement dans onAuthStateChanged
    } catch (e) {
      setError(e.code === 'auth/email-already-in-use' ? 'Email déjà utilisé' : e.message);
    }
  };

  const handleReset = () => {
    setError('');
    setMsg('');
    sendPasswordResetEmail(auth, email)
      .then(() => setMsg('Email envoyé !'))
      .catch(e => setError(e.message));
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      if (screen === 'login') handleLogin();
      else if (screen === 'signup') handleSignup();
      else handleReset();
    }
  };

  const linkStyle = {
    color: T.ac,
    cursor: 'pointer',
    fontSize: 13,
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg,${T.bg} 0%,#12110f 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: "'Cormorant Garamond',serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌍</div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: T.ac,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            World Builder
          </h1>
          <p style={{ color: T.mu, fontSize: 14 }}>Wiki de World-Building</p>
        </div>

        {/* Carte de formulaire */}
        <div style={{ ...sCard, cursor: 'default', padding: 28 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: T.tx,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            {screen === 'login'
              ? 'Connexion'
              : screen === 'signup'
                ? 'Créer un compte'
                : 'Mot de passe oublié'}
          </h2>

          {error && (
            <div
              style={{
                background: '#9b4d4d22',
                border: '1px solid #9b4d4d44',
                borderRadius: 4,
                padding: '8px 12px',
                marginBottom: 12,
                color: '#e88',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          {msg && (
            <div
              style={{
                background: '#5a8f6e22',
                border: '1px solid #5a8f6e44',
                borderRadius: 4,
                padding: '8px 12px',
                marginBottom: 12,
                color: '#8ec8a0',
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          )}

          <input
            style={{ ...sInp, marginBottom: 12, fontSize: 16 }}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email"
            autoFocus
          />

          {screen !== 'reset' && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                style={{ ...sInp, fontSize: 16, paddingRight: 36 }}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: T.mu,
                  fontSize: 16,
                  padding: 0,
                  lineHeight: 1,
                }}
                title={showPwd ? 'Masquer' : 'Afficher'}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          )}
          {screen === 'signup' && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                style={{ ...sInp, fontSize: 16, paddingRight: 36 }}
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Confirmer"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: T.mu,
                  fontSize: 16,
                  padding: 0,
                  lineHeight: 1,
                }}
                title={showConfirm ? 'Masquer' : 'Afficher'}
              >
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
          )}

          {screen === 'signup' && (
            <p style={{ fontSize: 12, color: T.mu, marginBottom: 12, lineHeight: 1.5 }}>
              Ton compte sera soumis à validation par l'administrateur avant de pouvoir accéder à
              l'application.
            </p>
          )}

          <button
            style={{ ...sBtnA, width: '100%', fontSize: 16, padding: '12px 20px', marginTop: 4 }}
            onClick={
              screen === 'login' ? handleLogin : screen === 'signup' ? handleSignup : handleReset
            }
          >
            {screen === 'login'
              ? 'Se connecter'
              : screen === 'signup'
                ? 'Envoyer la demande'
                : 'Envoyer'}
          </button>

          <div
            style={{
              marginTop: 16,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {screen === 'login' && (
              <>
                <button
                  style={linkStyle}
                  onClick={() => {
                    setScreen('signup');
                    setError('');
                  }}
                >
                  Créer un compte
                </button>
                <button
                  style={linkStyle}
                  onClick={() => {
                    setScreen('reset');
                    setError('');
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </>
            )}
            {screen === 'signup' && (
              <button
                style={linkStyle}
                onClick={() => {
                  setScreen('login');
                  setError('');
                }}
              >
                Se connecter
              </button>
            )}
            {screen === 'reset' && (
              <button
                style={linkStyle}
                onClick={() => {
                  setScreen('login');
                  setError('');
                }}
              >
                Retour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
