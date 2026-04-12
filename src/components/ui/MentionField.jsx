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
import { T, sInp } from '../../styles/theme';

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

// ── Nettoyage du HTML collé (Word, navigateur) ────────────────────────────
// Supprime les styles étrangers (fond blanc, polices, marges Word)
// en ne conservant que le gras/italique/souligné et les balises structurelles.

function cleanPastedHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Supprimer les éléments non-contenu
  doc.querySelectorAll('style, meta, link, script').forEach(el => el.remove());

  const allEls = doc.body.querySelectorAll('*');
  allEls.forEach(el => {
    const tag = el.tagName.toLowerCase();

    // Mémoriser le formatage avant de tout effacer
    const isBold = el.style.fontWeight === 'bold' || el.style.fontWeight === '700';
    const isItalic = el.style.fontStyle === 'italic';
    const isUnderline = el.style.textDecoration?.includes('underline');

    // Supprimer tous les attributs de style Word
    el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('lang');
    el.removeAttribute('align');
    el.removeAttribute('valign');

    // Réappliquer uniquement le formatage voulu
    if (isBold) el.style.fontWeight = 'bold';
    if (isItalic) el.style.fontStyle = 'italic';
    if (isUnderline) el.style.textDecoration = 'underline';

    // Harmoniser les marges des paragraphes entre édition et vue
    if (tag === 'p' || tag === 'div') {
      el.style.margin = '4px 0';
      el.style.lineHeight = '1.7';
    }
  });

  return doc.body.innerHTML;
}

export function MentionField({ value, onChange, entries, placeholder, multiline, style: xs }) {
  const [mention, setMention] = useState({ active: false, query: '', charCount: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef(null);

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

  // ── Collage de tableau TSV ─────────────────────────────────────────────

  const handlePaste = useCallback(
    ev => {
      if (!multiline) return;
      ev.preventDefault();

      const plain = ev.clipboardData.getData('text/plain');
      const htmlClip = ev.clipboardData.getData('text/html');

      // Détecter un vrai tableau TSV : TOUTES les lignes non-vides ont des tabs.
      // Cela évite de transformer des listes à puces (•\tTexte) en tableau,
      // car la première ligne de titre n'a pas de tab.
      const plainLines = plain.trim().split('\n').filter(l => l.trim());
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

      // Texte ordinaire : nettoyer le HTML Word/navigateur (fond blanc, polices…)
      // ou utiliser le texte brut si pas de HTML dans le presse-papiers.
      if (htmlClip) {
        const cleaned = cleanPastedHtml(htmlClip);
        document.execCommand('insertHTML', false, cleaned);
      } else {
        const escaped = plain
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        document.execCommand('insertHTML', false, escaped);
      }
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

  // ── Gestion du clavier ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    ev => {
      // Tab → 4 espaces (mode multiline)
      if (ev.key === 'Tab' && multiline) {
        ev.preventDefault();
        document.execCommand('insertText', false, '    ');
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
    [mention, filtered, selectedIndex, insertMention, multiline, applyFormat],
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
        <span style={{ color: T.dm, fontSize: 10, alignSelf: 'center', marginLeft: 4 }}>
          @mention · Tab pour indenter · coller un tableau Excel
        </span>
      </div>

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
