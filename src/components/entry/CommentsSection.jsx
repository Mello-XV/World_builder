/**
 * CommentsSection — commentaires en temps réel sur une fiche.
 *
 * Utilise onSnapshot pour afficher les nouveaux commentaires sans rechargement.
 * Visible en mode visuel (lecture), aussi bien par le propriétaire que les followers.
 */

import { useState, useEffect } from 'react';
import { subscribeToComments, addComment, deleteComment } from '../../lib/firestore';
import { auth } from '../../lib/firebase';
import { T, sInp, sBtnA } from '../../styles/theme';

export function CommentsSection({ ownerUid, projectId, entryId, userProfile }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!ownerUid || !projectId || entryId == null) return;
    const unsub = subscribeToComments(ownerUid, projectId, entryId, setComments);
    return unsub;
  }, [ownerUid, projectId, entryId]);

  const handleSubmit = async () => {
    if (!text.trim() || !currentUser || submitting) return;
    setSubmitting(true);
    await addComment(
      ownerUid, projectId, entryId,
      currentUser.uid,
      userProfile?.displayName || currentUser.email,
      text,
    );
    setText('');
    setSubmitting(false);
  };

  const fmt = ts =>
    new Date(ts).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div style={{ marginTop: 28, marginBottom: 40, borderTop: `1px solid ${T.bd}`, paddingTop: 20 }}>
      {/* Titre */}
      <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
        💬 Commentaires {comments.length > 0 && `(${comments.length})`}
      </div>

      {/* Liste */}
      {comments.length === 0 && (
        <p style={{ color: T.dm, fontSize: 13, fontStyle: 'italic', marginBottom: 14 }}>
          Aucun commentaire pour l'instant.
        </p>
      )}
      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {comments.map(c => (
            <div
              key={c.id}
              style={{
                background: T.bgC, border: `1px solid ${T.bd}`,
                borderRadius: 6, padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.ac }}>{c.authorName}</span>
                <span style={{ fontSize: 11, color: T.dm }}>{fmt(c.createdAt)}</span>
                {currentUser && (c.authorUid === currentUser.uid || currentUser.uid === ownerUid) && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    title="Supprimer"
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      color: T.dm, cursor: 'pointer', fontSize: 16, padding: '0 4px',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: T.tx, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Saisie */}
      {currentUser && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            placeholder="Ajouter un commentaire… (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
            style={{
              ...sInp, flex: 1, minHeight: 64, resize: 'vertical',
              lineHeight: 1.5, fontSize: 14,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            style={{
              ...sBtnA, padding: '8px 16px', whiteSpace: 'nowrap',
              opacity: !text.trim() || submitting ? 0.5 : 1,
            }}
          >
            Envoyer
          </button>
        </div>
      )}
    </div>
  );
}
