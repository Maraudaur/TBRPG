import type { Condition } from '../../sim/types';
import { CONDITION_SUBJECTS, CONDITION_TYPES, ELEMENTS, ROWS, STAT_COMPARE_STATS, COMPARE_OPS } from './constants';
import { StatusIdInput } from './StatusIdInput';
import { AbilityIdInput } from './AbilityIdInput';

function defaultCondition(type: Condition['type']): Condition {
  switch (type) {
    case 'self':
      return { type: 'self' };
    case 'teammate':
      return { type: 'teammate', target: 'target' };
    case 'statCompare':
      return { type: 'statCompare', target: 'target', stat: 'currentHp', op: '<', value: 0 };
    case 'hasStatus':
      return { type: 'hasStatus', target: 'target', status: 'burn', min: 1 };
    case 'element':
      return { type: 'element', value: 'fire' };
    case 'row':
      return { type: 'row', target: 'target', row: 'front' };
    case 'chance':
      return { type: 'chance', probability: 0.5 };
    case 'wasCrit':
      return { type: 'wasCrit' };
    case 'abilityIs':
      return { type: 'abilityIs', value: '' };
    case 'allOf':
      return { type: 'allOf', conditions: [] };
    case 'anyOf':
      return { type: 'anyOf', conditions: [] };
    case 'not':
      return { type: 'not', condition: { type: 'self' } };
  }
}

interface Props {
  value: Condition;
  onChange: (value: Condition) => void;
  onRemove?: () => void;
}

export function ConditionEditor({ value, onChange, onRemove }: Props) {
  return (
    <div className="editor-row">
      <div className="editor-row-header">
        <select value={value.type} onChange={(e) => onChange(defaultCondition(e.target.value as Condition['type']))}>
          {CONDITION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {onRemove && (
          <button type="button" className="btn-remove" onClick={onRemove}>
            remove
          </button>
        )}
      </div>

      {value.type === 'self' && <span className="hint">owner participated as source or target of the event</span>}

      {value.type === 'teammate' && (
        <div className="editor-fields">
          <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value as typeof value.target })}>
            {CONDITION_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="hint">true if that unit is on the owner's team and isn't the owner itself</span>
        </div>
      )}

      {value.type === 'wasCrit' && <span className="hint">true if the triggering hit was a critical hit</span>}

      {value.type === 'abilityIs' && (
        <div className="editor-fields">
          <AbilityIdInput value={value.value} onChange={(v) => onChange({ ...value, value: v })} />
        </div>
      )}

      {value.type === 'statCompare' && (
        <div className="editor-fields">
          <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value as typeof value.target })}>
            {CONDITION_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={value.stat} onChange={(e) => onChange({ ...value, stat: e.target.value as typeof value.stat })}>
            {STAT_COMPARE_STATS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value as typeof value.op })}>
            {COMPARE_OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            value={value.value}
            onChange={(e) => onChange({ ...value, value: Number(e.target.value) })}
          />
        </div>
      )}

      {value.type === 'hasStatus' && (
        <div className="editor-fields">
          <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value as typeof value.target })}>
            {CONDITION_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <StatusIdInput value={value.status} onChange={(status) => onChange({ ...value, status })} />
          <label>
            min
            <input
              type="number"
              value={value.min ?? ''}
              onChange={(e) => onChange({ ...value, min: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </label>
          <label>
            max
            <input
              type="number"
              value={value.max ?? ''}
              onChange={(e) => onChange({ ...value, max: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {value.type === 'element' && (
        <div className="editor-fields">
          <select value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value as typeof value.value })}>
            {ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.type === 'row' && (
        <div className="editor-fields">
          <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value as typeof value.target })}>
            {CONDITION_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={value.row} onChange={(e) => onChange({ ...value, row: e.target.value as typeof value.row })}>
            {ROWS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.type === 'chance' && (
        <div className="editor-fields">
          <label>
            probability (0-1)
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={value.probability}
              onChange={(e) => onChange({ ...value, probability: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {(value.type === 'allOf' || value.type === 'anyOf') && (
        <div className="nested-list">
          {value.conditions.map((c, i) => (
            <ConditionEditor
              key={i}
              value={c}
              onChange={(nc) => {
                const next = [...value.conditions];
                next[i] = nc;
                onChange({ ...value, conditions: next });
              }}
              onRemove={() => {
                const next = value.conditions.filter((_, idx) => idx !== i);
                onChange({ ...value, conditions: next });
              }}
            />
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={() => onChange({ ...value, conditions: [...value.conditions, defaultCondition('self')] })}
          >
            + add nested condition
          </button>
        </div>
      )}

      {value.type === 'not' && (
        <div className="nested-list">
          <ConditionEditor value={value.condition} onChange={(nc) => onChange({ ...value, condition: nc })} />
        </div>
      )}
    </div>
  );
}

export { defaultCondition };
