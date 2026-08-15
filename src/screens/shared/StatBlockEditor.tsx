import type { StatBlock } from '../../sim/types';
import { STAT_KEYS } from '../../sim/types';

interface Props {
  value: StatBlock;
  onChange: (value: StatBlock) => void;
}

export function StatBlockEditor({ value, onChange }: Props) {
  return (
    <div className="stat-grid">
      {STAT_KEYS.map((key) => (
        <label key={key} className="stat-field">
          {key}
          <input
            type="number"
            step="any"
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
          />
        </label>
      ))}
    </div>
  );
}

export function defaultStatBlock(): StatBlock {
  return {
    maxHp: 100,
    maxAp: 20,
    atk: 10,
    def: 10,
    matk: 10,
    mdef: 10,
    speed: 10,
    critChance: 0.05,
    critDamage: 1.5,
    accuracy: 0.9,
    evasion: 0.05,
  };
}
