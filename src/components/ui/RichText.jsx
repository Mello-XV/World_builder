/**
 * RichText — rendu visuel du texte enrichi.
 *
 * Deux modes selon le contenu stocké :
 *
 * Mode HTML (contenteditable) :
 *   - Détecté automatiquement si le texte contient des balises HTML
 *   - Gère <b>, <strong>, <i>, <em>, <u>, <br>, <table>, <tr>, <th>, <td>
 *   - Traite les mentions [[Nom]] dans les nœuds texte
 *
 * Mode Markdown (legacy / champs simples) :
 *   - **gras**, *italique*, __souligné__ (inline)
 *   - Liens wiki [[Nom]] → cliquables
 *   - Images ![alt](url)
 *   - Tableaux col1|col2 (lignes avec pipe)
 *   - Paragraphes normaux avec indentation préservée
 */

import { CATEGORIES } from '../../constants/categories';
import { T } from '../../styles/theme';

// ── Détection du mode HTML ────────────────────────────────────────────────

function isHtml(text) {
  return /<[biusp][\s/>]|<strong|<em\b|<table|<br|<div/i.test(text);
}

// ── Mode HTML : conversion DOM → React ───────────────────────────────────

const SAFE_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'div', 'span']);

/**
 * Traite le texte brut pour les mentions [[nom]] et renvoie des éléments React.
 */
function mentionText(text, entries, onNav, key) {
  const segments = text.split(/(\[\[[^\]]+\]\])/g);
  return segments.flatMap((part, si) => {
    const m = part.match(/^\[\[(?:(\d+):)?(.+)\]\]$/);
    if (m) {
      const [, idStr, name] = m;
      let targetId = idStr ? parseInt(idStr) : null;
      if (!targetId) {
        const found = Object.values(entries).find(e => e.name.toLowerCase() === name.toLowerCase());
        if (found) targetId = found.id;
      }
      if (targetId && entries[targetId]) {
        const cat = CATEGORIES[entries[targetId].category];
        return (
          <span
            key={`${key}-m${si}`}
            onClick={() => onNav(targetId)}
            style={{ color: cat?.color || T.ac, cursor: 'pointer', borderBottom: `1px dotted ${cat?.color || T.ac}`, fontWeight: 600 }}
          >
            {name}
          </span>
        );
      }
      return <span key={`${key}-m${si}`} style={{ color: '#665544', fontStyle: 'italic' }}>{name} ⚠</span>;
    }
    return part; // texte brut
  });
}

/**
 * Convertit un nœud DOM en éléments React (récursif).
 * Seules les balises de SAFE_TAGS sont conservées ; les autres sont aplaties en texte.
 */
function domToReact(node, entries, onNav, key) {
  // Nœud texte
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent;
    if (!t) return null;
    return mentionText(t, entries, onNav, key);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).flatMap((child, i) => {
    const result = domToReact(child, entries, onNav, `${key}-${i}`);
    return Array.isArray(result) ? result : result !== null ? [result] : [];
  });

  // Extraire les styles inline de l'élément (contenteditable en génère)
  const inlineStyle = {};
  if (node.style?.fontWeight === 'bold' || node.style?.fontWeight === '700') inlineStyle.fontWeight = 'bold';
  if (node.style?.fontStyle === 'italic') inlineStyle.fontStyle = 'italic';
  if (node.style?.textDecoration?.includes('underline')) inlineStyle.textDecoration = 'underline';

  if (!SAFE_TAGS.has(tag)) {
    // Tag non-sûr : on aplatit le contenu
    return children.length ? children : null;
  }

  switch (tag) {
    case 'br':
      return <br key={key} />;

    case 'b':
    case 'strong':
      return <strong key={key}>{children}</strong>;

    case 'i':
    case 'em':
      return <em key={key}>{children}</em>;

    case 'u':
      return <u key={key}>{children}</u>;

    case 'table':
      return (
        <div key={key} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            {children}
          </table>
        </div>
      );

    case 'thead':
      return <thead key={key}>{children}</thead>;

    case 'tbody':
      return <tbody key={key}>{children}</tbody>;

    case 'tr':
      return <tr key={key} style={{ borderBottom: `1px solid ${T.bd}` }}>{children}</tr>;

    case 'th':
      return (
        <th
          key={key}
          style={{
            padding: '6px 10px',
            textAlign: 'left',
            fontWeight: 700,
            color: T.ac,
            background: T.bd + '66',
            border: `1px solid ${T.bd}`,
          }}
        >
          {children}
        </th>
      );

    case 'td':
      return (
        <td
          key={key}
          style={{ padding: '6px 10px', textAlign: 'left', border: `1px solid ${T.bd}` }}
        >
          {children}
        </td>
      );

    case 'p':
    case 'div':
      // Paragraphe : si vide ou juste un <br>, émettre un espace vide
      if (children.length === 0 || (children.length === 1 && children[0]?.type === 'br')) {
        return <div key={key} style={{ height: 8 }} />;
      }
      return (
        <p key={key} style={{ margin: '4px 0', lineHeight: 1.7, textAlign: 'justify', ...inlineStyle }}>
          {children}
        </p>
      );

    case 'span':
      return <span key={key} style={inlineStyle}>{children}</span>;

    default:
      return children.length ? <span key={key}>{children}</span> : null;
  }
}

