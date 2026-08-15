import { useEffect, useState } from 'react';
import type { Ability } from '../sim/types';
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

export function AbilityBuilder() {
  const [items, setItems] = useState<Ability[]>([]);
  const [draft, setDraft] = useState<Ability>(blankAbility());

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

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Abilities</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankAbility())}>
          + new ability
        </button>
        <ul>
          {items.map((a) => (
            <li key={a.id} className={a.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(a)}>{a.name}</span>
              <button type="button" className="btn-remove" onClick={() => remove(a.id)}>
                x
              </button>
            </li>
          ))}
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
