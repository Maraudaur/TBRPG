import type { StatModifier } from '../../sim/types';
import { STAT_KEYS } from '../../sim/types';
import { MODIFIER_TYPES } from './constants';

interface Props {
  value: StatModifier;
  onChange: (value: StatModifier) => void;
  onRemove?: () => void;
}

export function StatModifierEditor({ value, onChange, onRemove }: Props) {
  return (
    <div className="editor-row editor-fields">
      <select value={value.stat} onChange={(e) => onChange({ ...value, stat: e.target.value as typeof value.stat })}>
        {STAT_KEYS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as typeof value.type })}>
        {MODIFIER_TYPES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input type="number" step="any" value={value.value} onChange={(e) => onChange({ ...value, value: Number(e.target.value) })} />
      <input
        type="text"
        placeholder="source (optional)"
        value={value.source ?? ''}
        onChange={(e) => onChange({ ...value, source: e.target.value })}
      />
      {onRemove && (
        <button type="button" className="btn-remove" onClick={onRemove}>
          remove
        </button>
      )}
    </div>
  );
}

export function defaultStatModifier(): StatModifier {
  return { stat: 'atk', type: 'flat', value: 1 };
}
