/**
 * EntryList — liste des fiches d'une catégorie.
 *
 * Tri alphabétique avec séparateurs de lettre.
 * Cas spécial pour les "Récits" : tri par type (Intrigue, Tome, Axe) puis numéro.
 * Recherche en temps réel.
 */

import { CATEGORIES } from '../../constants/categories';
import { T, sInp, sBtn, sBtnA, sBs, hov } from '../../styles/theme';

export function EntryList({ category, entries, onNav, onNew, onDelete, onBack, search, onSearch }) {
  const cat = CATEGORIES[category];

  let items = Object.values(entries).filter(e => e.category === category);

  // ── Tri spécial pour les récits ──────────────────────────────────────
  if (category === 'recit') {
    const order = { Intrigue: 0, Tome: 1, 'Axe de réflexion': 2 };
    items.sort((a, b) => {
      const oa = order[a.fields?.typeRecit] ?? 1;
      const ob = order[b.fields?.typeRecit] ?? 1;
      if (oa !== ob) return oa - ob;
      if (a.fields?.typeRecit === 'Tome') {
        const na = parseInt(a.fields?.numeroTome) || 999;
        const nb = parseInt(b.fields?.numeroTome) || 999;
        return na - nb;
      }
      return a.name.localeCompare(b.name, 'fr');
    });
  } else {
    items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  if (search.trim()) {
    items = items.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  }

  // ── En-tête commun ───────────────────────────────────────────────────
  const Header = (
    <>
      <div
        style={{
          padding: '20px 0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <button style={{ ...sBtn, padding: '6px 12px' }} onClick={onBack}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: cat.color }}>
            {cat.icon + ' ' + cat.label} ({items.length})
          </h2>
        </div>
        <button style={sBtnA} onClick={onNew}>
          + Nouvelle fiche
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          style={{ ...sInp, fontSize: 14 }}
          value={search}
          onChange={ev => onSearch(ev.target.value)}
          placeholder={`Rechercher dans ${cat.label}…`}
        />
      </div>
    </>
  );

  // ── Layout spécial : Récits groupés par type ─────────────────────────
  if (category === 'recit') {
    const groups = { Intrigue: [], Tome: [], 'Axe de réflexion': [] };
    items.forEach(e => {
      const t = e.fields?.typeRecit || 'Axe de réflexion';
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    });

    return (
      <>
        {Header}
        {['Intrigue', 'Tome', 'Axe de réflexion'].map(
          type =>
            groups[type].length > 0 && (
              <div key={type}>
                <div
                  style={{
                    padding: '8px 16px',
                    background: T.bgI,
                    fontSize: 16,
                    fontWeight: 700,
                    color: T.ac,
                    letterSpacing: 2,
                  }}
                >
                  {type}
                </div>
                {groups[type].map(e => (
                  <div
                    key={e.id}
                    style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${T.bd}` }}
                  >
                    <div
                      onClick={() => onNav(e.id)}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                      onMouseEnter={ev => hov(ev, true)}
                      onMouseLeave={ev => hov(ev, false)}
                    >
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {e.fields?.typeRecit === 'Tome'
                          ? `Tome ${e.fields?.numeroTome || '?'} — ${e.name}`
                          : e.name}
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(e)}
                      style={{ ...sBs, color: '#9b4d4d', borderColor: '#9b4d4d44', padding: '4px 8px', marginRight: 10 }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            ),
        )}
      </>
    );
  }

  // ── Layout standard : groupé par lettre ─────────────────────────────
  if (!items.length) {
    return (
      <>
        {Header}
        <div style={{ padding: 40, textAlign: 'center', color: T.mu }}>
          {cat.icon} {search ? 'Aucun résultat' : 'Aucune fiche.'}
          {!search && (
            <>
              <br />
              <button style={{ ...sBtnA, marginTop: 12 }} onClick={onNew}>
                Créer
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  const grouped = {};
  items.forEach(e => {
    const letter = (e.name[0] || '#').toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(e);
  });
  const letters = Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <>
      {Header}
      <div style={{ borderTop: `1px solid ${T.bd}` }}>
        {letters.map(letter => (
          <div key={letter}>
            <div
              style={{
                padding: '8px 16px',
                background: T.bgI,
                fontSize: 16,
                fontWeight: 700,
                color: T.ac,
                letterSpacing: 2,
              }}
            >
              {letter}
            </div>
            {grouped[letter].map(e => (
              <div
                key={e.id}
                style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${T.bd}` }}
              >
                <div
                  onClick={() => onNav(e.id)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={ev => hov(ev, true)}
                  onMouseLeave={ev => hov(ev, false)}
                >
                  {e.photo && (
                    <img
                      src={e.photo}
                      style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }}
                      alt=""
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</div>
                    {e.description && (
                      <div style={{ fontSize: 12, color: T.mu }}>{e.description.slice(0, 60)}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(e)}
                  style={{ ...sBs, color: '#9b4d4d', borderColor: '#9b4d4d44', padding: '4px 8px', marginRight: 10 }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
