/**
 * AffiliatedPlacesView — liste des lieux affiliés à une nation.
 *
 * Affiché en lecture sur les fiches nation.
 * Remonte tous les lieux dont le champ "nation" contient l'id de cette nation.
 */

import { useMemo } from 'react';
import { T } from '../../styles/theme';

export function AffiliatedPlacesView({ entryId, entries, onNav }) {
  const places = useMemo(
    () =>
      Object.values(entries).filter(e => {
        if (e.category !== 'lieu') return false;
        const nationId = e.fields?.nation;
        return nationId === String(entryId) || nationId === entryId;
      }),
    [entries, entryId],
  );

  if (!places.length) {
    return <div style={{ color: T.mu, fontSize: 14 }}>Aucun lieu affilié.</div>;
  }

  return (
    <div>
      {places.map(p => (
        <div key={p.id} style={{ padding: '6px 0', borderBottom: `1px solid ${T.bd}22` }}>
          <span
            onClick={() => onNav(p.id)}
            style={{
              color: T.ac,
              cursor: 'pointer',
              borderBottom: '1px dotted ' + T.ac,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {'🗺️ ' + p.name}
          </span>
        </div>
      ))}
    </div>
  );
}
