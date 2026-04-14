/**
 * DashboardScreen — tableau de bord d'un projet.
 *
 * Affiche :
 * - La grille de toutes les catégories (avec le nombre de fiches)
 * - Un bouton rapide de création par catégorie
 * - Les fiches récemment modifiées
 */

import { CATEGORIES, CAT_ORDER } from '../constants/categories';
import { T, sCard, sBtnA, sBtn, hov } from '../styles/theme';
import { useIsMobile } from '../lib/useIsMobile';

export function DashboardScreen({ data, onOpenCategory, onNewEntry, onNav }) {
  const isMobile = useIsMobile();
  const total = Object.keys(data.entries).length;
  const recent = Object.values(data.entries)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 6);

  const countByCategory = category =>
    Object.values(data.entries).filter(e => e.category === category).length;

  return (
    <>
      {/* Nombre total de fiches */}
      <div style={{ padding: '20px 0 16px' }}>
        <div style={{ fontSize: 13, color: T.mu }}>
          {total} fiche{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Grille des catégories */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? '90px' : '140px'},1fr))`,
          gap: 8,
          marginBottom: 24,
        }}
      >
        {CAT_ORDER.map(key => {
          const cat = CATEGORIES[key];
          return (
            <div
              key={key}
              style={{ ...sCard, padding: 12, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              onClick={() => onOpenCategory(key)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = cat.color;
                e.currentTarget.style.background = T.bgH;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = T.bd;
                e.currentTarget.style.background = T.bgC;
              }}
            >
              {/* Barre colorée en haut */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: cat.color,
                  opacity: 0.5,
                }}
              />
              <div style={{ fontSize: 18, marginBottom: 2 }}>{cat.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: T.dm }}>{countByCategory(key)}</div>
            </div>
          );
        })}
      </div>

      {/* Création rapide */}
      <div
        style={{
          ...sCard,
          cursor: 'default',
          marginBottom: 24,
          textAlign: 'center',
          borderStyle: 'dashed',
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Créer une fiche</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {CAT_ORDER.map(key => {
            const cat = CATEGORIES[key];
            return (
              <button
                key={key}
                style={{
                  ...sBtn,
                  fontSize: 11,
                  padding: '4px 8px',
                  borderColor: cat.color + '44',
                  color: cat.color,
                }}
                onClick={() => onNewEntry(key)}
              >
                {cat.icon} {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fiches récentes */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 11,
              color: T.dm,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Récents
          </div>
          {recent.map(e => {
            const cat = CATEGORIES[e.category];
            return (
              <div
                key={e.id}
                onClick={() => onNav(e.id)}
                style={{
                  padding: '10px 14px',
                  borderBottom: `1px solid ${T.bd}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                onMouseEnter={ev => hov(ev, true)}
                onMouseLeave={ev => hov(ev, false)}
              >
                <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                  <span
                    style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      padding: '3px 10px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: cat?.color,
                      background: cat?.color + '18',
                    }}
                  >
                    {cat?.label}
                  </span>
                </div>
                {e.updatedAt && (
                  <span style={{ fontSize: 11, color: T.dm }}>
                    {new Date(e.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bouton créer si aucune fiche */}
      {total === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: T.mu }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ marginBottom: 20 }}>Aucune fiche pour l'instant.</p>
          <button style={sBtnA} onClick={() => onNewEntry('personnage')}>
            Créer mon premier personnage
          </button>
        </div>
      )}
    </>
  );
}
