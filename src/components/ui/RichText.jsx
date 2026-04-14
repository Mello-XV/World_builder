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

import { useRef, useState } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { T } from '../../styles/theme';

// ── Détection du mode HTML ────────────────────────────────────────────────

function isHtml(text) {
  return /<[biusp][\s/>]|<strong|<em\b|<table|<br|<div/i.test(text);
}

// ── Mode HTML : conversion DOM → React ───────────────────────────────────

const SAFE_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'div', 'span', 'ul', 'ol', 'li']);

// ── Tableau redimensionnable ──────────────────────────────────────────────

function ResizableTable({ headers, rows, initialColPcts }) {
  // colPcts : largeurs en pourcentage (somme = 100).
  // Initialisé depuis les largeurs sauvegardées (colgroup) si disponibles.
  const [colPcts, setColPcts] = useState(initialColPcts || null);
  const tableRef = useRef(null);
  const dragRef = useRef(null);

  const n = headers?.length || rows[0]?.length || 1;

  const startResize = (colIdx, e) => {
    e.preventDefault();

    // Largeur courante du tableau en pixels (pour convertir le delta en %)
    const tableWidth = tableRef.current?.getBoundingClientRect().width || 1;
    const ths = tableRef.current?.querySelectorAll('th');

    let startPcts;
    if (colPcts) {
      startPcts = [...colPcts];
    } else if (ths && ths.length > 0) {
      const pxWidths = Array.from(ths).map(th => th.getBoundingClientRect().width);
      const total = pxWidths.reduce((a, b) => a + b, 0) || tableWidth;
      startPcts = pxWidths.map(w => (w / total) * 100);
    } else {
      startPcts = Array.from({ length: n }, () => 100 / n);
    }

    dragRef.current = { colIdx, startX: e.clientX, startPcts, tableWidth };
    if (!colPcts) setColPcts(startPcts);

    const onMove = ev => {
      if (!dragRef.current) return;
      const { colIdx: ci, startX, startPcts: sp, tableWidth: tw } = dragRef.current;
      // Convertir le déplacement pixel en % de la largeur du tableau
      const deltaPct = ((ev.clientX - startX) / tw) * 100;
      // Minimum de 40px converti en % pour éviter les colonnes trop étroites
      const minPct = (40 / tw) * 100;

      setColPcts(() => {
        const next = [...sp];
        // Redistribuer uniquement entre ci et ci+1 — total de la paire reste constant
        const pairTotal = sp[ci] + sp[ci + 1];
        next[ci] = Math.min(Math.max(minPct, sp[ci] + deltaPct), pairTotal - minPct);
        next[ci + 1] = pairTotal - next[ci];
        return next;
      });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const cellBase = {
    // maxWidth:0 + table-layout:fixed = le navigateur respecte strictement
    // la largeur de colonne et ne laisse pas le texte déborder.
    maxWidth: 0,
    whiteSpace: 'normal',
    wordBreak: 'break-all',   // coupe même les longues suites sans espaces
    overflowWrap: 'break-word',
  };

  const thStyle = {
    ...cellBase,
    padding: '6px 10px',
    textAlign: 'left',
    fontWeight: 700,
    color: T.ac,
    background: T.bd + '66',
    border: `1px solid ${T.bd}`,
    position: 'relative',
    userSelect: 'none',
  };

  const tdStyle = {
    ...cellBase,
    padding: '6px 10px',
    textAlign: 'left',
    border: `1px solid ${T.bd}`,
  };

  return (
    <div style={{ margin: '8px 0' }}>
      <table
        ref={tableRef}
        style={{
          borderCollapse: 'collapse',
          fontSize: 14,
          tableLayout: 'fixed', // toujours fixed : bords extérieurs figés
          width: '100%',        // toujours 100% : le tableau ne déborde pas
        }}
      >
        {colPcts && (
          <colgroup>
            {colPcts.map((p, i) => <col key={i} style={{ width: p + '%' }} />)}
          </colgroup>
        )}
        {headers && headers.length > 0 && (
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.bd}` }}>
              {headers.map((cell, ci) => (
                <th key={ci} style={thStyle}>
                  {cell}
                  {/* Poignée entre ci et ci+1 — pas sur le dernier bord droit */}
                  {ci < headers.length - 1 && (
                    <span
                      onMouseDown={e => startResize(ci, e)}
                      title="Glisser pour redimensionner"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: 6,
                        height: '100%',
                        cursor: 'col-resize',
                        zIndex: 1,
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: `1px solid ${T.bd}` }}>
              {row.map((cell, ci) => (
                <td key={ci} style={tdStyle}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  if (node.style?.marginLeft) inlineStyle.marginLeft = node.style.marginLeft;

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

    case 'table': {
      // Lire les largeurs de colonnes depuis le <colgroup> (sauvegardées en mode édition)
      const colEls = Array.from(node.querySelectorAll('colgroup col'));
      const initialColPcts = colEls.length > 0
        ? colEls.map(col => parseFloat(col.style?.width) || 0).filter(v => v > 0)
        : null;

      const trs = Array.from(node.querySelectorAll('tr'));
      let headers = null;
      const dataRows = [];

      trs.forEach((tr, ri) => {
        const cells = Array.from(tr.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
        const cellContents = cells.map((cell, ci) =>
          Array.from(cell.childNodes).flatMap((child, cii) => {
            const result = domToReact(child, entries, onNav, `${key}-r${ri}-c${ci}-${cii}`);
            return Array.isArray(result) ? result : result !== null ? [result] : [];
          }),
        );
        const isHeaderRow = ri === 0 && cells.every(c => c.tagName?.toLowerCase() === 'th');
        if (isHeaderRow) {
          headers = cellContents;
        } else {
          dataRows.push(cellContents);
        }
      });

      return (
        <ResizableTable
          key={key}
          headers={headers}
          rows={dataRows}
          initialColPcts={initialColPcts?.length ? initialColPcts : null}
        />
      );
    }

    case 'thead':
    case 'tbody':
    case 'tr':
    case 'th':
    case 'td':
      // Handled inside ResizableTable; flatten content if encountered outside a table context
      return children.length ? <span key={key}>{children}</span> : null;

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

    case 'ul':
      return <ul key={key} style={{ margin: '6px 0', paddingLeft: node.style?.paddingLeft || '22px', ...inlineStyle }}>{children}</ul>;

    case 'ol':
      return <ol key={key} style={{ margin: '6px 0', paddingLeft: node.style?.paddingLeft || '22px', ...inlineStyle }}>{children}</ol>;

    case 'li':
      return <li key={key} style={{ margin: '3px 0', lineHeight: 1.7, listStyleType: node.style?.listStyleType || undefined, ...inlineStyle }}>{children}</li>;

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
    const allRows = tableBuffer.map(l =>
      l.split('|').map(c => c.trim()).filter(Boolean),
    );
    const tblKey = elements.length;
    const headers = allRows[0].map((cell, ci) =>
      renderInline(cell, entries, onNav, `tbl-${tblKey}-h-${ci}`),
    );
    const dataRows = allRows.slice(1).map((row, ri) =>
      row.map((cell, ci) =>
        renderInline(cell, entries, onNav, `tbl-${tblKey}-${ri + 1}-${ci}`),
      ),
    );
    elements.push(<ResizableTable key={tblKey} headers={headers} rows={dataRows} />);
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
