import { useState, useEffect } from 'react';
import { getAllUserStatuses, updateUserStatus } from '../../lib/firestore';
import { T, sCard, sBtn, sBs } from '../../styles/theme';

export function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = async () => {
    setLoading(true);
    const all = await getAllUserStatuses();
    setUsers(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handle = async (uid, status) => {
    await updateUserStatus(uid, status);
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status, reviewedAt: Date.now() } : u));
  };

  const counts = {
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter);

  const statusStyle = status => ({
    fontSize: 11, padding: '2px 8px', borderRadius: 3,
    background: status === 'approved' ? '#5a8f6e22' : status === 'rejected' ? '#9b4d4d22' : '#c9a84c22',
    color: status === 'approved' ? '#8ec8a0' : status === 'rejected' ? '#e88' : T.ac,
    border: `1px solid ${status === 'approved' ? '#5a8f6e44' : status === 'rejected' ? '#9b4d4d44' : T.ac + '44'}`,
  });

  const statusLabel = s => s === 'approved' ? 'Approuvé' : s === 'rejected' ? 'Refusé' : 'En attente';

  const TABS = [
    { key: 'pending', label: 'En attente', count: counts.pending },
    { key: 'approved', label: 'Approuvés', count: counts.approved },
    { key: 'rejected', label: 'Refusés', count: counts.rejected },
    { key: 'all', label: 'Tous', count: users.length },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000099',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        ...sCard, cursor: 'default', width: '100%', maxWidth: 620,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16,
        padding: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: T.ac }}>Gestion des accès</h2>
            <div style={{ fontSize: 12, color: T.mu, marginTop: 2 }}>
              {counts.pending > 0
                ? `${counts.pending} demande${counts.pending > 1 ? 's' : ''} en attente`
                : 'Aucune demande en attente'}
            </div>
          </div>
          <button onClick={onClose} style={{ ...sBtn, padding: '4px 10px' }}>✕</button>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              ...sBs,
              background: filter === t.key ? T.ac : 'transparent',
              color: filter === t.key ? '#0f0e0d' : T.mu,
              borderColor: filter === t.key ? T.ac : T.bd,
            }}>
              {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
            </button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: T.mu, padding: 32 }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: T.mu, padding: 32 }}>Aucun utilisateur</div>
          ) : filtered.map(u => (
            <div key={u.uid} style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '10px 14px', background: T.bgI,
              border: `1px solid ${T.bd}`, borderRadius: 6,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.tx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
                <div style={{ fontSize: 11, color: T.mu, marginTop: 2 }}>
                  Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <span style={statusStyle(u.status)}>{statusLabel(u.status)}</span>
              {u.status !== 'approved' && (
                <button onClick={() => handle(u.uid, 'approved')} style={{
                  ...sBs, color: '#8ec8a0', borderColor: '#5a8f6e44',
                }}>✓ Approuver</button>
              )}
              {u.status !== 'rejected' && (
                <button onClick={() => handle(u.uid, 'rejected')} style={{
                  ...sBs, color: '#e88', borderColor: '#9b4d4d44',
                }}>✕ Refuser</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
