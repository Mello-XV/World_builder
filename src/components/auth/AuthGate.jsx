/**
 * AuthGate — protection de l'application par authentification.
 *
 * Affiche l'écran de connexion si l'utilisateur n'est pas connecté.
 * Une fois connecté, affiche les enfants (l'application principale).
 *
 * Trois écrans :
 * - "login"  : connexion avec email + mot de passe
 * - "signup" : création de compte
 * - "reset"  : réinitialisation du mot de passe
 */

import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { T, sCard, sInp, sBtnA } from '../../styles/theme';

export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Écoute les changements d'état de connexion Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

  // Utilisateur connecté → affiche l'application
  if (user) return <>{children}</>;

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleLogin = () => {
    setError('');
    signInWithEmailAndPassword(auth, email, password).catch(e => {
      setError(
        e.code === 'auth/invalid-credential' ? 'Email ou mot de passe incorrect' : e.message,
      );
    });
  };

  const handleSignup = () => {
    setError('');
    if (password !== confirm) {
      setError('Mots de passe différents');
      return;
    }
    if (password.length < 6) {
      setError('Min 6 caractères');
      return;
    }
    createUserWithEmailAndPassword(auth, email, password).catch(e => {
      setError(e.code === 'auth/email-already-in-use' ? 'Email déjà utilisé' : e.message);
    });
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

  // ── Écran de connexion ────────────────────────────────────────────────

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
            style={{ fontSize: 18, fontWeight: 700, color: T.tx, marginBottom: 20, textAlign: 'center' }}
          >
            {screen === 'login' ? 'Connexion' : screen === 'signup' ? 'Créer un compte' : 'Mot de passe oublié'}
          </h2>

          {/* Message d'erreur */}
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

          {/* Message de succès */}
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
            <input
              style={{ ...sInp, marginBottom: 12, fontSize: 16 }}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mot de passe"
            />
          )}

          {screen === 'signup' && (
            <input
              style={{ ...sInp, marginBottom: 12, fontSize: 16 }}
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Confirmer"
            />
          )}

          <button
            style={{ ...sBtnA, width: '100%', fontSize: 16, padding: '12px 20px', marginTop: 4 }}
            onClick={screen === 'login' ? handleLogin : screen === 'signup' ? handleSignup : handleReset}
          >
            {screen === 'login' ? 'Se connecter' : screen === 'signup' ? 'Créer mon compte' : 'Envoyer'}
          </button>

          {/* Liens de navigation entre écrans */}
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
