/**
 * EntryEditor — formulaire de création/édition d'une fiche.
 *
 * Affiche :
 * - Champs communs : nom, photo, description, tags
 * - Champs spécifiques à la catégorie (définis dans CATEGORIES)
 * - Sections personnalisées (libres)
 * - Boutons Enregistrer / Annuler
 */

import { useState } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { MentionField } from '../ui/MentionField';
import { renderFieldEdit } from '../fields/FieldRenderer';
import { uploadEntryPhoto } from '../../lib/firestore';
import { T, sCard, sInp, sLbl, sBtnA, sBtn, sBs } from '../../styles/theme';

export function EntryEditor({ entry, category, entries, onSave, onCancel, flash }) {
  const cat = CATEGORIES[category];
  const [name, setName] = useState(entry.name);
  const [description, setDescription] = useState(entry.description || '');
  const [tags, setTags] = useState(entry.tags || '');
  const [photo, setPhoto] = useState(entry.photo || '');
  const [fields, setFields] = useState({ ...entry.fields });
  const [customSections, setCustomSections] = useState(entry.customSections || []);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const isRecit = category === 'recit';

  const handleSave = () => {
    if (!name.trim()) {
      flash('Nom obligatoire');
      return;
    }
    onSave({
      name: name.trim(),
      description,
      tags,
      photo,
      fields,
      customSections,
      memberRoles: entry.memberRoles || {},
    });
  };

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

  const addCustomSection = () => {
    if (!newSectionTitle.trim()) return;
    setCustomSections([
      ...customSections,
      { id: Date.now().toString(), title: newSectionTitle.trim(), content: '' },
    ]);
    setNewSectionTitle('');
  };

  return (
    <>
      {/* ── Champs communs ── */}
      <div style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
        {/* Nom */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...sLbl, color: T.ac }}>Nom *</label>
          <input
            style={{ ...sInp, fontSize: 18, fontWeight: 700 }}
            value={name}
            onChange={ev => setName(ev.target.value)}
          />
        </div>

        {/* Photo (pas pour les récits) */}
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={photoUploading}
                  style={{ display: 'none' }}
                />
              </label>
              {photo && (
                <button style={{ ...sBs, color: '#9b4d4d' }} onClick={() => setPhoto('')}>
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Description (pas pour les récits) */}
        {!isRecit && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...sLbl, color: T.ac }}>Description</label>
            <MentionField
              value={description}
              onChange={setDescription}
              entries={entries}
              placeholder="@mention"
              multiline
            />
          </div>
        )}

        {/* Tags (pas pour les récits) */}
        {!isRecit && (
          <div>
            <label style={{ ...sLbl, color: T.ac }}>Tags</label>
            <input
              style={sInp}
              value={tags}
              onChange={ev => setTags(ev.target.value)}
              placeholder="tag1, tag2…"
            />
          </div>
        )}
      </div>

      {/* ── Champs spécifiques à la catégorie ── */}
      <div style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
          Champs — {cat.label}
        </div>
        {cat.fields.map(f => {
          const label =
            f.key === 'personnagesLies' ? `Personnages secondaires liés à ${name || '…'}` : f.label;
          return (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ ...sLbl, color: cat.color }}>
                {label}
                {f.group === 'general' && (
                  <span style={{ fontSize: 10, color: T.dm }}> (info gén.)</span>
                )}
              </label>
              {renderFieldEdit(f, fields, setFields, entries, name)}
            </div>
          );
        })}
      </div>

      {/* ── Sections personnalisées ── */}
      <div style={{ ...sCard, cursor: 'default', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.dm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
          Sections personnalisées
        </div>

        {customSections.map((section, i) => (
          <div key={section.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label style={{ ...sLbl, color: T.ac, marginBottom: 0, flex: 1 }}>
                {section.title}
              </label>
              <button
                onClick={() => setCustomSections(customSections.filter(x => x.id !== section.id))}
                style={{ ...sBs, color: '#9b4d4d', padding: '2px 8px' }}
              >
                🗑
              </button>
            </div>
            <MentionField
              value={section.content}
              onChange={v => {
                const updated = [...customSections];
                updated[i] = { ...updated[i], content: v };
                setCustomSections(updated);
              }}
              entries={entries}
              placeholder="Contenu…"
              multiline
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ ...sInp, flex: 1, fontSize: 13 }}
            value={newSectionTitle}
            onChange={ev => setNewSectionTitle(ev.target.value)}
            placeholder="Titre nouvelle section…"
            onKeyDown={ev => {
              if (ev.key === 'Enter') addCustomSection();
            }}
          />
          <button
            onClick={addCustomSection}
            style={{ ...sBs, color: T.ac, borderColor: T.ac + '44' }}
          >
            + Section
          </button>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
        <button style={sBtnA} onClick={handleSave}>
          {entry.id ? 'Enregistrer' : 'Créer'}
        </button>
        <button style={sBtn} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </>
  );
}
