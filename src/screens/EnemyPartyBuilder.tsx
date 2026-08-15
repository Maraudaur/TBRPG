import { useEffect, useState } from 'react';
import type { EnemyParty, Row } from '../sim/types';
import { enemyStore, enemyPartyStore } from '../storage';
import { newId } from './shared/constants';

function blankEnemyParty(): EnemyParty {
  return {
    id: newId('enemy_party'),
    name: 'New Enemy Party',
    slots: Array.from({ length: 6 }, (_, i) => ({ slotIndex: i, row: (i < 3 ? 'front' : 'back') as Row, enemyId: null })),
  };
}

export function EnemyPartyBuilder() {
  const [items, setItems] = useState<EnemyParty[]>([]);
  const [draft, setDraft] = useState<EnemyParty>(blankEnemyParty());
  const enemies = enemyStore.list();

  function refresh() {
    setItems(enemyPartyStore.list());
  }

  useEffect(refresh, []);

  function save() {
    enemyPartyStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    enemyPartyStore.delete(id);
    if (draft.id === id) setDraft(blankEnemyParty());
    refresh();
  }

  function updateSlot(index: number, patch: Partial<EnemyParty['slots'][number]>) {
    const next = draft.slots.map((s) => (s.slotIndex === index ? { ...s, ...patch } : s));
    setDraft({ ...draft, slots: next });
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Enemy Parties</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankEnemyParty())}>
          + new enemy party
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
        <h3>Edit Enemy Party (up to 6, front/back row)</h3>
        <p className="hint">
          Build a whole encounter once here — the Test Combat screen picks one of these instead of checking enemies off one at a time.
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
                        value={slot.enemyId ?? ''}
                        onChange={(e) => updateSlot(slot.slotIndex, { enemyId: e.target.value === '' ? null : e.target.value })}
                      >
                        <option value="">(empty)</option>
                        {enemies.map((en) => (
                          <option key={en.id} value={en.id}>
                            {en.name}
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
          Save Enemy Party
        </button>
      </div>
    </div>
  );
}
