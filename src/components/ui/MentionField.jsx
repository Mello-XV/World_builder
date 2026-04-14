/**
 * MentionField — champ texte enrichi avec autocomplétion @mention.
 *
 * Mode multiline : éditeur WYSIWYG (contenteditable)
 *   - Toolbar : gras (Ctrl+B), italique (Ctrl+I), souligner (Ctrl+U)
 *   - Touche Tab : insère une indentation (4 espaces)
 *   - Collage de tableau TSV (Excel/Sheets) : convertit en <table> HTML
 *   - @mention : autocomplétion vers les fiches existantes → [[Nom]]
 *
 * Mode simple (multiline=false) : <input> classique
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { T, sInp, sBs } from '../../styles/theme';

// Style des boutons de la toolbar de formatage
const toolbarBtn = {
  background: 'none',
  border: `1px solid ${T.bd}`,
  color: T.mu,
  width: 28,
  height: 24,
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

// ── Utilitaire : obtenir le texte avant le curseur dans le contenteditable ──

function getTextBeforeCursor(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return '';
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
  return range.toString();
}

// ── Utilitaire : supprimer N caractères avant le curseur ──────────────────

function deleteCharsBefore(n) {
  for (let i = 0; i < n; i++) {
    document.execCommand('delete', false, null);
  }
}

// ── Conversion TSV → table HTML ───────────────────────────────────────────

// Retourne true si le HTML du contenteditable est "effectivement vide"
// (seulement des <br>, balises vides, &nbsp; — pas de texte réel)
function isEffectivelyEmpty(html) {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() === '';
}

function buildColgroup(cols) {
  const pct = (100 / cols).toFixed(2);
  return `<colgroup>${Array.from({ length: cols }, () => `<col style="width:${pct}%">`).join('')}</colgroup>`;
}

function tsvToHtmlTable(tsv) {
  const rows = tsv
    .trim()
    .split('\n')
    .map(row => row.split('\t'));

  const [header, ...body] = rows;

  const th = header.map(c => `<th style="padding:6px 10px;font-weight:700;border:1px solid #3a332a">${c}</th>`).join('');
  const trs = body
    .map(
      row =>
        `<tr>${row.map(c => `<td style="padding:6px 10px;border:1px solid #3a332a">${c}</td>`).join('')}</tr>`,
    )
    .join('');

  return `<table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:14px;margin:8px 0">${buildColgroup(header.length)}<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table><br>`;
}


export function MentionField({ value, onChange, entries, placeholder, multiline, style: xs }) {
  const [mention, setMention] = useState({ active: false, query: '', charCount: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tablePicker, setTablePicker] = useState(null); // null | { rows, cols }
  const ref = useRef(null);
  const savedRangeRef = useRef(null); // curseur sauvegardé avant ouverture du table picker
  const colResizingRef = useRef(false); // true pendant un drag de colonne

  const allEntries = useMemo(() => Object.values(entries), [entries]);

  const filtered = useMemo(() => {
    if (!mention.active || !mention.query) return [];
    return allEntries
      .filter(e => e.name.toLowerCase().includes(mention.query.toLowerCase()))
      .slice(0, 8);
  }, [mention, allEntries]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // ── Initialisation du contenteditable (montage uniquement) ────────────

  useEffect(() => {
    if (multiline && ref.current) {
      ref.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // montage uniquement — le DOM est la source de vérité ensuite

  // ── Synchroniser quand on change de fiche (value change de null → string) ─
  // On utilise un ref pour détecter les changements "externes" (nouveau entry)

  const prevValueRef = useRef(value);
  useEffect(() => {
    if (!multiline || !ref.current) return;
    // Si la valeur externe change vers quelque chose de complètement différent
    // (ex: navigation vers une autre fiche), on ré-initialise le DOM
    if (prevValueRef.current !== value && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
    prevValueRef.current = value;
  }, [value, multiline]);

  // ── Formatage WYSIWYG ─────────────────────────────────────────────────

  const applyFormat = useCallback(cmd => {
    ref.current?.focus();
    document.execCommand(cmd, false, null);
  }, []);

  // ── Insertion d'un tableau vide ───────────────────────────────────────

  const insertEmptyTable = useCallback((rows, cols) => {
    ref.current?.focus();
    // Restaurer le curseur à l'endroit où il était avant l'ouverture du picker
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      savedRangeRef.current = null;
    }
    const th = Array.from({ length: cols }, () =>
      `<th style="padding:6px 10px;font-weight:700;border:1px solid #3a332a">&nbsp;</th>`
    ).join('');
    const tdRow = `<tr>${Array.from({ length: cols }, () =>
      `<td style="padding:6px 10px;border:1px solid #3a332a">&nbsp;</td>`
    ).join('')}</tr>`;
    const trs = Array.from({ length: Math.max(rows - 1, 0) }, () => tdRow).join('');
    const html = `<table style="border-collapse:collapse;width:100%;table-layout:fixed;font-size:14px;margin:8px 0">${buildColgroup(cols)}<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table><br>`;
    document.execCommand('insertHTML', false, html);
    onChange(ref.current?.innerHTML || '');
  }, [onChange]);

  // ── Collage de tableau TSV ─────────────────────────────────────────────

  const handlePaste = useCallback(
    ev => {
      if (!multiline) return;
      ev.preventDefault();

      const plain = ev.clipboardData.getData('text/plain');
      const htmlClip = ev.clipboardData.getData('text/html');

      const plainLines = plain.trim().split('\n').filter(l => l.trim());

      // Si au moins une ligne commence par un caractère puce, traiter tout le bloc
      // comme du texte ordinaire — les puces restent des caractères éditables normaux.
      const BULLET_START_RE = /^\s*[•·▪▸►‣⁃∙○●◦\u2022\u2023\u25E6o]\s/;
      const hasBullets = plainLines.some(l => BULLET_START_RE.test(l));

      // Détecter un vrai tableau TSV : toutes les lignes ont des tabs ET pas de puces.
      const isTsv =
        !hasBullets &&
        plain.includes('\t') &&
        plainLines.length >= 1 &&
        plainLines.every(l => l.includes('\t'));

      // Détecter un tableau HTML (Excel, Sheets, tableau Word)
      const htmlHasTable = !!htmlClip && /<table/i.test(htmlClip);

      if (htmlHasTable || isTsv) {
        const tableHtml = tsvToHtmlTable(plain);
        document.execCommand('insertHTML', false, tableHtml);
        onChange(ref.current?.innerHTML || '');
        return;
      }

      // Texte ordinaire (puces incluses) : chaque ligne devient un <p>.
      // Les tabs (après une puce Word) sont remplacés par un espace.
      const htmlContent = plain
        .split(/\r?\n/)
        .map(line => {
          const text = line.replace(/\t/g, ' ').trim();
          if (!text) return '';
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<p style="margin:4px 0;line-height:1.7">${escaped}</p>`;
        })
        .filter(Boolean)
        .join('');
      document.execCommand('insertHTML', false, htmlContent || plain);
      onChange(ref.current?.innerHTML || '');
    },
    [multiline, onChange],
  );

  // ── Détection du "@" pour les mentions ───────────────────────────────

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    onChange(isEffectivelyEmpty(html) ? '' : html);

    const before = getTextBeforeCursor(ref.current);
    const atIndex = before.lastIndexOf('@');

    if (atIndex >= 0 && (atIndex === 0 || ' \n'.includes(before[atIndex - 1]))) {
      const query = before.slice(atIndex + 1);
      if (!query.includes('\n') && query.length < 30) {
        setMention({ active: true, query, charCount: query.length + 1 }); // +1 pour le @
        return;
      }
    }
    setMention({ active: false, query: '', charCount: 0 });
  }, [onChange]);

  // ── Insertion d'une mention ───────────────────────────────────────────

  const insertMention = useCallback(
    entry => {
      ref.current?.focus();
      // Supprimer le "@query" avant le curseur
      deleteCharsBefore(mention.charCount);
      // Insérer le texte de mention
      document.execCommand('insertText', false, `[[${entry.name}]]`);
      setMention({ active: false, query: '', charCount: 0 });
      onChange(ref.current?.innerHTML || '');
    },
    [mention.charCount, onChange],
  );

  // ── Redimensionnement de colonnes de tableau (edit mode) ─────────────
  // Détecte si la souris est à ≤8px du bord droit d'un <td>/<th>
  // et renvoie {table, cols[], colIdx} ou null.

  const getColResizeTarget = useCallback((e) => {
    if (!multiline || !ref.current) return null;
    let el = e.target;
    while (el && el !== ref.current) {
      const tag = el.tagName?.toUpperCase();
      if (tag === 'TD' || tag === 'TH') {
        const rect = el.getBoundingClientRect();
        const fromRight = rect.right - e.clientX;
        if (fromRight >= 0 && fromRight <= 8) {
          const row = el.parentElement;
          const table = row?.closest('table');
          const colgroup = table?.querySelector('colgroup');
          if (!colgroup) return null;
          const cols = Array.from(colgroup.querySelectorAll('col'));
          const colIdx = Array.from(row.children).indexOf(el);
          // Pas de redimensionnement sur le bord droit de la dernière colonne
          if (colIdx < 0 || colIdx >= cols.length - 1) return null;
          return { table, cols, colIdx };
        }
        return null;
      }
      el = el.parentElement;
    }
    return null;
  }, [multiline]);

  const handleColMouseMove = useCallback((e) => {
    if (!ref.current || colResizingRef.current) return;
    ref.current.style.cursor = getColResizeTarget(e) ? 'col-resize' : '';
  }, [getColResizeTarget]);

  const handleColMouseDown = useCallback((e) => {
    const target = getColResizeTarget(e);
    if (!target) return;
    e.preventDefault();

    const { table, cols, colIdx } = target;
    const tableWidth = table.getBoundingClientRect().width || 1;
    const startX = e.clientX;
    const startPcts = cols.map(col => parseFloat(col.style.width) || (100 / cols.length));

    colResizingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMove = (ev) => {
      const deltaPct = ((ev.clientX - startX) / tableWidth) * 100;
      const minPct = (40 / tableWidth) * 100;
      const pairTotal = startPcts[colIdx] + startPcts[colIdx + 1];
      const newPct = Math.min(Math.max(minPct, startPcts[colIdx] + deltaPct), pairTotal - minPct);
      cols[colIdx].style.width = newPct + '%';
      cols[colIdx + 1].style.width = (pairTotal - newPct) + '%';
    };

    const onUp = () => {
      colResizingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (ref.current) ref.current.style.cursor = '';
      onChange(ref.current?.innerHTML || '');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [getColResizeTarget, onChange]);

  // ── Indentation (Tab / Shift+Tab) ────────────────────────────────────
  // Pour les listes (<li>), utilise indent/outdent natif (niveaux d'imbrication).
  // Pour les blocs normaux, applique margin-left CSS directement —
  // execCommand('outdent') est peu fiable quand le curseur n'est pas en début de ligne.

  const handleIndent = useCallback((increase) => {
    if (!ref.current) return;
    ref.current.focus();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // Vérifier si le curseur est dans un élément de liste
    let checkNode = sel.getRangeAt(0).commonAncestorContainer;
    if (checkNode.nodeType === Node.TEXT_NODE) checkNode = checkNode.parentNode;
    let inList = false;
    let walker = checkNode;
    while (walker && walker !== ref.current) {
      const tag = walker.tagName?.toUpperCase();
      if (tag === 'LI' || tag === 'UL' || tag === 'OL') { inList = true; break; }
      walker = walker.parentNode;
    }

    if (inList) {
      document.execCommand(increase ? 'indent' : 'outdent', false, null);
      onChange(ref.current.innerHTML || '');
      return;
    }

    // Hors liste : trouver l'élément de bloc direct enfant du contenteditable
    let blockNode = checkNode;
    while (blockNode && blockNode !== ref.current && blockNode.parentNode !== ref.current) {
      blockNode = blockNode.parentNode;
    }

    if (!blockNode || blockNode === ref.current) {
      document.execCommand(increase ? 'indent' : 'outdent', false, null);
      onChange(ref.current.innerHTML || '');
      return;
    }

    const STEP = 2; // em par niveau
    const current = parseFloat(blockNode.style.marginLeft) || 0;
    if (increase) {
      blockNode.style.marginLeft = (current + STEP) + 'em';
    } else {
      const next = Math.max(0, current - STEP);
      blockNode.style.marginLeft = next === 0 ? '' : next + 'em';
    }

    onChange(ref.current.innerHTML || '');
  }, [onChange]);

  // ── Gestion du clavier ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    ev => {
      // Tab → indenter (Shift+Tab → désindenter)
      if (ev.key === 'Tab' && multiline) {
        ev.preventDefault();
        handleIndent(!ev.shiftKey);
        return;
      }

      // Enter dans une cellule de tableau → saut de ligne, pas de nouveau bloc
      if (ev.key === 'Enter' && multiline && !mention.active) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          let node = sel.getRangeAt(0).commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
          let walker = node;
          while (walker && walker !== ref.current) {
            const tag = walker.tagName?.toUpperCase();
            if (tag === 'TD' || tag === 'TH') {
              ev.preventDefault();
              // insertLineBreak est la commande prévue pour <br> dans contenteditable
              document.execCommand('insertLineBreak');
              onChange(ref.current.innerHTML || '');
              return;
            }
            walker = walker.parentNode;
          }
        }
      }

      // Ctrl+B / Ctrl+I / Ctrl+U → formatage
      if ((ev.ctrlKey || ev.metaKey) && multiline) {
        if (ev.key === 'b') { ev.preventDefault(); applyFormat('bold'); return; }
        if (ev.key === 'i') { ev.preventDefault(); applyFormat('italic'); return; }
        if (ev.key === 'u') { ev.preventDefault(); applyFormat('underline'); return; }
      }

      // Navigation dans la liste de @mentions
      if (!mention.active || !filtered.length) return;
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setSelectedIndex(i => (i + 1) % filtered.length);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
      } else if (ev.key === 'Enter' && mention.active) {
        ev.preventDefault();
        insertMention(filtered[selectedIndex]);
      } else if (ev.key === 'Escape') {
        setMention({ active: false, query: '', charCount: 0 });
      }
    },
    [mention, filtered, selectedIndex, insertMention, multiline, applyFormat, handleIndent, onChange],
  );

  // ── Rendu mode simple (input) ─────────────────────────────────────────

  if (!multiline) {
    return (
      <input
        ref={ref}
        value={value || ''}
        onChange={ev => onChange(ev.target.value)}
        placeholder={placeholder}
        style={{ ...sInp, ...xs }}
      />
    );
  }

  // ── Rendu mode WYSIWYG (contenteditable) ──────────────────────────────

  const editableStyle = {
    ...sInp,
    minHeight: 120,
    lineHeight: 1.7,
    textAlign: 'justify',
    whiteSpace: 'pre-wrap',
    overflowY: 'auto',
    cursor: 'text',
    ...xs,
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar de formatage */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); applyFormat('bold'); }}
          style={toolbarBtn}
          title="Gras (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); applyFormat('italic'); }}
          style={toolbarBtn}
          title="Italique (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); applyFormat('underline'); }}
          style={{ ...toolbarBtn, textDecoration: 'underline' }}
          title="Souligner (Ctrl+U)"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); applyFormat('insertUnorderedList'); }}
          style={{ ...toolbarBtn, fontSize: 14 }}
          title="Liste à puces (toggle)"
        >
          ≡
        </button>
        <button
          type="button"
          onMouseDown={e => {
            e.preventDefault();
            // Sauvegarder le curseur avant que le picker ne prenne le focus
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              savedRangeRef.current = sel.getRangeAt(0).cloneRange();
            }
            setTablePicker(p => p ? null : { rows: 3, cols: 2 });
          }}
          style={{ ...toolbarBtn, fontSize: 14 }}
          title="Insérer un tableau"
        >
          ⊞
        </button>
      </div>

      {/* Sélecteur de taille de tableau */}
      {tablePicker && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
          <input
            type="number" min={1} max={20}
            value={tablePicker.rows}
            onChange={e => setTablePicker(p => ({ ...p, rows: Math.max(1, +e.target.value) }))}
            style={{ ...sInp, width: 52, padding: '3px 6px', fontSize: 12 }}
          />
          <span style={{ color: T.mu, fontSize: 12 }}>lignes ×</span>
          <input
            type="number" min={1} max={10}
            value={tablePicker.cols}
            onChange={e => setTablePicker(p => ({ ...p, cols: Math.max(1, +e.target.value) }))}
            style={{ ...sInp, width: 52, padding: '3px 6px', fontSize: 12 }}
          />
          <span style={{ color: T.mu, fontSize: 12 }}>col.</span>
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              insertEmptyTable(tablePicker.rows, tablePicker.cols);
              setTablePicker(null);
            }}
            style={{ ...sBs, color: T.ac, borderColor: T.ac + '44', padding: '3px 10px' }}
          >
            Créer
          </button>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setTablePicker(null); }}
            style={{ ...sBs, padding: '3px 8px' }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseMove={handleColMouseMove}
        onMouseDown={handleColMouseDown}
        data-placeholder={placeholder}
        style={editableStyle}
      />

      {/* Liste de suggestions @mention */}
      {mention.active && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            zIndex: 100,
            background: T.bgC,
            border: `1px solid ${T.bd}`,
            borderRadius: 6,
            maxHeight: 240,
            overflowY: 'auto',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          }}
        >
          {filtered.map((entry, i) => {
            const cat = CATEGORIES[entry.category];
            return (
              <div
                key={entry.id}
                onClick={() => insertMention(entry)}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{
                  padding: '8px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: i === selectedIndex ? T.bgH : 'transparent',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.bd}` : 'none',
                }}
              >
                <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
                  <div style={{ fontSize: 11, color: T.mu }}>{cat?.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
