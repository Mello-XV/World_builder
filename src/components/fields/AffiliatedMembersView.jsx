/**
 * AffiliatedMembersView — liste des personnages affiliés à une nation/org/religion.
 *
 * Affiché en lecture sur les fiches nation, organisation, religion.
 * Remonte tous les personnages dont le champ "affiliations" contient cet id.
 */

import { useMemo } from 'react';
import { T } from '../../styles/theme';

export function AffiliatedMembersView({ entryId, entries, onNav }) {
  const members = useMemo(
    () =>
      Object.values(entries).filter(e => {
        if (e.category !== 'personnage') return false;
        const aff = e.fields?.affiliations;
        if (!Array.isArray(aff)) return false;
        return aff.includes(entryId) || aff.includes(String(entryId));
      }),
    [entries, entryId],
  );

  if (!members.length) {
    return <div style={{ color: T.mu, fontSize: 14 }}>Aucun personnage affilié.</div>;
  }

  return (
    <div>
      {members.map(m => (
        <div key={m.id} style={{ padding: '6px 0', borderBottom: `1px solid ${T.bd}22` }}>
          <span
            onClick={() => onNav(m.id)}
            style={{
              color: T.ac,
              cursor: 'pointer',
              borderBottom: '1px dotted ' + T.ac,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {'👤 ' + m.name}
          </span>
        </div>
      ))}
    </div>
  );
}
