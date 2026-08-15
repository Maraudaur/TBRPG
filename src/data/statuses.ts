import type { StatusEffectDef } from '../sim/types';

export const BURN: StatusEffectDef = {
  id: 'burn',
  name: 'Burn',
  description: 'Deals fire damage equal to 3x stacks at the start of the holder\'s turn.',
  stackable: true,
  maxStacks: 99,
  defaultDuration: 3,
  bindings: [
    {
      id: 'burn_tick',
      name: 'Burn tick',
      trigger: 'OnTurnStart',
      conditions: [{ type: 'self' }],
      effects: [{ type: 'DealDamage', target: 'self', formula: 'stacks * 3', element: 'fire' }],
    },
  ],
};

export const FROST: StatusEffectDef = {
  id: 'frost',
  name: 'Frost',
  description: 'No effect on its own — a resource stat consumed by "shatter" combos for bonus fire damage.',
  stackable: true,
  maxStacks: 99,
  defaultDuration: 3,
};

export const REGEN: StatusEffectDef = {
  id: 'regen',
  name: 'Regeneration',
  description: 'Heals a flat amount at the start of the holder\'s turn.',
  stackable: false,
  defaultDuration: 3,
  bindings: [
    {
      id: 'regen_tick',
      name: 'Regen tick',
      trigger: 'OnTurnStart',
      conditions: [{ type: 'self' }],
      effects: [{ type: 'Heal', target: 'self', formula: '15' }],
    },
  ],
};

export const STATUS_DEFS: Record<string, StatusEffectDef> = {
  burn: BURN,
  frost: FROST,
  regen: REGEN,
};
