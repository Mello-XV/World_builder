/**
 * MentionField — champ texte enrichi avec autocomplétion @mention.
 *
 * Fonctionnalités (mode multiline uniquement) :
 * - Toolbar : gras (Ctrl+B), italique (Ctrl+I), souligner (Ctrl+U)
 * - Touche Tab : insère une indentation (4 espaces)
 * - Collage de tableau (Excel/Sheets) : convertit automatiquement en format pipe |col|col|
 * - @mention : autocomplétion vers les fiches existantes → [[Nom]]
 *
 * Le textarea est non-contrôlé (defaultValue) pour préserver l'historique
 * natif du navigateur et permettre Ctrl+Z après chaque modification.
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

export function MentionField({ value, onChange, entries, placeholder, multiline, style: xs }) {
  const [mention, setMention] = useState({ active: false, query: '', startPos: 0 });
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

  // ── Formatage inline — lit et écrit directement dans le DOM ──────────
  // Le textarea est non-contrôlé : on ne passe jamais par la prop `value`
  // pour les modifications programmatiques, ce qui préserve l'historique
  // natif du navigateur (Ctrl+Z fonctionne correctement).

  const applyFormat = useCallback(
    wrap => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const cur = ta.value;
      const selected = cur.slice(start, end);
      const newVal = cur.slice(0, start) + wrap + selected + wrap + cur.slice(end);
      ta.value = newVal;
      onChange(newVal);
      setTimeout(() => {
        ta.selectionStart = start + wrap.length;
        ta.selectionEnd = end + wrap.length;
        ta.focus();
      }, 0);
    },
    [onChange],
  );

  // ── Collage de tableau TSV (Excel / Google Sheets / Word) ────────────

  const handlePaste = useCallback(
    ev => {
      if (!multiline) return;
      const text = ev.clipboardData.getData('text/plain');
      if (!text.includes('\t')) return;

      ev.preventDefault();
      const converted = text
        .trim()
        .split('\n')
        .map(row => row.split('\t').join('|'))
        .join('\n');

      const ta = ref.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = ta.value.slice(0, start) + converted + ta.value.slice(end);
      ta.value = newVal;
      onChange(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + converted.length;
      }, 0);
    },
    [multiline, onChange],
  );

  // ── Détection du "@" pour les mentions ───────────────────────────────

  const handleChange = useCallback(
    ev => {
      const val = ev.target.value;
      const pos = ev.target.selectionStart;
      onChange(val);

      const before = val.slice(0, pos);
      const atIndex = before.lastIndexOf('@');

      if (atIndex >= 0 && (atIndex === 0 || ' \n'.includes(before[atIndex - 1]))) {
        const query = before.slice(atIndex + 1);
        if (!query.includes('\n') && query.length < 30) {
          setMention({ active: true, query, startPos: atIndex });
          return;
        }
      }
      setMention({ active: false, query: '', startPos: 0 });
    },
    [onChange],
  );

  // ── Insertion d'une mention ───────────────────────────────────────────

  const insertMention = useCallback(
    entry => {
      const ta = ref.current;
      const before = ta.value.slice(0, mention.startPos);
      const after = ta.value.slice(ta.selectionStart);
      const link = `[[${entry.name}]]`;
      const newVal = before + link + after;
      ta.value = newVal;
      onChange(newVal);
      setMention({ active: false, query: '', startPos: 0 });
      setTimeout(() => {
        const newPos = before.length + link.length;
        ta.setSelectionRange(newPos, newPos);
        ta.focus();
      }, 10);
    },
    [mention.startPos, onChange],
  );

  // ── Gestion du clavier ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    ev => {
      // Tab → indentation (4 espaces)
      if (ev.key === 'Tab' && multiline) {
        ev.preventDefault();
        const ta = ref.current;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = ta.value.slice(0, start) + '    ' + ta.value.slice(end);
        ta.value = newVal;
        onChange(newVal);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        }, 0);
        return;
      }

      // Ctrl+B / Ctrl+I / Ctrl+U → formatage
      if ((ev.ctrlKey || ev.metaKey) && multiline) {
        if (ev.key === 'b') { ev.preventDefault(); applyFormat('**'); return; }
        if (ev.key === 'i') { ev.preventDefault(); applyFormat('*'); return; }
        if (ev.key === 'u') { ev.preventDefault(); applyFormat('__'); return; }
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
        setMention({ active: false, query: '', startPos: 0 });
      }
    },
    [mention, filtered, selectedIndex, insertMention, multiline, applyFormat, onChange],
  );

  const inputStyle = {
    ...sInp,
    textAlign: 'justify',
    ...(multiline ? { minHeight: 100, resize: 'vertical', lineHeight: 1.6 } : {}),
    ...xs,
  };

  const InputTag = multiline ? 'textarea' : 'input';

  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar de formatage (uniquement pour les champs multilignes) */}
      {multiline && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); applyFormat('**'); }}
            style={toolbarBtn}
            title="Gras (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); applyFormat('*'); }}
            style={toolbarBtn}
            title="Italique (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); applyFormat('__'); }}
            style={{ ...toolbarBtn, textDecoration: 'underline' }}
            title="Souligner (Ctrl+U)"
          >
            U
          </button>
          <span style={{ color: T.dm, fontSize: 10, alignSelf: 'center', marginLeft: 4 }}>
            @mention · Tab pour indenter · coller un tableau Excel
          </span>
        </div>
      )}

      {/* Textarea non-contrôlé : defaultValue préserve l'historique Ctrl+Z */}
      <InputTag
        ref={ref}
        defaultValue={value || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        style={inputStyle}
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
