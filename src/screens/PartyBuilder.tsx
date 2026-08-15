import { useEffect, useState } from 'react';
import type { Party, Row } from '../sim/types';
import { characterStore, partyStore } from '../storage';
import { newId } from './shared/constants';

function blankParty(): Party {
  return {
    id: newId('party'),
    name: 'New Party',
    slots: Array.from({ length: 6 }, (_, i) => ({ slotIndex: i, row: (i < 3 ? 'front' : 'back') as Row, characterId: null })),
  };
}

export function PartyBuilder() {
  const [items, setItems] = useState<Party[]>([]);
  const [draft, setDraft] = useState<Party>(blankParty());
  const characters = characterStore.list();

  function refresh() {
    setItems(partyStore.list());
  }

  useEffect(refresh, []);

  function save() {
    partyStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    partyStore.delete(id);
    if (draft.id === id) setDraft(blankParty());
    refresh();
  }

  function updateSlot(index: number, patch: Partial<Party['slots'][number]>) {
    const next = draft.slots.map((s) => (s.slotIndex === index ? { ...s, ...patch } : s));
    setDraft({ ...draft, slots: next });
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Parties</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankParty())}>
          + new party
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
        <h3>Edit Party (up to 6, front/back row)</h3>
        <div className="editor-fields">
          <label>
            id
            <input type="text" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} />
          </label>
          <label>
            name
            <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
        </div>

        <div className="party-rows">
          {(['front', 'back'] as Row[]).map((row) => (
            <fieldset key={row}>
              <legend>{row} row</legend>
              <div className="party-slot-group">
                {draft.slots
                  .filter((s) => s.row === row)
                  .map((slot) => (
                    <div key={slot.slotIndex} className="party-slot">
                      <span>slot {slot.slotIndex + 1}</span>
                      <select
                        value={slot.characterId ?? ''}
                        onChange={(e) => updateSlot(slot.slotIndex, { characterId: e.target.value === '' ? null : e.target.value })}
                      >
                        <option value="">(empty)</option>
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.row}
                        onChange={(e) => updateSlot(slot.slotIndex, { row: e.target.value as Row })}
                      >
                        <option value="front">front</option>
                        <option value="back">back</option>
                      </select>
                    </div>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>

        <button type="button" className="btn-save" onClick={save}>
          Save Party
        </button>
      </div>
    </div>
  );
}
