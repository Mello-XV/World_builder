/**
 * Thème visuel de l'application.
 *
 * T = palette de couleurs (tokens)
 * Les objets de style (sBtn, sInp, etc.) sont des styles inline React
 * réutilisés dans tous les composants pour garder une apparence cohérente.
 */

/** Palette de couleurs */
export const T = {
  bg: '#0f0e0d',    // fond principal (noir profond)
  bgC: '#1a1816',   // fond des cartes
  bgH: '#221f1c',   // fond au survol
  bgI: '#141210',   // fond des inputs
  bd: '#2a2520',    // couleur des bordures
  tx: '#e8dcc8',    // texte principal (ivoire)
  mu: '#8a7e6e',    // texte secondaire (gris chaud)
  dm: '#5a5245',    // texte discret (gris foncé)
  ac: '#c9a84c',    // couleur d'accent (or)
};

// ── Styles de base réutilisables ──────────────────────────────────────────

/** Bouton discret (contour seulement) */
export const sBtn = {
  background: 'none',
  border: `1px solid ${T.bd}`,
  color: T.tx,
  padding: '8px 16px',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
};

/** Bouton principal (fond or) */
export const sBtnA = {
  background: T.ac,
  border: 'none',
  color: '#0f0e0d',
  padding: '10px 20px',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
};

/** Carte / panneau */
export const sCard = {
  background: T.bgC,
  border: `1px solid ${T.bd}`,
  borderRadius: 6,
  padding: 20,
};

/** Champ de saisie texte */
export const sInp = {
  width: '100%',
  background: T.bgI,
  border: `1px solid ${T.bd}`,
  color: T.tx,
  padding: '10px 14px',
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

/** Liste déroulante (select) */
export const sSel = {
  ...sInp,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238a7e6e' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
};

/** Tag / badge (ex : catégorie) */
export const sTg = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: 3,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
};

/** Label de champ de formulaire */
export const sLbl = {
  fontSize: 12,
  letterSpacing: 1,
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
};

/** Bouton petit (compact) */
export const sBs = {
  ...sBtn,
  padding: '5px 10px',
  fontSize: 12,
};

/**
 * Effet de survol (hover) sur un élément.
 * Utilisation : onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}
 */
export const hov = (e, on) => {
  e.currentTarget.style.background = on ? T.bgH : 'transparent';
};
