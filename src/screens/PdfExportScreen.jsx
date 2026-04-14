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
      await new Promise(r => setTimeout(r, 200));
      if (cancelled || !renderRef.current) return;

      const entry = entries[exportQueue[exportingIdx]];

      try {
        // Pré-charger les images en data URL pour éviter les problèmes CORS avec html2canvas
        const imgEls = Array.from(renderRef.current.querySelectorAll('img'));
        await Promise.all(imgEls.map(async img => {
          if (!img.src || img.src.startsWith('data:')) return;
          try {
            const resp = await fetch(img.src);
            const blob = await resp.blob();
            const dataUrl = await new Promise(resolve => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            img.src = dataUrl;
            await new Promise(resolve => {
              if (img.complete && img.naturalWidth > 0) resolve();
              else { img.onload = resolve; img.onerror = resolve; }
            });
          } catch (e) {
            console.warn('Image non chargeable pour le PDF :', img.src, e);
          }
        }));

        if (cancelled || !renderRef.current) return;

        const canvas = await html2canvas(renderRef.current, {
          backgroundColor: '#1a1915',
          scale: 1.5,
          useCORS: true,
          logging: false,
          imageTimeout: 8000,
        });

        const A4W = 595; // points
        const A4H = 842;
        const ptPerPx = A4W / canvas.width; // points per canvas pixel
        const pxPerPage = Math.round(A4H / ptPerPx); // canvas pixels fitting one PDF page

        const BG = [26, 25, 21]; // #1a1915
        const TOL = 20;

        // Pixel-data pour la détection des lignes de fond (découpe intelligente)
        let pixelData = null;
        try {
          pixelData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        } catch (e) {
          // Canvas tainted (image CORS) — découpe intelligente désactivée
        }

        // Découpe intelligente : trouver la ligne la plus proche de nominalY
        // qui soit à ≥90% fond (évite de couper en plein texte).
        const findSafeCut = (nominalY) => {
          if (!pixelData) return nominalY;
          const limit = Math.max(0, nominalY - 300);
          const step = 4; // échantillonnage (1 pixel sur 4)
          for (let y = Math.min(nominalY, canvas.height - 1); y > limit; y--) {
            let bgCount = 0;
            let total = 0;
            for (let x = 0; x < canvas.width; x += step) {
              total++;
              const i = (y * canvas.width + x) * 4;
              if (
                Math.abs(pixelData[i]   - BG[0]) <= TOL &&
                Math.abs(pixelData[i+1] - BG[1]) <= TOL &&
                Math.abs(pixelData[i+2] - BG[2]) <= TOL
              ) bgCount++;
            }
            if (bgCount / total >= 0.9) return y;
          }
          return nominalY;
        };

        // Trouver le bas réel du contenu (ignorer l'espace vide de padding en bas)
        let contentBottom = canvas.height;
        if (pixelData) {
          for (let y = canvas.height - 1; y >= 0; y--) {
            let hasContent = false;
            for (let x = 0; x < canvas.width; x += 4) {
              const i = (y * canvas.width + x) * 4;
              if (
                Math.abs(pixelData[i]   - BG[0]) > TOL ||
                Math.abs(pixelData[i+1] - BG[1]) > TOL ||
                Math.abs(pixelData[i+2] - BG[2]) > TOL
              ) { hasContent = true; break; }
            }
            if (hasContent) {
              contentBottom = Math.min(y + 20, canvas.height); // +20px marge sous le contenu
              break;
            }
          }
        }

        // Construire les points de découpe (en pixels canvas)
        const cuts = [0];
        let nextNominal = pxPerPage;
        while (nextNominal < contentBottom) {
          const safe = findSafeCut(nextNominal);
          cuts.push(safe);
          nextNominal = safe + pxPerPage;
        }
        // Ajouter le bas du contenu (pas canvas.height, pour éviter la page vide)
        if (cuts[cuts.length - 1] < contentBottom) cuts.push(contentBottom);

        // Build PDF — one cropped slice per page
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        pdf.setFillColor(26, 25, 21); // #1a1915 — fond de l'app
        for (let i = 0; i < cuts.length - 1; i++) {
          if (i > 0) pdf.addPage();
          // Remplir toute la page avec la couleur de fond (espace libre en bas de dernière page)
          pdf.rect(0, 0, A4W, A4H, 'F');
          const y0 = cuts[i];
          const y1 = cuts[i + 1];
          const tmp = document.createElement('canvas');
          tmp.width = canvas.width;
          tmp.height = y1 - y0;
          tmp.getContext('2d').drawImage(canvas, 0, -y0);
          pdf.addImage(tmp.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, A4W, (y1 - y0) * ptPerPx);
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
