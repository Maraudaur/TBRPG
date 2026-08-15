import type { Effect, Row } from '../../sim/types';
import { EFFECT_TARGETS, EFFECT_TYPES, ELEMENTS, MODIFIER_TYPES, ROWS } from './constants';
import { STAT_KEYS } from '../../sim/types';
import { StatusIdInput } from './StatusIdInput';

function defaultEffect(type: Effect['type']): Effect {
  switch (type) {
    case 'DealDamage':
      return { type: 'DealDamage', target: 'target', formula: 'atk', element: 'physical' };
    case 'ApplyStatus':
      return { type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 1, duration: 3 };
    case 'ConsumeStatus':
      return { type: 'ConsumeStatus', target: 'target', status: 'burn', count: 'all' };
    case 'ModifyStat':
      return { type: 'ModifyStat', target: 'target', stat: 'atk', modType: 'flat', value: 1 };
    case 'Heal':
      return { type: 'Heal', target: 'target', formula: 'matk' };
    case 'GrantExtraTurn':
      return { type: 'GrantExtraTurn', target: 'self' };
    case 'ModifyAP':
      return { type: 'ModifyAP', target: 'self', amount: 1 };
    case 'SwitchRow':
      return { type: 'SwitchRow', target: 'self', row: undefined };
  }
}

interface Props {
  value: Effect;
  onChange: (value: Effect) => void;
  onRemove?: () => void;
}

export function EffectEditor({ value, onChange, onRemove }: Props) {
  return (
    <div className="editor-row">
      <div className="editor-row-header">
        <select value={value.type} onChange={(e) => onChange(defaultEffect(e.target.value as Effect['type']))}>
          {EFFECT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value as typeof value.target })}>
          {EFFECT_TARGETS.map((t) => (
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

      {value.type === 'DealDamage' && (
        <div className="editor-fields">
          <input
            type="text"
            placeholder="formula, e.g. atk * 1.5"
            value={value.formula}
            onChange={(e) => onChange({ ...value, formula: e.target.value })}
          />
          <select value={value.element} onChange={(e) => onChange({ ...value, element: e.target.value as typeof value.element })}>
            {ELEMENTS.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.type === 'ApplyStatus' && (
        <div className="editor-fields">
          <StatusIdInput value={value.status} onChange={(status) => onChange({ ...value, status })} />
          <label>
            stacks
            <input
              type="number"
              value={value.stacks ?? 1}
              onChange={(e) => onChange({ ...value, stacks: Number(e.target.value) })}
            />
          </label>
          <label>
            duration
            <input
              type="number"
              value={value.duration ?? 3}
              onChange={(e) => onChange({ ...value, duration: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {value.type === 'ConsumeStatus' && (
        <div className="editor-fields">
          <StatusIdInput value={value.status} onChange={(status) => onChange({ ...value, status })} />
          <label>
            count
            <input
              type="text"
              placeholder="'all' or a number"
              value={value.count}
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ ...value, count: raw === 'all' ? 'all' : Number(raw) || 0 });
              }}
            />
          </label>
        </div>
      )}

      {value.type === 'ModifyStat' && (
        <div className="editor-fields">
          <select value={value.stat} onChange={(e) => onChange({ ...value, stat: e.target.value as typeof value.stat })}>
            {STAT_KEYS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={value.modType} onChange={(e) => onChange({ ...value, modType: e.target.value as typeof value.modType })}>
            {MODIFIER_TYPES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            value={value.value}
            onChange={(e) => onChange({ ...value, value: Number(e.target.value) })}
          />
          <label>
            duration (turns, blank = permanent)
            <input
              type="number"
              value={value.duration ?? ''}
              onChange={(e) => onChange({ ...value, duration: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {value.type === 'Heal' && (
        <div className="editor-fields">
          <input
            type="text"
            placeholder="formula, e.g. matk * 1.5"
            value={value.formula}
            onChange={(e) => onChange({ ...value, formula: e.target.value })}
          />
        </div>
      )}

      {value.type === 'ModifyAP' && (
        <div className="editor-fields">
          <label>
            amount
            <input
              type="number"
              value={value.amount}
              onChange={(e) => onChange({ ...value, amount: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      {value.type === 'GrantExtraTurn' && <span className="hint">grants the target an immediate extra turn</span>}

      {value.type === 'SwitchRow' && (
        <div className="editor-fields">
          <select
            value={value.row ?? ''}
            onChange={(e) => onChange({ ...value, row: e.target.value === '' ? undefined : (e.target.value as Row) })}
          >
            <option value="">(toggle — swap to the opposite of current row)</option>
            {ROWS.map((r) => (
              <option key={r} value={r}>
                force {r}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export { defaultEffect };
