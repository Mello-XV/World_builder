/**
 * FieldRenderer — orchestrateur de rendu des champs.
 *
 * Deux fonctions exportées :
 * - renderFieldEdit  : rendu d'un champ en mode édition
 * - renderFieldView  : rendu d'un champ en mode lecture
 *
 * Chaque "type" de champ (text, textarea, select, affiliations, famille...)
 * est dispatché vers le bon composant.
 */

import { SearchSelect } from '../ui/SearchSelect';
import { MultiSearchSelect } from '../ui/MultiSearchSelect';
import { MentionField } from '../ui/MentionField';
import { RichText } from '../ui/RichText';
import { AffiliationsEditor, AffiliationsView } from './AffiliationsField';
import { FamilleEditor, FamilleView } from './FamilleField';
import { RelationsREditor, RelationsRView } from './RelationsRField';
import { PersLiesEditor, PersLiesView } from './PersLiesField';
import { CATEGORIES } from '../../constants/categories';
import { T, sSel } from '../../styles/theme';

// ── Helpers pour construire les options des SearchSelect ──────────────────

function entryOptions(entries, category) {
  const cat = CATEGORIES[category];
  return Object.values(entries)
    .filter(e => e.category === category)
    .map(e => ({ value: String(e.id), label: e.name, icon: cat?.icon }));
}

function multiEntryOptions(entries, categories) {
  return categories.flatMap(category => entryOptions(entries, category));
}

// ── Rendu en mode ÉDITION ─────────────────────────────────────────────────

export function renderFieldEdit(field, fields, setFields, entries, _charName) {
  const value = fields[field.key];
  const update = val => setFields(prev => ({ ...prev, [field.key]: val }));

  switch (field.type) {
    case 'affiliations':
      return <AffiliationsEditor value={value || []} onChange={update} entries={entries} />;

    case 'famille':
      return <FamilleEditor value={value || []} onChange={update} entries={entries} />;

    case 'relationsRoyaumes':
      return <RelationsREditor value={value || []} onChange={update} entries={entries} />;

    case 'personnagesLies':
      return <PersLiesEditor value={value || []} onChange={update} entries={entries} />;

    case 'searchNation':
      return (
        <SearchSelect
          value={value || ''}
          onChange={update}
          options={entryOptions(entries, 'nation')}
          placeholder="Choisir une nation…"
        />
      );

    case 'searchPersonnage':
      return (
        <SearchSelect
          value={value || ''}
          onChange={update}
          options={entryOptions(entries, 'personnage')}
          placeholder="Choisir un personnage…"
        />
      );

    case 'searchCapitale': {
      const opts = Object.values(entries)
        .filter(e => e.category === 'lieu' && e.fields?.typeLieu === 'Capitale')
        .map(e => ({ value: String(e.id), label: e.name, icon: '🗺️' }));
      return (
        <SearchSelect value={value || ''} onChange={update} options={opts} placeholder="Choisir une capitale…" />
      );
    }

    case 'searchDynastie':
      return (
        <SearchSelect
          value={value || ''}
          onChange={update}
          options={entryOptions(entries, 'dynastieFamiliale')}
          placeholder="Choisir une dynastie…"
        />
      );

    case 'searchReligion':
      return (
        <SearchSelect
          value={value || ''}
          onChange={update}
          options={entryOptions(entries, 'religion')}
          placeholder="Choisir une religion…"
        />
      );

    case 'multiSearchDynastie':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={entryOptions(entries, 'dynastieFamiliale')}
          placeholder="+ Ajouter une dynastie…"
        />
      );

    case 'multiSearchReligion':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={entryOptions(entries, 'religion')}
          placeholder="+ Ajouter une religion…"
        />
      );

    case 'multiSearchCulture':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={entryOptions(entries, 'culture')}
          placeholder="+ Ajouter une culture…"
        />
      );

    case 'multiSearchLangue':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={entryOptions(entries, 'langue')}
          placeholder="+ Ajouter une langue…"
        />
      );

    case 'multiSearchNationLieu':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={multiEntryOptions(entries, ['nation', 'lieu'])}
          placeholder="+ Ajouter…"
        />
      );

    case 'multiSearchAll':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={multiEntryOptions(entries, [
            'nation',
            'personnage',
            'organisation',
            'religion',
            'dynastieFamiliale',
          ])}
          placeholder="+ Ajouter une affiliation…"
        />
      );

    case 'multiSearchLieu':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={entryOptions(entries, 'lieu')}
          placeholder="+ Ajouter un lieu…"
        />
      );

    case 'multiSearchDivinite':
      return (
        <MultiSearchSelect
          value={Array.isArray(value) ? value : []}
          onChange={update}
          options={entryOptions(entries, 'divinite')}
          placeholder="+ Ajouter une divinité…"
        />
      );

    case 'select':
      return (
        <select
          style={sSel}
          value={value || ''}
          onChange={ev => update(ev.target.value)}
        >
          <option value="">— Sélectionner —</option>
          {field.options.map(o => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <MentionField
          value={value || ''}
          onChange={update}
          entries={entries}
          placeholder={`${field.label}… @mention`}
          multiline={field.type === 'textarea'}
        />
      );
  }
}

// ── Rendu en mode LECTURE ─────────────────────────────────────────────────

export function renderFieldView(field, fields, entries, onNav) {
  const value = fields?.[field.key];
  if (!value || (Array.isArray(value) && !value.length)) return null;

  switch (field.type) {
    case 'affiliations':
      return <AffiliationsView value={value} entries={entries} onNav={onNav} />;

    case 'famille':
      return <FamilleView value={value} entries={entries} onNav={onNav} />;

    case 'relationsRoyaumes':
      return <RelationsRView value={value} entries={entries} onNav={onNav} />;

    case 'personnagesLies':
      return <PersLiesView value={value} entries={entries} onNav={onNav} />;

    case 'searchNation':
    case 'searchPersonnage':
    case 'searchCapitale':
    case 'searchDynastie':
    case 'searchReligion': {
      const id = parseInt(value);
      const entry = entries[id];
      if (!entry) return value;
      const cat = CATEGORIES[entry.category];
      return (
        <span
          onClick={() => onNav(id)}
          style={{
            color: cat?.color || T.ac,
            cursor: 'pointer',
            borderBottom: `1px dotted ${cat?.color}`,
            fontWeight: 600,
          }}
        >
          {cat?.icon + ' ' + entry.name}
        </span>
      );
    }

    default:
      if (field.type?.startsWith('multiSearch')) {
        const ids = Array.isArray(value) ? value : [];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ids.map(id => {
              const entry = entries[parseInt(id)];
              if (!entry) return null;
              const cat = CATEGORIES[entry.category];
              return (
                <span
                  key={id}
                  onClick={() => onNav(parseInt(id))}
                  style={{
                    color: cat?.color || T.ac,
                    cursor: 'pointer',
                    borderBottom: `1px dotted ${cat?.color}`,
                    fontWeight: 600,
                  }}
                >
                  {cat?.icon + ' ' + entry.name}
                </span>
              );
            })}
          </div>
        );
      }

      if (typeof value === 'string') {
        return <RichText text={value} entries={entries} onNav={onNav} />;
      }

      return String(value);
  }
}
