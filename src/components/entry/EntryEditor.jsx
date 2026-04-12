/**
 * EntryEditor — formulaire de création/édition d'une fiche.
 *
 * Affiche :
 * - Champs communs fixes : nom, photo, description, tags
 * - Zone A « Infos générales » (group:"general") — réorganisable par drag & drop
 * - Zone B « Sections de contenu » (autres champs + sections perso) — réorganisable
 * - L'ordre est sauvegardé dans la fiche (generalOrder / contentOrder)
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CATEGORIES } from '../../constants/categories';
import { MentionField } from '../ui/MentionField';
import { renderFieldEdit } from '../fields/FieldRenderer';
import { uploadEntryPhoto } from '../../lib/firestore';
import { T, sCard, sInp, sLbl, sBtnA, sBtn, sBs } from '../../styles/theme';

// ── Wrapper drag-and-drop ─────────────────────────────────────────────────

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 16,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        title="Déplacer"
        style={{
          cursor: 'grab',
          color: T.dm,
          fontSize: 20,
          paddingTop: 4,
          userSelect: 'none',
          flexShrink: 0,
          lineHeight: 1,
          touchAction: 'none',
        }}
      >
        ⠿
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────

export function EntryEditor({ entry, category, entries, onSave, onCancel, flash }) {
  const cat = CATEGORIES[category];
  const isRecit = category === 'recit';

  const [name, setName] = useState(entry.name);
  const [description, setDescription] = useState(entry.description || '');
  const [tags, setTags] = useState(entry.tags || '');
  const [photo, setPhoto] = useState(entry.photo || '');
  const [fields, setFields] = useState({ ...entry.fields });
  const [customSections, setCustomSections] = useState(entry.customSections || []);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  // ── Clés de base par zone ─────────────────────────────────────────────

  const generalBaseKeys = cat.fields.filter(f => f.group === 'general').map(f => f.key);
  const contentBaseKeys = cat.fields.filter(f => f.group !== 'general').map(f => f.key);

  // ── États d'ordre (initialisés depuis la fiche, complétés si manquants) ─

  const [generalOrder, setGeneralOrder] = useState(() => {
    const saved = entry.generalOrder ?? [];
    const filtered = saved.filter(k => generalBaseKeys.includes(k));
    const missing = generalBaseKeys.filter(k => !filtered.includes(k));
    return [...filtered, ...missing];
  });

  const [contentOrder, setContentOrder] = useState(() => {
    const sectionIds = (entry.customSections || []).map(s => s.id);
    const allIds = [...contentBaseKeys, ...sectionIds];
    const saved = entry.contentOrder ?? [];
    const filtered = saved.filter(id => allIds.includes(id));
    const missing = allIds.filter(id => !filtered.includes(id));
    return [...filtered, ...missing];
  });

  // ── Listes ordonnées pour le rendu ────────────────────────────────────

  const orderedGeneralFields = generalOrder
    .map(k => cat.fields.find(f => f.key === k))
    .filter(Boolean);

  const orderedContentItems = contentOrder
    .map(id => {
      const field = cat.fields.find(f => f.key === id);
      if (field) return { type: 'field', id, field };
      const section = customSections.find(s => s.id === id);
      if (section) return { type: 'section', id, section };
      return null;
    })
    .filter(Boolean);

  // ── Sensors dnd-kit (distance 5px évite les drags accidentels) ────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEndGeneral = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    setGeneralOrder(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)));
  }, []);

  const handleDragEndContent = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    setContentOrder(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)));
  }, []);

  // ── Photo ─────────────────────────────────────────────────────────────

  const handlePhotoChange = async ev => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadEntryPhoto(file);
      setPhoto(url);
    } catch (e) {
      flash('Erreur upload photo');
      console.error(e);
    } finally {
      setPhotoUploading(false);
    }
  };

  // ── Sections personnalisées ───────────────────────────────────────────

  const addCustomSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSection = { id: Date.now().toString(), title: newSectionTitle.trim(), content: '' };
    setCustomSections(prev => [...prev, newSection]);
    setContentOrder(prev => [...prev, newSection.id]);
    setNewSectionTitle('');
  };

  const deleteCustomSection = useCallback(sectionId => {
    setCustomSections(prev => prev.filter(s => s.id !== sectionId));
    setContentOrder(prev => prev.filter(id => id !== sectionId));
  }, []);

  // ── Sauvegarde ────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!name.trim()) { flash('Nom obligatoire'); return; }
    onSave({
      name: name.trim(),
      description,
      tags,
      photo,
      fields,
      customSections,
      memberRoles: entry.memberRoles || {},
      generalOrder,
      contentOrder,
    });
  };

  // ── Rendu ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Champs communs (fixes, non déplaçables) ── */}
      <div style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...sLbl, color: T.ac }}>Nom *</label>
          <input
            style={{ ...sInp, fontSize: 18, fontWeight: 700 }}
            value={name}
            onChange={ev => setName(ev.target.value)}
          />
        </div>

        {!isRecit && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...sLbl, color: T.ac }}>Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {photo && (
                <img
                  src={photo}
                  style={{ width: 60, height: 60, borderRadius: 4, objectFit: 'cover' }}
                  alt="preview"
                />
              )}
              <label style={{ ...sBs, cursor: photoUploading ? 'wait' : 'pointer', opacity: photoUploading ? 0.6 : 1 }}>
                {photoUploading ? '⏳ Upload…' : `📷 ${photo ? 'Changer' : 'Ajouter'}`}
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={photoUploading} style={{ display: 'none' }} />
              </label>
              {photo && (
                <button style={{ ...sBs, color: '#9b4d4d' }} onClick={() => setPhoto('')}>✕</button>
              )}
            </div>
          </div>
        )}

        {!isRecit && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...sLbl, color: T.ac }}>Description</label>
            <MentionField value={description} onChange={setDescription} entries={entries} placeholder="@mention" multiline />
          </div>
        )}

        {!isRecit && (
          <div>
            <label style={{ ...sLbl, color: T.ac }}>Tags</label>
            <input style={sInp} value={tags} onChange={ev => setTags(ev.target.value)} placeholder="tag1, tag2…" />
          </div>
        )}
      </div>

      {/* ── Zone A : Informations générales (drag & drop) ── */}
      {!isRecit && orderedGeneralFields.length > 0 && (
        <div style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            Informations générales — {cat.label}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndGeneral}>
            <SortableContext items={generalOrder} strategy={verticalListSortingStrategy}>
              {orderedGeneralFields.map(f => (
                <SortableItem key={f.key} id={f.key}>
                  <label style={{ ...sLbl, color: cat.color }}>{f.label}</label>
                  {renderFieldEdit(f, fields, setFields, entries, name)}
                </SortableItem>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ── Zone B : Sections de contenu (drag & drop, champs + sections perso) ── */}
      <div style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
          {isRecit ? 'Sections' : `Sections de contenu — ${cat.label}`}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndContent}>
          <SortableContext items={contentOrder} strategy={verticalListSortingStrategy}>
            {orderedContentItems.map(item => {
              if (item.type === 'field') {
                const f = item.field;
                const label = f.key === 'personnagesLies'
                  ? `Personnages secondaires liés à ${name || '…'}`
                  : f.label;
                return (
                  <SortableItem key={f.key} id={f.key}>
                    <label style={{ ...sLbl, color: cat.color }}>{label}</label>
                    {renderFieldEdit(f, fields, setFields, entries, name)}
                  </SortableItem>
                );
              }
              // Section personnalisée
              const s = item.section;
              const idx = customSections.findIndex(cs => cs.id === s.id);
              return (
                <SortableItem key={s.id} id={s.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <label style={{ ...sLbl, color: T.ac, marginBottom: 0, flex: 1 }}>{s.title}</label>
                    <button
                      onClick={() => deleteCustomSection(s.id)}
                      style={{ ...sBs, color: '#9b4d4d', padding: '2px 8px' }}
                    >
                      🗑
                    </button>
                  </div>
                  <MentionField
                    value={s.content}
                    onChange={v => {
                      setCustomSections(prev => {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], content: v };
                        return updated;
                      });
                    }}
                    entries={entries}
                    placeholder="Contenu…"
                    multiline
                  />
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Ajouter une section personnalisée */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input
            style={{ ...sInp, flex: 1, fontSize: 13 }}
            value={newSectionTitle}
            onChange={ev => setNewSectionTitle(ev.target.value)}
            placeholder="Titre nouvelle section…"
            onKeyDown={ev => { if (ev.key === 'Enter') addCustomSection(); }}
          />
          <button onClick={addCustomSection} style={{ ...sBs, color: T.ac, borderColor: T.ac + '44' }}>
            + Section
          </button>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
        <button style={sBtnA} onClick={handleSave}>{entry.id ? 'Enregistrer' : 'Créer'}</button>
        <button style={sBtn} onClick={onCancel}>Annuler</button>
      </div>
    </>
  );
}
