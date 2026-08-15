import type { Ability } from '../sim/types';

export const FIREBALL: Ability = {
  id: 'fireball',
  name: 'Fireball',
  description: 'Hurls a ball of fire, applying burn stacks to the target.',
  apCost: 3,
  targetType: 'singleEnemy',
  element: 'fire',
  bindings: [
    {
      id: 'fireball_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'DealDamage', target: 'target', formula: 'matk * 1.3', element: 'fire' },
        { type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 2, duration: 3 },
      ],
    },
  ],
};

export const ICE_SHARD: Ability = {
  id: 'ice_shard',
  name: 'Ice Shard',
  description: 'Launches a shard of ice, applying frost stacks to the target.',
  apCost: 2,
  targetType: 'singleEnemy',
  element: 'ice',
  bindings: [
    {
      id: 'ice_shard_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'DealDamage', target: 'target', formula: 'matk * 0.9', element: 'ice' },
        { type: 'ApplyStatus', target: 'target', status: 'frost', stacks: 2, duration: 3 },
      ],
    },
  ],
};

export const MEND: Ability = {
  id: 'mend',
  name: 'Mend',
  description: 'Channels holy energy to heal an ally.',
  apCost: 2,
  targetType: 'singleAlly',
  element: 'holy',
  bindings: [
    {
      id: 'mend_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [{ type: 'Heal', target: 'target', formula: 'matk * 1.5 + 10' }],
    },
  ],
};

export const SLASH: Ability = {
  id: 'slash',
  name: 'Slash',
  description: 'A quick, cheap physical strike.',
  apCost: 1,
  targetType: 'singleEnemy',
  element: 'physical',
  bindings: [
    {
      id: 'slash_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [{ type: 'DealDamage', target: 'target', formula: 'atk * 1.2', element: 'physical' }],
    },
  ],
};

export const CLEAVE: Ability = {
  id: 'cleave',
  name: 'Cleave',
  description: 'A sweeping physical strike that hits all enemies.',
  apCost: 4,
  targetType: 'allEnemies',
  element: 'physical',
  bindings: [
    {
      id: 'cleave_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [{ type: 'DealDamage', target: 'allEnemies', formula: 'atk * 0.8', element: 'physical' }],
    },
  ],
};