/**
 * Rendu HTML : parse la chaîne HTML avec DOMParser et convertit en React.
 */
function RichTextHtml({ text, entries, onNav }) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const body = doc.body;
  const elements = Array.from(body.childNodes).flatMap((node, i) => {
    const result = domToReact(node, entries, onNav, `html-${i}`);
    return Array.isArray(result) ? result : result !== null ? [result] : [];
  });
  return <>{elements}</>;
}

// ── Mode Markdown (legacy) ────────────────────────────────────────────────

function applyInlineFormat(text, baseKey) {
  const regex = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|__[^_\n]+?__)/g;
  const parts = [];
  let last = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const m = match[0];
    if (m.startsWith('**')) {
      parts.push(<strong key={`${baseKey}-fmt-${idx++}`}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('__')) {
      parts.push(<u key={`${baseKey}-fmt-${idx++}`}>{m.slice(2, -2)}</u>);
    } else {
      parts.push(<em key={`${baseKey}-fmt-${idx++}`}>{m.slice(1, -1)}</em>);
    }
    last = match.index + m.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderInline(text, entries, onNav, lineKey) {
  const segments = text.split(/(\[\[[^\]]+\]\])/g);
  return segments.flatMap((part, segIdx) => {
    const match = part.match(/^\[\[(?:(\d+):)?(.+)\]\]$/);
    if (match) {
      const [, idStr, name] = match;
      let targetId = idStr ? parseInt(idStr) : null;
      if (!targetId) {
        const found = Object.values(entries).find(e => e.name.toLowerCase() === name.toLowerCase());
        if (found) targetId = found.id;
      }
      if (targetId && entries[targetId]) {
        const cat = CATEGORIES[entries[targetId].category];
        return (
          <span
            key={`${lineKey}-seg-${segIdx}`}
            onClick={() => onNav(targetId)}
            style={{ color: cat?.color || T.ac, cursor: 'pointer', borderBottom: `1px dotted ${cat?.color || T.ac}`, fontWeight: 600 }}
          >
            {name}
          </span>
        );
      }
      return (
        <span key={`${lineKey}-seg-${segIdx}`} style={{ color: '#665544', fontStyle: 'italic' }}>
          {name} ⚠
        </span>
      );
    }
    return applyInlineFormat(part, `${lineKey}-seg-${segIdx}`).map((el, fi) =>
      typeof el === 'string' ? el : <span key={`${lineKey}-seg-${segIdx}-fi-${fi}`}>{el}</span>,
    );
  });
}

// ── Composant principal ───────────────────────────────────────────────────

export function RichText({ text, entries, onNav }) {
  if (!text) return null;

  // Mode HTML (contenu issu du contenteditable)
  if (isHtml(text)) {
    return <RichTextHtml text={text} entries={entries} onNav={onNav} />;
  }

  // Mode Markdown (champs texte simples, legacy)
  const lines = text.split('\n');
  const elements = [];
  let tableBuffer = [];

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.map(l =>
      l.split('|').map(c => c.trim()).filter(Boolean),
    );
    elements.push(
      <div key={elements.length} style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: `1px solid ${T.bd}` }}>
                {row.map((cell, ci) => {
                  const Tag = ri === 0 ? 'th' : 'td';
                  return (
                    <Tag
                      key={ci}
                      style={{
                        padding: '6px 10px',
                        textAlign: 'left',
                        fontWeight: ri === 0 ? 700 : 400,
                        color: ri === 0 ? T.ac : T.tx,
                        background: ri === 0 ? T.bd + '66' : 'transparent',
                        border: `1px solid ${T.bd}`,
                      }}
                    >
                      {renderInline(cell, entries, onNav, `tbl-${ri}-${ci}`)}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushTable();
      elements.push(
        <img key={elements.length} src={imgMatch[2]} alt={imgMatch[1]} style={{ maxWidth: '100%', borderRadius: 6, margin: '8px 0' }} />,
      );
      continue;
    }

    if (line.includes('|') && !line.startsWith('!')) {
      if (/^\|?[\s\-:|]+\|?$/.test(line)) continue;
      tableBuffer.push(line);
      continue;
    }

    flushTable();

    if (line === '') {
      elements.push(<div key={elements.length} style={{ height: 8 }} />);
      continue;
    }

    const indent = raw.length - raw.trimStart().length;
    elements.push(
      <p key={elements.length} style={{ margin: '4px 0', lineHeight: 1.7, textAlign: 'justify', paddingLeft: indent > 0 ? `${indent * 0.6}em` : 0 }}>
        {renderInline(line, entries, onNav, `line-${i}`)}
      </p>,
    );
  }

  flushTable();
  return <>{elements}</>;
}
