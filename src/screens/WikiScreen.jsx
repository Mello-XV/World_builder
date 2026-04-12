/**
 * WikiScreen — écran principal du wiki (quand un projet est ouvert).
 *
 * Gère la navigation entre les vues :
 * - dashboard   : grille des catégories + récents
 * - list        : liste filtrée d'une catégorie
 * - entry       : affichage d'une fiche (lecture ou édition)
 * - new         : formulaire de création de fiche
 * - pdf-export  : sélection + export des fiches en PDF
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { saveProject, saveProjectData } from '../lib/firestore';
import { AppHeader } from '../components/layout/AppHeader';
import { SearchOverlay } from '../components/layout/SearchOverlay';
import { Toast } from '../components/layout/Toast';
import { DeleteEntryModal } from '../components/modals/DeleteEntryModal';
import { EditProjectNameModal } from '../components/modals/EditProjectNameModal';
import { DashboardScreen } from './DashboardScreen';
import { PdfExportScreen } from './PdfExportScreen';
import { EntryList } from '../components/entry/EntryList';
import { EntryView } from '../components/entry/EntryView';
import { EntryEditor } from '../components/entry/EntryEditor';
import { CATEGORIES } from '../constants/categories';
import { T, sBtn } from '../styles/theme';

export function WikiScreen({ project: initialProject, data: initialData, onGoProjects, onProjectUpdate, onProfile, userProfile }) {
  const [project, setProject] = useState(initialProject);
  const [data, setData] = useState(initialData);
  const [view, setView] = useState('dashboard'); // 'dashboard'|'list'|'entry'|'new'|'pdf-export'
  const [curCat, setCurCat] = useState(null);
  const [curId, setCurId] = useState(null);
  const [mode, setMode] = useState('visual');
  const [listSearch, setListSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [delEntry, setDelEntry] = useState(null);
  const [editProjName, setEditProjName] = useState(null);

  const saveTimer = useRef(null);

  // ── Sauvegarde automatique ────────────────────────────────────────────

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveProjectData(project.id, data);
      if (!ok) {
        setToast('Erreur de sauvegarde — photo trop volumineuse ?');
        setTimeout(() => setToast(null), 4000);
      }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [data, project.id]);

  // ── Raccourci Ctrl+K ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setEditProjName(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────

  const flash = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const nav = useCallback(id => {
    setCurId(id); setView('entry'); setMode('visual');
    setSearchOpen(false); setSearchQuery('');
  }, []);

  const searchResults = searchQuery.trim()
    ? Object.values(data.entries)
        .filter(e =>
          [e.name, e.description || '', ...Object.values(e.fields || {}).map(v => (typeof v === 'string' ? v : ''))]
            .join(' ').toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 15)
    : [];

  const handleRenameProject = () => {
    if (!editProjName?.trim()) return;
    const updated = { ...project, name: editProjName.trim() };
    saveProject(updated);
    setProject(updated);
    onProjectUpdate(updated);
    setEditProjName(null);
    flash('Renommé !');
  };

  const handleDeleteEntry = () => {
    const entryCategory = delEntry.category;
    const updated = { ...data.entries };
    delete updated[delEntry.id];
    setData({ ...data, entries: updated });
    setDelEntry(null);
    setCurCat(entryCategory); setListSearch(''); setView('list');
    flash('Supprimée');
  };

  const handleSaveEntry = upd => {
    try {
      const now = Date.now();
      setData({ ...data, entries: { ...data.entries, [curId]: { ...data.entries[curId], ...upd, updatedAt: now } } });
      flash('Enregistré');
      setTimeout(() => setMode('visual'), 50);
    } catch { flash('Erreur'); }
  };

  const handleCreateEntry = upd => {
    try {
      const id = data.nextId;
      const now = Date.now();
      setData({ entries: { ...data.entries, [id]: { id, category: curCat, ...upd, createdAt: now, updatedAt: now } }, nextId: id + 1 });
      flash('Créée');
      setTimeout(() => { setCurId(id); setView('entry'); setMode('visual'); }, 50);
    } catch { flash('Erreur'); }
  };

  const curEntry = curId ? data.entries[curId] : null;
  const cat = curCat ? CATEGORIES[curCat] : null;

  return (
    <>
      <AppHeader
        project={project}
        onGoProjects={onGoProjects}
        onEditName={name => setEditProjName(name)}
        onSearch={() => setSearchOpen(true)}
        onExportPdf={() => setView('pdf-export')}
        onProfile={onProfile}
        userProfile={userProfile}
      />

      {/* ── Export PDF ── */}
      {view === 'pdf-export' && (
        <PdfExportScreen
          project={project}
          data={data}
          onBack={() => setView('dashboard')}
        />
      )}

      {/* ── Dashboard ── */}
      {view === 'dashboard' && (
        <DashboardScreen
          data={data}
          onOpenCategory={key => { setCurCat(key); setListSearch(''); setView('list'); }}
          onNewEntry={key => { setCurCat(key); setView('new'); }}
          onNav={nav}
        />
      )}

      {/* ── Liste ── */}
      {view === 'list' && curCat && (
        <EntryList
          category={curCat}
          entries={data.entries}
          onNav={nav}
          onNew={() => setView('new')}
          onDelete={e => setDelEntry(e)}
          onBack={() => setView('dashboard')}
          search={listSearch}
          onSearch={setListSearch}
        />
      )}

      {/* ── Fiche (lecture / édition) ── */}
      {view === 'entry' && curEntry && (
        <>
          <div style={{ padding: '20px 0 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button style={{ ...sBtn, padding: '6px 10px' }} onClick={() => setView('dashboard')}>←</button>
            <button
              style={{ ...sBtn, padding: '6px 10px' }}
              onClick={() => { setCurCat(curEntry.category); setView('list'); }}
            >
              {CATEGORIES[curEntry.category]?.icon} {CATEGORIES[curEntry.category]?.label}
            </button>
            <div style={{ flex: 1 }} />

            {/* Bascule Lecture / Édition */}
            <div style={{ display: 'flex', border: `1px solid ${T.bd}`, borderRadius: 4, overflow: 'hidden' }}>
              <button
                onClick={() => setMode('visual')}
                style={{ ...sBtn, border: 'none', borderRadius: 0, padding: '6px 14px', fontSize: 12, background: mode === 'visual' ? T.ac : 'transparent', color: mode === 'visual' ? '#0f0e0d' : T.mu }}
              >
                👁
              </button>
              <button
                onClick={() => setMode('editor')}
                style={{ ...sBtn, border: 'none', borderRadius: 0, padding: '6px 14px', fontSize: 12, borderLeft: `1px solid ${T.bd}`, background: mode === 'editor' ? T.ac : 'transparent', color: mode === 'editor' ? '#0f0e0d' : T.mu }}
              >
                ✏️
              </button>
            </div>

            {mode === 'visual' && (
              <button
                style={{ ...sBtn, color: '#9b4d4d', borderColor: '#9b4d4d44', padding: '6px 10px' }}
                onClick={() => setDelEntry(curEntry)}
              >
                🗑
              </button>
            )}
          </div>

          {mode === 'editor' ? (
            <EntryEditor
              key={'edit-' + curId}
              entry={curEntry}
              category={curEntry.category}
              entries={data.entries}
              flash={flash}
              onSave={handleSaveEntry}
              onCancel={() => setMode('visual')}
            />
          ) : (
            <EntryView
              entry={curEntry}
              entries={data.entries}
              onNav={nav}
              onUpdateEntry={updated => setData({ ...data, entries: { ...data.entries, [updated.id]: updated } })}
            />
          )}
        </>
      )}

      {/* ── Nouvelle fiche ── */}
      {view === 'new' && curCat && (
        <>
          <div style={{ padding: '20px 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ ...sBtn, padding: '6px 10px' }} onClick={() => setView('dashboard')}>← Annuler</button>
            <h2 style={{ margin: 0, fontSize: 18, flex: 1, color: cat.color }}>
              {cat.icon} Nouvelle fiche — {cat.label}
            </h2>
          </div>
          <EntryEditor
            key={'new-' + curCat}
            entry={{ name: '', description: '', tags: '', photo: '', fields: {}, customSections: [] }}
            category={curCat}
            entries={data.entries}
            flash={flash}
            onSave={handleCreateEntry}
            onCancel={() => setView('dashboard')}
          />
        </>
      )}

      {/* ── Overlays ── */}
      {searchOpen && (
        <SearchOverlay
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          onNav={nav}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <DeleteEntryModal entry={delEntry} onConfirm={handleDeleteEntry} onCancel={() => setDelEntry(null)} />
      <EditProjectNameModal name={editProjName} onChange={setEditProjName} onConfirm={handleRenameProject} onCancel={() => setEditProjName(null)} />
      <Toast message={toast} />
    </>
  );
}
