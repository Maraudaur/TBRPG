import { useEffect, useState } from 'react';
import type { CharacterDefinition } from '../sim/types';
import { characterStore, gearStore, abilityStore, passiveStore } from '../storage';
import { ELEMENTS, GEAR_SLOTS, newId } from './shared/constants';
import { StatBlockEditor, defaultStatBlock } from './shared/StatBlockEditor';

function blankCharacter(): CharacterDefinition {
  return {
    kind: 'character',
    id: newId('character'),
    name: 'New Character',
    element: 'physical',
    level: 1,
    xp: 0,
    archetype: '',
    baseStats: defaultStatBlock(),
    abilities: [],
    gear: {},
    passives: [],
  };
}

export function CharacterBuilder() {
  const [items, setItems] = useState<CharacterDefinition[]>([]);
  const [draft, setDraft] = useState<CharacterDefinition>(blankCharacter());
  const gearItems = gearStore.list();
  const abilities = abilityStore.list();
  const passives = passiveStore.list();

  function refresh() {
    setItems(characterStore.list());
  }

  useEffect(refresh, []);

  function save() {
    characterStore.save(draft);
    refresh();
  }

  function remove(id: string) {
    characterStore.delete(id);
    if (draft.id === id) setDraft(blankCharacter());
    refresh();
  }

  return (
    <div className="builder-screen">
      <div className="builder-list">
        <h3>Characters</h3>
        <button type="button" className="btn-add" onClick={() => setDraft(blankCharacter())}>
          + new character
        </button>
        <ul>
          {items.map((c) => (
            <li key={c.id} className={c.id === draft.id ? 'selected' : ''}>
              <span onClick={() => setDraft(c)}>{c.name} (Lv{c.level})</span>
              <button type="button" className="btn-remove" onClick={() => remove(c.id)}>
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="builder-form">
        <h3>Edit Character</h3>
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
            archetype
            <input
              type="text"
              value={draft.archetype ?? ''}
              onChange={(e) => setDraft({ ...draft, archetype: e.target.value })}
            />
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
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })}
            />
          </label>
          <label>
            xp
            <input type="number" min={0} value={draft.xp ?? 0} onChange={(e) => setDraft({ ...draft, xp: Number(e.target.value) })} />
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
          Save Character
        </button>
      </div>
    </div>
  );
}
