import { useEffect, useState } from 'react';
import type { GearItem } from '../sim/types';
import { gearStore } from '../storage';
import { GEAR_SLOTS, newId } from './shared/constants';
import { StatModifierEditor, defaultStatModifier } from './shared/StatModifierEditor';
import { BindingEditor, defaultBinding } from './shared/BindingEditor';

function blankGear(): GearItem {
  return { id: newId('gear'), name: 'New Gear', slot: 'weapon', statModifiers: [], bindings: [] };
}

export function GearBuilder() {
  const [items, setItems] = useState<GearItem[]>([]);
  const [draft, setDraft] = useState<GearItem>(blankGear());

  function refresh() {
    setItems(gearStore.list());
  }

  useEffect(refresh, []);

  function save() {
    gearStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    gearStore.delete(id);
    if (draft.id === id) setDraft(blankGear());
    refresh();
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Gear</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankGear())}>
          + new gear
        </button>
        <ul>
          {items.map((g) => (
            <li key={g.id} className={g.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(g)}>
                {g.name} ({g.slot})
              </span>
              <button type="button" className="btn-remove" onClick={() => remove(g.id)}>
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="builder-form">
        <h3>Edit Gear</h3>
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
            slot
            <select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value as typeof draft.slot })}>
              {GEAR_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend>stat modifiers</legend>
          {draft.statModifiers.map((m, i) => (
            <StatModifierEditor
              key={i}
              value={m}
              onChange={(nm) => {
                const next = [...draft.statModifiers];
                next[i] = nm;
                setDraft({ ...draft, statModifiers: next });
              }}
              onRemove={() => setDraft({ ...draft, statModifiers: draft.statModifiers.filter((_, idx) => idx !== i) })}
            />
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={() => setDraft({ ...draft, statModifiers: [...draft.statModifiers, defaultStatModifier()] })}
          >
            + add stat modifier
          </button>
        </fieldset>

        <fieldset>
          <legend>bindings (optional affix behavior)</legend>
          {(draft.bindings ?? []).map((b, i) => (
            <BindingEditor
              key={i}
              value={b}
              onChange={(nb) => {
                const next = [...(draft.bindings ?? [])];
                next[i] = nb;
                setDraft({ ...draft, bindings: next });
              }}
              onRemove={() => setDraft({ ...draft, bindings: (draft.bindings ?? []).filter((_, idx) => idx !== i) })}
            />
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={() => setDraft({ ...draft, bindings: [...(draft.bindings ?? []), defaultBinding()] })}
          >
            + add binding
          </button>
        </fieldset>

        <button type="button" className="btn-save" onClick={save}>
          Save Gear
        </button>
      </div>
    </div>
  );
}
