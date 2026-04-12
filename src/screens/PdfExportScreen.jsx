/**
 * PdfExportScreen — sélection et export des fiches en PDF.
 *
 * Chaque fiche sélectionnée génère un fichier PDF séparé.
 * Le rendu utilise EntryView (mode visuel) via html2canvas + jsPDF.
 */

import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EntryView } from '../components/entry/EntryView';
import { CATEGORIES } from '../constants/categories';
import { T, sCard, sBtnA, sBtn, sBs } from '../styles/theme';

export function PdfExportScreen({ project, data, onBack }) {
  const entries = data.entries;

  const [selected, setSelected] = useState(new Set());
  const [exportQueue, setExportQueue] = useState([]);
  const [exportingIdx, setExportingIdx] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const renderRef = useRef(null);

  // Grouper les fiches par catégorie
  const grouped = {};
  Object.values(entries).forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });

  const toggle = id => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectAll  = () => setSelected(new Set(Object.values(entries).map(e => e.id)));
  const selectNone = () => setSelected(new Set());

  const startExport = () => {
    if (selected.size === 0) return;
    const queue = [...selected];
    setExportQueue(queue);
    setExportingIdx(0);
    setDoneCount(0);
    setIsExporting(true);
  };

  // ── Boucle d'export séquentielle ─────────────────────────────────────

  useEffect(() => {
    if (!isExporting || exportingIdx < 0) return;

    if (exportingIdx >= exportQueue.length) {
      setIsExporting(false);
      setExportingIdx(-1);
      return;
    }

    let cancelled = false;

    const doExport = async () => {
      // Attendre que React ait rendu l'entryView dans le conteneur caché
      await new Promise(r => setTimeout(r, 450));
      if (cancelled || !renderRef.current) return;

      const entry = entries[exportQueue[exportingIdx]];

      try {
        const canvas = await html2canvas(renderRef.current, {
          backgroundColor: '#1a1915',
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 8000,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const A4W = 595; // points
        const A4H = 842;
        const imgW = A4W;
        const imgH = (canvas.height / canvas.width) * A4W;

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        let y = 0;
        while (y < imgH) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH);
          y += A4H;
        }

        const safeName = (entry.name || 'fiche').replace(/[/\\?%*:|"<>]/g, '_');
        pdf.save(`${safeName}.pdf`);
      } catch (err) {
        console.error('Erreur export PDF:', err);
      }

      if (!cancelled) {
        setDoneCount(prev => prev + 1);
        setExportingIdx(prev => prev + 1);
      }
    };

    doExport();
    return () => { cancelled = true; };
  }, [isExporting, exportingIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentEntry = isExporting && exportingIdx >= 0 && exportingIdx < exportQueue.length
    ? entries[exportQueue[exportingIdx]]
    : null;

  const totalEntries = Object.keys(entries).length;

  return (
    <>
      {/* Conteneur de rendu hors-écran pour html2canvas */}
      <div
        ref={renderRef}
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: 860,
          minHeight: 200,
          background: '#1a1915',
          padding: '40px 40px 60px',
          color: '#e8e0d0',
          fontFamily: "'Cormorant Garamond', serif",
          zIndex: -1,
        }}
      >
        {currentEntry && (
          <EntryView
            entry={currentEntry}
            entries={entries}
            onNav={() => {}}
            onUpdateEntry={() => {}}
          />
        )}
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '20px 0 14px', borderBottom: `1px solid ${T.bd}`, marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <button style={{ ...sBtn, padding: '6px 10px' }} onClick={onBack} disabled={isExporting}>
          ← Retour
        </button>
        <h2 style={{ margin: 0, fontSize: 20, color: T.ac, flex: 1, fontWeight: 700 }}>
          Exporter en PDF — {project.name}
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={sBs} onClick={selectAll} disabled={isExporting}>
            Tout sélectionner
          </button>
          <button style={sBs} onClick={selectNone} disabled={isExporting}>
            Tout désélectionner
          </button>
          <button
            style={{
              ...sBtnA, padding: '7px 18px',
              opacity: selected.size === 0 || isExporting ? 0.5 : 1,
            }}
            onClick={startExport}
            disabled={selected.size === 0 || isExporting}
          >
            {isExporting
              ? `${doneCount} / ${exportQueue.length} en cours…`
              : `Exporter${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>

      {/* Barre de progression */}
      {isExporting && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: T.bgI, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: T.ac, borderRadius: 2,
              width: `${(doneCount / exportQueue.length) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
          <p style={{ color: T.mu, fontSize: 12, marginTop: 6 }}>
            Export en cours : {currentEntry?.name || '…'}
          </p>
        </div>
      )}

      {/* Message si pas de fiches */}
      {totalEntries === 0 && (
        <div style={{ ...sCard, cursor: 'default', textAlign: 'center', padding: 40 }}>
          <p style={{ color: T.mu }}>Ce projet ne contient pas encore de fiches.</p>
        </div>
      )}

      {/* Liste des fiches par catégorie */}
      {Object.entries(grouped).map(([cat, catEntries]) => {
        const catInfo = CATEGORIES[cat];
        if (!catInfo) return null;
        return (
          <div key={cat} style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
            <div style={{
              fontSize: 11, color: catInfo.color, letterSpacing: 2,
              textTransform: 'uppercase', fontWeight: 700, marginBottom: 12,
            }}>
              {catInfo.icon} {catInfo.label} ({catEntries.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {catEntries.map(e => {
                const isSelected = selected.has(e.id);
                return (
                  <label
                    key={e.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      cursor: isExporting ? 'not-allowed' : 'pointer',
                      padding: '5px 12px',
                      border: `1px solid ${isSelected ? T.ac : T.bd}`,
                      borderRadius: 4,
                      background: isSelected ? T.ac + '22' : 'transparent',
                      transition: 'all 0.15s',
                      opacity: isExporting ? 0.7 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => !isExporting && toggle(e.id)}
                      style={{ accentColor: T.ac, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13 }}>{e.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
