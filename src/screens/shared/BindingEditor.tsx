import type { Binding } from '../../sim/types';
import { TRIGGER_TYPES } from './constants';
import { ConditionEditor, defaultCondition } from './ConditionEditor';
import { EffectEditor, defaultEffect } from './EffectEditor';

interface Props {
  value: Binding;
  onChange: (value: Binding) => void;
  onRemove?: () => void;
}

/**
 * Editor for the unified Binding shape (trigger + conditions[] + effects[] +
 * priority) — used identically for ability cast effects, gear affixes, and
 * innate passives.
 */
export function BindingEditor({ value, onChange, onRemove }: Props) {
  return (
    <div className="binding-editor">
      <div className="binding-editor-header">
        <input
          type="text"
          placeholder="binding name (for logs)"
          value={value.name ?? ''}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
        <label>
          trigger
          <select value={value.trigger} onChange={(e) => onChange({ ...value, trigger: e.target.value as typeof value.trigger })}>
            {TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          priority
          <input
            type="number"
            value={value.priority ?? 0}
            onChange={(e) => onChange({ ...value, priority: Number(e.target.value) })}
          />
        </label>
        {onRemove && (
          <button type="button" className="btn-remove" onClick={onRemove}>
            remove binding
          </button>
        )}
      </div>

      <fieldset>
        <legend>conditions (AND'd)</legend>
        {value.conditions.map((c, i) => (
          <ConditionEditor
            key={i}
            value={c}
            onChange={(nc) => {
              const next = [...value.conditions];
              next[i] = nc;
              onChange({ ...value, conditions: next });
            }}
            onRemove={() => onChange({ ...value, conditions: value.conditions.filter((_, idx) => idx !== i) })}
          />
        ))}
        <button
          type="button"
          className="btn-add"
          onClick={() => onChange({ ...value, conditions: [...value.conditions, defaultCondition('self')] })}
        >
          + add condition
        </button>
      </fieldset>

      <fieldset>
        <legend>effects (run in order)</legend>
        {value.effects.map((eff, i) => (
          <EffectEditor
            key={i}
            value={eff}
            onChange={(ne) => {
              const next = [...value.effects];
              next[i] = ne;
              onChange({ ...value, effects: next });
            }}
            onRemove={() => onChange({ ...value, effects: value.effects.filter((_, idx) => idx !== i) })}
          />
        ))}
        <button
          type="button"
          className="btn-add"
          onClick={() => onChange({ ...value, effects: [...value.effects, defaultEffect('DealDamage')] })}
        >
          + add effect
        </button>
      </fieldset>
    </div>
  );
}

export function defaultBinding(): Binding {
  return { trigger: 'OnAbilityCast', conditions: [], effects: [], priority: 0 };
}
