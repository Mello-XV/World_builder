/**
 * RichText — rendu visuel du texte enrichi.
 *
 * Supporte :
 * - **gras**, *italique*, __souligné__ (inline)
 * - Liens wiki [[Nom du personnage]] → cliquables
 * - Images ![alt](url)
 * - Tableaux (colonnes séparées par |, collés depuis Excel)
 * - Paragraphes normaux avec indentation (espaces préservés)
 */

import { CATEGORIES } from '../../constants/categories';
import { T } from '../../styles/theme';

/**
 * Applique le formatage inline sur un texte brut (sans [[...]] ni balises).
 * Gère **gras**, *italique*, __souligné__.
 */
function applyInlineFormat(text, baseKey) {
  // Regex qui capture **gras**, *italique*, __souligné__
  const regex = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|__[^_\n]+?__)/g;
  const parts = [];
  let last = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
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

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length ? parts : [text];
}

/**
 * Transforme une ligne de texte en éléments React.
 * Gère les mentions [[nom]] et le formatage **gras** / *italique* / __souligné__.
 */
function renderInline(text, entries, onNav, lineKey) {
  // 1. Découper sur les mentions [[...]]
  const segments = text.split(/(\[\[[^\]]+\]\])/g);

  return segments.flatMap((part, segIdx) => {
    const match = part.match(/^\[\[(?:(\d+):)?(.+)\]\]$/);

    if (match) {
      // C'est une mention [[nom]] ou [[id:nom]]
      const [, idStr, name] = match;
      let targetId = idStr ? parseInt(idStr) : null;

      if (!targetId) {
        const found = Object.values(entries).find(
          e => e.name.toLowerCase() === name.toLowerCase(),
        );
        if (found) targetId = found.id;
      }

      if (targetId && entries[targetId]) {
        const cat = CATEGORIES[entries[targetId].category];
        return (
          <span
            key={`${lineKey}-seg-${segIdx}`}
            onClick={() => onNav(targetId)}
            style={{
              color: cat?.color || T.ac,
              cursor: 'pointer',
              borderBottom: `1px dotted ${cat?.color || T.ac}`,
              fontWeight: 600,
            }}
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

    // Texte normal : appliquer le formatage inline
    return applyInlineFormat(part, `${lineKey}-seg-${segIdx}`).map((el, fi) =>
      typeof el === 'string' ? el : <span key={`${lineKey}-seg-${segIdx}-fi-${fi}`}>{el}</span>,
    );
  });
}

export function RichText({ text, entries, onNav }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let tableBuffer = [];

  const flushTable = () => {
    if (!tableBuffer.length) return;
    const rows = tableBuffer.map(l =>
      l
        .split('|')
        .map(c => c.trim())
        .filter(Boolean),
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

    // Image markdown ![alt](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushTable();
      elements.push(
        <img
          key={elements.length}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          style={{ maxWidth: '100%', borderRadius: 6, margin: '8px 0' }}
        />,
      );
      continue;
    }

    // Ligne de tableau (contient | et n'est pas une image)
    if (line.includes('|') && !line.startsWith('!')) {
      if (/^\|?[\s\-:|]+\|?$/.test(line)) continue; // séparateur markdown, ignoré
      tableBuffer.push(line);
      continue;
    }

    flushTable();

    if (line === '') {
      elements.push(<div key={elements.length} style={{ height: 8 }} />);
      continue;
    }

    // Ligne normale : préserver l'indentation (espaces en début)
    const indent = raw.length - raw.trimStart().length;
    elements.push(
      <p
        key={elements.length}
        style={{
          margin: '4px 0',
          lineHeight: 1.7,
          textAlign: 'justify',
          paddingLeft: indent > 0 ? `${indent * 0.6}em` : 0,
        }}
      >
        {renderInline(line, entries, onNav, `line-${i}`)}
      </p>,
    );
  }

  flushTable();
  return <>{elements}</>;
}
