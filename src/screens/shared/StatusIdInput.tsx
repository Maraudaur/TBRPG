import { statusStore } from '../../storage';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Free-text status-id field with autocomplete suggestions pulled from the
 * saved status library. Deliberately NOT a strict <select> — a status id can
 * reference a status that doesn't exist yet (or is a pure combo-flag with no
 * StatusEffectDef at all, like early "frost" was before it got one), so we
 * suggest rather than constrain.
 */
export function StatusIdInput({ value, onChange, placeholder }: Props) {
  const statuses = statusStore.list();
  return (
    <>
      <input
        type="text"
        list="status-id-options"
        placeholder={placeholder ?? 'status id'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id="status-id-options">
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </datalist>
    </>
  );
}
