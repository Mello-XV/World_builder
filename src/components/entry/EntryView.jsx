/**
 * EntryView — affichage en lecture d'une fiche.
 *
 * Mise en page :
 * - Gauche : description + champs principaux
 * - Droite : photo + informations générales + membres liés (dynasties, affiliations)
 * - Bas : backlinks (autres fiches qui mentionnent celle-ci)
 */

import { CATEGORIES } from '../../constants/categories';
import { RichText } from '../ui/RichText';
import { renderFieldView } from '../fields/FieldRenderer';
import { DynastyMembersView } from '../fields/DynastyMembersView';
import { AffiliatedMembersView } from '../fields/AffiliatedMembersView';
import { CommentsSection } from './CommentsSection';
import { T, sTg } from '../../styles/theme';

export function EntryView({ entry, entries, onNav, onUpdateEntry, ownerUid, projectId, userProfile }) {
  if (!entry) return <div>Introuvable.</div>;

  const cat = CATEGORIES[entry.category];
  const isRecit = entry.category === 'recit';

  // Appliquer l'ordre personnalisé (generalOrder / contentOrder) si présent,
  // sinon conserver l'ordre par défaut de la catégorie.
  const generalFields = (() => {
    const base = cat.fields.filter(f => f.group === 'general');
    const order = entry.generalOrder;
    if (!order) return base;
    const sorted = order.map(k => base.find(f => f.key === k)).filter(Boolean);
    const missing = base.filter(f => !order.includes(f.key));
    return [...sorted, ...missing];
  })();

  // contentItems : champs non-généraux + sections perso, dans l'ordre sauvegardé
  const contentItems = (() => {
    const baseFields = cat.fields.filter(f => f.group !== 'general');
    const sections = entry.customSections || [];
    const order = entry.contentOrder;
    if (!order) {
      return [
        ...baseFields.map(f => ({ type: 'field', field: f })),
        ...sections.map(s => ({ type: 'section', section: s })),
      ];
    }
    const sorted = order
      .map(id => {
        const field = baseFields.find(f => f.key === id);
        if (field) return { type: 'field', field };
        const section = sections.find(s => s.id === id);
        if (section) return { type: 'section', section };
        return null;
      })
      .filter(Boolean);
    const missingFields = baseFields
      .filter(f => !order.includes(f.key))
      .map(f => ({ type: 'field', field: f }));
    const missingSections = sections
      .filter(s => !order.includes(s.id))
      .map(s => ({ type: 'section', section: s }));
    return [...sorted, ...missingFields, ...missingSections];
  })();

  // Backlinks : fiches qui mentionnent cette fiche
  const backlinks = Object.values(entries).filter(x => {
    if (x.id === entry.id) return false;
    const text = [
      x.description || '',
      ...Object.values(x.fields || {}).map(v => (typeof v === 'string' ? v : JSON.stringify(v))),
    ].join(' ');
    return text.includes(`[[${entry.name}]]`) || text.includes(`[[${entry.id}:`);
  });

  // ── Layout récit (simplifié) ──────────────────────────────────────────
  if (isRecit) {
    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1.3 }}>{entry.name}</h2>
        </div>
        {contentItems.map(item => {
          if (item.type === 'field') {
            const v = entry.fields?.[item.field.key];
            if (!v) return null;
            return (
              <div key={item.field.key} style={{ marginBottom: 14, padding: '14px 18px', background: T.bgC, border: `1px solid ${T.bd}`, borderRadius: 6 }}>
                <div style={{ fontSize: 15, lineHeight: 1.7, textAlign: 'justify' }}>
                  <RichText text={v} entries={entries} onNav={onNav} />
                </div>
              </div>
            );
          }
          const s = item.section;
          if (!s.content) return null;
          return (
            <div key={s.id} style={{ marginBottom: 14, padding: '14px 18px', background: T.bgC, border: `1px solid ${T.bd}`, borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: cat.color, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, textAlign: 'justify' }}>
                <RichText text={s.content} entries={entries} onNav={onNav} />
              </div>
            </div>
          );
        })}
        {ownerUid && projectId && (
          <CommentsSection ownerUid={ownerUid} projectId={projectId} entryId={entry.id} userProfile={userProfile} />
        )}
      </>
    );
  }

  // ── Layout standard (2 colonnes) ─────────────────────────────────────
  return (
    <>
      {/* Titre + tags */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ ...sTg, color: cat.color, background: cat.color + '18' }}>
            {cat.icon + ' ' + cat.label}
          </span>
          {entry.tags &&
            entry.tags.split(',').map((t, i) => (
              <span key={i} style={{ ...sTg, color: T.mu, background: T.bd }}>
                {t.trim()}
              </span>
            ))}
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1.3 }}>{entry.name}</h2>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
        {/* ── Colonne principale (gauche) ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Description */}
          {entry.description && (
            <div
              style={{
                marginBottom: 14,
                padding: '14px 18px',
                background: T.bgC,
                border: `1px solid ${T.bd}`,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: T.ac,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                Description
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, textAlign: 'justify' }}>
                <RichText text={entry.description} entries={entries} onNav={onNav} />
              </div>
            </div>
          )}

          {/* Sections de contenu (champs + sections perso) dans l'ordre sauvegardé */}
          {contentItems.map(item => {
            if (item.type === 'field') {
              const f = item.field;
              const v = entry.fields?.[f.key];
              if (!v || (Array.isArray(v) && !v.length)) return null;
              const label = f.key === 'personnagesLies'
                ? `Personnages secondaires liés à ${entry.name}`
                : f.label;
              return (
                <div key={f.key} style={{ marginBottom: 14, padding: '14px 18px', background: T.bgC, border: `1px solid ${T.bd}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: cat.color, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.7, textAlign: 'justify' }}>
                    {renderFieldView(f, entry.fields, entries, onNav)}
                  </div>
                </div>
              );
            }
            const s = item.section;
            if (!s.content) return null;
            return (
              <div key={s.id} style={{ marginBottom: 14, padding: '14px 18px', background: T.bgC, border: `1px solid ${T.bd}`, borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: cat.color, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.7, textAlign: 'justify' }}>
                  <RichText text={s.content} entries={entries} onNav={onNav} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Colonne latérale (droite) ── */}
        <div style={{ flex: '0 0 280px', width: 280 }}>
          {/* Photo */}
          <div
            style={{
              width: '100%',
              aspectRatio: '3/4',
              background: T.bgI,
              border: `1px solid ${T.bd}`,
              borderRadius: 6,
              marginBottom: 12,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {entry.photo ? (
              <img
                src={entry.photo}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt={entry.name}
              />
            ) : (
              <span style={{ fontSize: 48, opacity: 0.2 }}>{cat.icon}</span>
            )}
          </div>

          {/* Informations générales */}
          {generalFields.some(f => {
            const v = entry.fields?.[f.key];
            return v && (Array.isArray(v) ? v.length > 0 : true);
          }) && (
            <div
              style={{
                background: T.bgC,
                border: `1px solid ${T.bd}`,
                borderRadius: 6,
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: T.ac,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Informations générales
              </div>
              {generalFields.map(f => {
                const v = entry.fields?.[f.key];
                if (!v || (Array.isArray(v) && !v.length)) return null;
                return (
                  <div key={f.key} style={{ padding: '5px 0', borderBottom: `1px solid ${T.bd}22` }}>
                    <div style={{ color: T.mu, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {renderFieldView(f, entry.fields, entries, onNav)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Membres de la dynastie */}
          {entry.category === 'dynastieFamiliale' && (
            <div
              style={{
                background: T.bgC,
                border: `1px solid ${T.bd}`,
                borderRadius: 6,
                padding: '12px 16px',
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: cat.color,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Membres de la dynastie
              </div>
              <DynastyMembersView
                dynastyId={entry.id}
                entries={entries}
                onNav={onNav}
                memberRoles={entry.memberRoles || {}}
                onRoleChange={(mid, role) => {
                  const memberRoles = { ...(entry.memberRoles || {}), [mid]: role };
                  onUpdateEntry({ ...entry, memberRoles, updatedAt: Date.now() });
                }}
              />
            </div>
          )}

          {/* Membres affiliés */}
          {(entry.category === 'nation' ||
            entry.category === 'organisation' ||
            entry.category === 'religion') && (
            <div
              style={{
                background: T.bgC,
                border: `1px solid ${T.bd}`,
                borderRadius: 6,
                padding: '12px 16px',
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: cat.color,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Membres affiliés
              </div>
              <AffiliatedMembersView entryId={entry.id} entries={entries} onNav={onNav} />
            </div>
          )}
        </div>
      </div>

      {/* ── Backlinks ── */}
      {backlinks.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              color: T.dm,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            🔗 Référencé par
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {backlinks.map(b => {
              const bc = CATEGORIES[b.category];
              return (
                <button
                  key={b.id}
                  onClick={() => onNav(b.id)}
                  style={{
                    background: 'none',
                    border: `1px solid ${bc.color}44`,
                    color: bc.color,
                    padding: '5px 10px',
                    fontSize: 12,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {bc.icon + ' ' + b.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Astuce mention */}
      <div
        style={{
          marginBottom: ownerUid && projectId ? 0 : 40,
          padding: '10px 14px',
          background: T.bgI,
          borderRadius: 6,
          fontSize: 11,
          color: T.dm,
        }}
      >
        💡 {'[[' + entry.name + ']]'}
      </div>

      {/* Commentaires */}
      {ownerUid && projectId && (
        <CommentsSection ownerUid={ownerUid} projectId={projectId} entryId={entry.id} userProfile={userProfile} />
      )}
    </>
  );
}
