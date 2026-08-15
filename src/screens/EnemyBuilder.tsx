import { useEffect, useState } from 'react';
import type { EnemyDefinition } from '../sim/types';
import { enemyStore, gearStore, abilityStore, passiveStore } from '../storage';
import { ELEMENTS, GEAR_SLOTS, newId } from './shared/constants';
import { StatBlockEditor, defaultStatBlock } from './shared/StatBlockEditor';

function blankEnemy(): EnemyDefinition {
  return {
    kind: 'enemy',
    id: newId('enemy'),
    name: 'New Enemy',
    element: 'physical',
    level: 1,
    baseStats: defaultStatBlock(),
    abilities: [],
    gear: {},
    passives: [],
  };
}

export function EnemyBuilder() {
  const [items, setItems] = useState<EnemyDefinition[]>([]);
  const [draft, setDraft] = useState<EnemyDefinition>(blankEnemy());
  const gearItems = gearStore.list();
  const abilities = abilityStore.list();
  const passives = passiveStore.list();

  function refresh() {
    setItems(enemyStore.list());
  }

  useEffect(refresh, []);

  function save() {
    enemyStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    enemyStore.delete(id);
    if (draft.id === id) setDraft(blankEnemy());
    refresh();
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Enemies</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankEnemy())}>
          + new enemy
        </button>
        <ul>
          {items.map((c) => (
            <li key={c.id} className={c.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(c)}>{c.name}</span>
              <button type="button" className="btn-remove" onClick={() => remove(c.id)}>
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="builder-form">
        <h3>Edit Enemy</h3>
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
            level
            <input
              type="number"
              min={1}
              value={draft.level ?? 1}
              onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })}
            />
          </label>
        </div>

        <fieldset>
          <legend>base stats</legend>
          <StatBlockEditor value={draft.baseStats} onChange={(baseStats) => setDraft({ ...draft, baseStats })} />
        </fieldset>

        <fieldset>
          <legend>equipped gear</legend>
          <div className="editor-fields">
            {GEAR_SLOTS.map((slot) => (
              <label key={slot}>
                {slot}
                <select
                  value={draft.gear?.[slot] ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, gear: { ...draft.gear, [slot]: e.target.value === '' ? undefined : e.target.value } })
                  }
                >
                  <option value="">(none)</option>
                  {gearItems
                    .filter((g) => g.slot === slot)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>known abilities</legend>
          <div className="checkbox-list">
            {abilities.map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  checked={draft.abilities.includes(a.id)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      abilities: e.target.checked ? [...draft.abilities, a.id] : draft.abilities.filter((id) => id !== a.id),
                    })
                  }
                />
                {a.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>passives</legend>
          {passives.length === 0 && <p className="hint">No passives saved yet — build one on the Passives tab, then attach it here.</p>}
          <div className="checkbox-list">
            {passives.map((p) => (
              <label key={p.id} title={p.description}>
                <input
                  type="checkbox"
                  checked={(draft.passives ?? []).includes(p.id)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      passives: e.target.checked
                        ? [...(draft.passives ?? []), p.id]
                        : (draft.passives ?? []).filter((id) => id !== p.id),
                    })
                  }
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="button" className="btn-save" onClick={save}>
          Save Enemy
        </button>
      </div>
    </div>
  );
}
