import { abilityStore } from '../../storage';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Free-text ability-id field with autocomplete suggestions pulled from the
 * saved ability library — same pattern as StatusIdInput. Not a strict
 * <select>: an `abilityIs` condition should still be editable/valid even if
 * the referenced ability is renamed or not yet saved.
 */
export function AbilityIdInput({ value, onChange, placeholder }: Props) {
  const abilities = abilityStore.list();
  return (
    <>
      <input
        type="text"
        list="ability-id-options"
        placeholder={placeholder ?? 'ability id'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id="ability-id-options">
        {abilities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </datalist>
    </>
  );
}
