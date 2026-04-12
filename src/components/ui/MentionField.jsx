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

  return `<table style="border-collapse:collapse;width:100%;font-size:14px;margin:8px 0"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table><br>`;
}


export function MentionField({ value, onChange, entries, placeholder, multiline, style: xs }) {
  const [mention, setMention] = useState({ active: false, query: '', charCount: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tablePicker, setTablePicker] = useState(null); // null | { rows, cols }
  const ref = useRef(null);
  const savedRangeRef = useRef(null); // curseur sauvegardé avant ouverture du table picker

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
    const html = `<table style="border-collapse:collapse;width:100%;font-size:14px;margin:8px 0"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table><br>`;
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

      // Détecter une liste à puces : chaque ligne commence par un caractère puce.
      // Ces listes ont souvent un tab après la puce (format Word/Office) et
      // seraient faussement détectées comme TSV sans cette vérification en premier.
      const BULLET_RE = /^\s*[•·▪▸►‣⁃∙○●◦\u2022\u2023\u25E6]\s*/;
      const isBulletList = plainLines.length > 0 && plainLines.every(l => BULLET_RE.test(l));

      if (isBulletList) {
        const items = plainLines.map(l => {
          const text = l.replace(BULLET_RE, '').replace(/^\t/, '').trim();
          const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<li style="margin:3px 0;line-height:1.7">${escaped}</li>`;
        }).join('');
        document.execCommand('insertHTML', false,
          `<ul style="margin:6px 0;padding-left:22px">${items}</ul>`);
        onChange(ref.current?.innerHTML || '');
        return;
      }

      // Détecter un vrai tableau TSV : TOUTES les lignes non-vides ont des tabs.
      const isTsv =
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

      // Texte ordinaire : chaque ligne non-vide devient un <p>.
      const htmlContent = plain
        .split(/\r?\n/)
        .map(line => {
          const text = line.trim();
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
    onChange(html);

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

  // ── Indentation de bloc (Tab / Shift+Tab) ────────────────────────────

  const indentCurrentBlock = useCallback((increase) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !ref.current) return;

    // Remonter jusqu'au fils direct du contenteditable,
    // sans jamais dépasser ref.current lui-même.
    const findDirectChild = () => {
      const s = window.getSelection();
      if (!s || !s.rangeCount) return null;
      let n = s.getRangeAt(0).commonAncestorContainer;
      if (n.nodeType === 3) n = n.parentNode;
      while (n && n !== ref.current && n.parentNode && n.parentNode !== ref.current) {
        n = n.parentNode;
      }
      return (n && n !== ref.current) ? n : null;
    };

    let node = findDirectChild();

    // Si le texte est directement dans le contenteditable (pas dans un bloc),
    // on l'enveloppe dans un <div> avant d'appliquer l'indentation.
    if (!node) {
      document.execCommand('formatBlock', false, 'div');
      node = findDirectChild();
      if (!node) return;
    }

    const STEP = 32; // px par niveau d'indentation
    const current = parseInt(node.style.paddingLeft, 10) || 0;
    const next = increase ? current + STEP : Math.max(0, current - STEP);
    node.style.paddingLeft = next > 0 ? `${next}px` : '';
    onChange(ref.current.innerHTML);
  }, [onChange]);

  // ── Gestion du clavier ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    ev => {
      // Tab → indenter le bloc entier (Shift+Tab → désindenter)
      if (ev.key === 'Tab' && multiline) {
        ev.preventDefault();
        indentCurrentBlock(!ev.shiftKey);
        return;
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
    [mention, filtered, selectedIndex, insertMention, multiline, applyFormat, indentCurrentBlock],
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
