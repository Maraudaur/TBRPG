import { useEffect, useState } from 'react';
import type { StatusEffectDef } from '../sim/types';
import { statusStore } from '../storage';
import { newId } from './shared/constants';
import { BindingEditor } from './shared/BindingEditor';
import type { Binding } from '../sim/types';

/** Statuses default to an OnTurnStart + self tick, since that's the shape of
 * every existing built-in behavior (Burn's damage tick, Regen's heal tick).
 * Still fully editable to any other trigger for non-tick statuses. */
function defaultStatusBinding(): Binding {
  return { trigger: 'OnTurnStart', conditions: [{ type: 'self' }], effects: [], priority: 0 };
}

function blankStatus(): StatusEffectDef {
  return {
    id: newId('status'),
    name: 'New Status',
    description: '',
    stackable: false,
    maxStacks: undefined,
    defaultDuration: 3,
    bindings: [],
  };
}

export function StatusBuilder() {
  const [items, setItems] = useState<StatusEffectDef[]>([]);
  const [draft, setDraft] = useState<StatusEffectDef>(blankStatus());

  function refresh() {
    setItems(statusStore.list());
  }

  useEffect(refresh, []);

  function save() {
    statusStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    statusStore.delete(id);
    if (draft.id === id) setDraft(blankStatus());
    refresh();
  }

  const bindings = draft.bindings ?? [];

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Statuses</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankStatus())}>
          + new status
        </button>
        <ul>
          {items.map((s) => (
            <li key={s.id} className={s.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(s)}>{s.name}</span>
              <button type="button" className="btn-remove" onClick={() => remove(s.id)}>
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="builder-form">
        <h3>Edit Status</h3>
        <p className="hint">
          A status with no bindings is a pure flag/resource (like Frost) — something other bindings can check via a hasStatus condition
          or burn off via ConsumeStatus. Add an OnTurnStart binding to give it a per-turn tick (like Burn's damage or Regen's heal).
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
          <label>
            <input
              type="checkbox"
              checked={draft.stackable}
              onChange={(e) => setDraft({ ...draft, stackable: e.target.checked })}
            />
            stackable
          </label>
          <label>
            max stacks {!draft.stackable && '(n/a — not stackable)'}
            <input
              type="number"
              min={1}
              disabled={!draft.stackable}
              value={draft.maxStacks ?? ''}
              onChange={(e) => setDraft({ ...draft, maxStacks: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </label>
          <label>
            default duration (turns)
            <input
              type="number"
              min={1}
              value={draft.defaultDuration ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, defaultDuration: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </label>
        </div>

        <fieldset>
          <legend>bindings — optional; e.g. an OnTurnStart tick, or leave empty for a pure flag status</legend>
          {bindings.map((b, i) => (
            <BindingEditor
              key={i}
              value={b}
              onChange={(nb) => {
                const next = [...bindings];
                next[i] = nb;
                setDraft({ ...draft, bindings: next });
              }}
              onRemove={() => setDraft({ ...draft, bindings: bindings.filter((_, idx) => idx !== i) })}
            />
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={() => setDraft({ ...draft, bindings: [...bindings, defaultStatusBinding()] })}
          >
            + add binding
          </button>
        </fieldset>

        <button type="button" className="btn-save" onClick={save}>
          Save Status
        </button>
      </div>
    </div>
  );
}
