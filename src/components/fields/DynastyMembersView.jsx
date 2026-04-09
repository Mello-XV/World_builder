/**
 * DynastyMembersView — liste des membres d'une dynastie.
 *
 * Affiché en lecture sur la fiche d'une dynastieFamiliale.
 * Remonte tous les personnages dont le champ "dynastieFamiliale" contient cet id.
 * Permet d'assigner un rôle (Chef, Héritier, Membre...) à chaque membre.
 */

import { useMemo } from 'react';
import { DYNASTY_STATUTS } from '../../constants/options';
import { T, sSel } from '../../styles/theme';

export function DynastyMembersView({ dynastyId, entries, onNav, memberRoles, onRoleChange }) {
  const members = useMemo(
    () =>
      Object.values(entries).filter(e => {
        if (e.category !== 'personnage') return false;
        const df = e.fields?.dynastieFamiliale;
        if (Array.isArray(df)) return df.includes(String(dynastyId));
        return String(df) === String(dynastyId);
      }),
    [entries, dynastyId],
  );

  if (!members.length) {
    return <div style={{ color: T.mu, fontSize: 14 }}>Aucun personnage rattaché.</div>;
  }

  const roles = memberRoles || {};

  return (
    <div>
      {members.map(m => (
        <div
          key={m.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 0',
            borderBottom: `1px solid ${T.bd}22`,
            flexWrap: 'wrap',
          }}
        >
          <span
            onClick={() => onNav(m.id)}
            style={{
              color: T.ac,
              cursor: 'pointer',
              borderBottom: '1px dotted ' + T.ac,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {'👤 ' + m.name}
          </span>
          <select
            style={{ ...sSel, width: 'auto', minWidth: 160, fontSize: 12, padding: '4px 24px 4px 8px' }}
            value={roles[m.id] || ''}
            onChange={ev => {
              if (onRoleChange) onRoleChange(m.id, ev.target.value);
            }}
          >
            <option value="">— Rôle —</option>
            {DYNASTY_STATUTS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
