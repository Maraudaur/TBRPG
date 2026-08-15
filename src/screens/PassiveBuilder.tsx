import { useEffect, useState } from 'react';
import type { Binding, PassiveDef } from '../sim/types';
import { passiveStore } from '../storage';
import { newId } from './shared/constants';
import { BindingEditor } from './shared/BindingEditor';

/** Passives are reactive, not cast — OnAbilityCast rarely makes sense as a
 * default trigger for them the way it does for abilities. OnDamageDealt +
 * self is the most common shape ("whenever I hit something, ..."). */
function defaultPassiveBinding(): Binding {
  return { trigger: 'OnDamageDealt', conditions: [{ type: 'self' }], effects: [], priority: 0 };
}

function blankPassive(): PassiveDef {
  return {
    id: newId('passive'),
    name: 'New Passive',
    description: '',
    bindings: [defaultPassiveBinding()],
  };
}

export function PassiveBuilder() {
  const [items, setItems] = useState<PassiveDef[]>([]);
  const [draft, setDraft] = useState<PassiveDef>(blankPassive());

  function refresh() {
    setItems(passiveStore.list());
  }

  useEffect(refresh, []);

  function save() {
    passiveStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    passiveStore.delete(id);
    if (draft.id === id) setDraft(blankPassive());
    refresh();
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Passives</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankPassive())}>
          + new passive
        </button>
        <ul>
          {items.map((p) => (
            <li key={p.id} className={p.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(p)}>{p.name}</span>
              <button type="button" className="btn-remove" onClick={() => remove(p.id)}>
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="builder-form">
        <h3>Edit Passive (binding editor)</h3>
        <p className="hint">
          Build the passive once here, then attach it to any character or enemy from their "passives" list on the Characters/Enemies
          screen — the same way abilities are attached, instead of authoring the logic inline per-unit.
        </p>
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
        </div>

        <fieldset>
          <legend>bindings — reactive triggers (e.g. OnDamageDealt, OnTurnStart, OnHPThresholdCrossed)</legend>
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
            onClick={() => setDraft({ ...draft, bindings: [...draft.bindings, defaultPassiveBinding()] })}
          >
            + add binding
          </button>
        </fieldset>

        <button type="button" className="btn-save" onClick={save}>
          Save Passive
        </button>
      </div>
    </div>
  );
}
