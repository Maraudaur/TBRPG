import { useEffect, useMemo, useState } from 'react';
import type { Ability, AbilityTargetType, Element } from '../sim/types';
import { abilityStore } from '../storage';
import { ELEMENTS, TARGET_TYPES, newId } from './shared/constants';
import { BindingEditor, defaultBinding } from './shared/BindingEditor';

function blankAbility(): Ability {
  return {
    id: newId('ability'),
    name: 'New Ability',
    description: '',
    apCost: 1,
    targetType: 'singleEnemy',
    element: 'physical',
    levelRequirement: 1,
    bindings: [{ ...defaultBinding(), trigger: 'OnAbilityCast' }],
  };
}

type SortMode = 'name' | 'element' | 'apCost';

const ELEMENT_FILTERS = ['all', ...ELEMENTS] as const;
const TARGET_FILTERS = ['all', ...TARGET_TYPES] as const;

/** Short readable summary of what an ability's own OnAbilityCast binding
 * does, e.g. "Deal fire damage · Apply burn" — lets the list be scanned/
 * searched without opening every ability. */
function effectSummary(ability: Ability): string {
  const castBindings = ability.bindings.filter((b) => b.trigger === 'OnAbilityCast');
  const types = castBindings.flatMap((b) => b.effects.map((e) => e.type));
  return [...new Set(types)].join(', ');
}

export function AbilityBuilder() {
  const [items, setItems] = useState<Ability[]>([]);
  const [draft, setDraft] = useState<Ability>(blankAbility());
  const [search, setSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<'all' | Element>('all');
  const [targetFilter, setTargetFilter] = useState<'all' | AbilityTargetType>('all');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  function refresh() {
    setItems(abilityStore.list());
  }

  useEffect(refresh, []);

  function save() {
    abilityStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    abilityStore.delete(id);
    if (draft.id === id) setDraft(blankAbility());
    refresh();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((a) => {
        if (elementFilter !== 'all' && a.element !== elementFilter) return false;
        if (targetFilter !== 'all' && a.targetType !== targetFilter) return false;
        if (!q) return true;
        const haystack = `${a.name} ${a.id} ${a.description ?? ''} ${effectSummary(a)}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        switch (sortMode) {
          case 'element':
            return a.element.localeCompare(b.element) || a.name.localeCompare(b.name);
          case 'apCost':
            return a.apCost - b.apCost || a.name.localeCompare(b.name);
          case 'name':
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [items, search, elementFilter, targetFilter, sortMode]);

  const filtersActive = search.trim() !== '' || elementFilter !== 'all' || targetFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setElementFilter('all');
    setTargetFilter('all');
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Abilities</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankAbility())}>
          + new ability
        </button>

        <div className="builder-filters">
          <input
            type="text"
            className="builder-search"
            placeholder="Search name, id, description, effect…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="builder-filter-row">
            <select value={elementFilter} onChange={(e) => setElementFilter(e.target.value as 'all' | Element)}>
              {ELEMENT_FILTERS.map((el) => (
                <option key={el} value={el}>
                  {el === 'all' ? 'all elements' : el}
                </option>
              ))}
            </select>
            <select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value as 'all' | AbilityTargetType)}>
              {TARGET_FILTERS.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'all targets' : t}
                </option>
              ))}
            </select>
          </div>
          <div className="builder-filter-row">
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
              <option value="name">sort: name</option>
              <option value="element">sort: element</option>
              <option value="apCost">sort: AP cost</option>
            </select>
            {filtersActive && (
              <button type="button" className="btn-remove" onClick={clearFilters}>
                clear
              </button>
            )}
          </div>
          <div className="builder-filter-count">
            {filtered.length} of {items.length}
          </div>
        </div>

        <ul>
          {filtered.map((a) => (
            <li key={a.id} className={a.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(a)} className="builder-item-main">
                <span className="builder-item-name">{a.name}</span>
                <span className="builder-item-meta">
                  {a.element} · {a.targetType} · {a.apCost} AP
                </span>
              </span>
              <button type="button" className="btn-remove" onClick={() => remove(a.id)}>
                x
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="builder-empty">No abilities match.</li>}
        </ul>
      </div>

      <div className="builder-form">
        <h3>Edit Ability (binding editor)</h3>
        <div className="editor-fields">
          <label>
            id
            <input type="text" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
          </label>
          <label>
            name
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            description
            <input
              type="text"
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <label>
            AP cost
            <input type="number" min={0} value={draft.apCost} onChange={(e) => setDraft({ ...draft, apCost: Number(e.target.value) })} />
          </label>
          <label>
            target type
            <select
              value={draft.targetType}
              onChange={(e) => setDraft({ ...draft, targetType: e.target.value as typeof draft.targetType })}
            >
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            element
            <select value={draft.element} onChange={(e) => setDraft({ ...draft, element: e.target.value as typeof draft.element })}>
              {ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {el}
                </option>
              ))}
            </select>
          </label>
          <label>
            level requirement
            <input
              type="number"
              min={1}
              value={draft.levelRequirement ?? 1}
              onChange={(e) => setDraft({ ...draft, levelRequirement: Number(e.target.value) })}
            />
          </label>
        </div>

        <fieldset>
          <legend>bindings — at least one should use trigger 'OnAbilityCast'</legend>
          {draft.bindings.map((b, i) => (
            <BindingEditor
              key={i}
              value={b}
              onChange={(nb) => {
                const next = [...draft.bindings];
                next[i] = nb;
                setDraft({ ...draft, bindings: next });
              }}
              onRemove={() => setDraft({ ...draft, bindings: draft.bindings.filter((_, idx) => idx !== i) })}
            />
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={() => setDraft({ ...draft, bindings: [...draft.bindings, defaultBinding()] })}
          >
            + add binding
          </button>
        </fieldset>

        <button type="button" className="btn-save" onClick={save}>
          Save Ability
        </button>
      </div>
    </div>
  );
}