export const COMBUSTION: Ability = {
  id: 'combustion',
  name: 'Combustion',
  description:
    "Detonates the target's burn stacks for a fire-magic burst that scales with the caster's magic attack, then clears all remaining burn from the target.",
  apCost: 4,
  targetType: 'singleEnemy',
  element: 'fire',
  bindings: [
    {
      id: 'combustion_cast',
      name: 'Combustion',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        // Read + clear the target's current burn stacks first (there's no
        // separate "peek stacks" formula variable), then deal damage scaled
        // by the caster's matk plus how many stacks were just consumed —
        // same stacksConsumed pattern as the Ashborn Ring combo.
        { type: 'ConsumeStatus', target: 'target', status: 'burn', count: 'all' },
        { type: 'DealDamage', target: 'target', formula: 'matk * 1.8 + stacksConsumed * 7', element: 'fire' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Fire build: Igniter/Detonator/Support kit — see
// fire-build-abilities-and-passives-todo.md for the full design writeup.
// ---------------------------------------------------------------------------

export const EMBER_BOLT: Ability = {
  id: 'ember_bolt',
  name: 'Ember Bolt',
  description: 'Cheap single-target fire poke. The default spammable burn generator.',
  apCost: 1,
  targetType: 'singleEnemy',
  element: 'fire',
  bindings: [
    {
      id: 'ember_bolt_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'DealDamage', target: 'target', formula: 'matk * 0.6', element: 'fire' },
        { type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 1, duration: 3 },
      ],
    },
  ],
};

export const WILDFIRE: Ability = {
  id: 'wildfire',
  name: 'Wildfire',
  description: 'AoE fire spell — moderate damage and a burn stack to every enemy.',
  apCost: 4,
  targetType: 'allEnemies',
  element: 'fire',
  bindings: [
    {
      id: 'wildfire_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'DealDamage', target: 'allEnemies', formula: 'matk * 0.9', element: 'fire' },
        { type: 'ApplyStatus', target: 'allEnemies', status: 'burn', stacks: 1, duration: 3 },
      ],
    },
  ],
};

export const KINDLING_STRIKE: Ability = {
  id: 'kindling_strike',
  name: 'Kindling Strike',
  description: 'A cheap weapon attack that also applies a burn stack — feeds the stack pool even on AP-starved turns.',
  apCost: 1,
  targetType: 'singleEnemy',
  element: 'physical',
  bindings: [
    {
      id: 'kindling_strike_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'DealDamage', target: 'target', formula: 'atk * 0.9', element: 'physical' },
        { type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 1, duration: 2 },
      ],
    },
  ],
};

export const REKINDLE: Ability = {
  id: 'rekindle',
  name: 'Rekindle',
  description: "Refreshes a target's burn duration without dealing real damage — buys time for the Detonator's turn.",
  apCost: 1,
  targetType: 'singleEnemy',
  element: 'fire',
  bindings: [
    {
      id: 'rekindle_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      // stacks: 0 extends duration only, doesn't add stacks.
      effects: [{ type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 0, duration: 5 }],
    },
  ],
};

export const PYROCLASM: Ability = {
  id: 'pyroclasm',
  name: 'Pyroclasm',
  description:
    "Detonator's ultimate — consumes ALL burn across every enemy at once for a shared damage burst scaled by the party's total stacks applied across the field.",
  apCost: 6,
  targetType: 'allEnemies',
  element: 'fire',
  bindings: [
    {
      id: 'pyroclasm_cast',
      name: 'Pyroclasm',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'ConsumeStatus', target: 'allEnemies', status: 'burn', count: 'all' },
        { type: 'DealDamage', target: 'allEnemies', formula: 'matk * 1.5 + stacksConsumed * 3', element: 'fire' },
      ],
    },
  ],
};

export const SECOND_WIND: Ability = {
  id: 'second_wind',
  name: 'Second Wind',
  description: 'A chosen ally acts again immediately — chain into another action off a big Pyroclasm, or squeeze in one more stack application.',
  apCost: 3,
  targetType: 'singleAlly',
  element: 'neutral',
  bindings: [
    {
      id: 'second_wind_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [{ type: 'GrantExtraTurn', target: 'target' }],
    },
  ],
};

export const STOKE_THE_FIRE: Ability = {
  id: 'stoke_the_fire',
  name: 'Stoke the Fire',
  description: "Buffs a chosen ally's magic attack — cast it on the Detonator right before Combustion/Pyroclasm.",
  apCost: 2,
  targetType: 'singleAlly',
  element: 'fire',
  bindings: [
    {
      id: 'stoke_the_fire_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [{ type: 'ModifyStat', target: 'target', stat: 'matk', modType: 'percentAdd', value: 0.25, duration: 2 }],
    },
  ],
};

export const EMBERS_RETREAT: Ability = {
  id: 'embers_retreat',
  name: "Ember's Retreat",
  description: 'After a stack-dumping turn, fall back to the back row to get out of enemy targeting range.',
  apCost: 1,
  targetType: 'self',
  element: 'fire',
  bindings: [
    {
      id: 'embers_retreat_cast',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [
        { type: 'ModifyStat', target: 'self', stat: 'evasion', modType: 'percentAdd', value: 0.2, duration: 1 },
        { type: 'SwitchRow', target: 'self', row: 'back' },
      ],
    },
  ],
};

export const ABILITIES: Record<string, Ability> = {
  fireball: FIREBALL,
  ice_shard: ICE_SHARD,
  mend: MEND,
  slash: SLASH,
  cleave: CLEAVE,
  combustion: COMBUSTION,
  ember_bolt: EMBER_BOLT,
  wildfire: WILDFIRE,
  kindling_strike: KINDLING_STRIKE,
  rekindle: REKINDLE,
  pyroclasm: PYROCLASM,
  second_wind: SECOND_WIND,
  stoke_the_fire: STOKE_THE_FIRE,
  embers_retreat: EMBERS_RETREAT,
};
