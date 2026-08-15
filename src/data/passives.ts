import type { PassiveDef } from '../sim/types';

// A couple of example passives, built standalone and attached to units by
// id (see CHARACTERS/ENEMIES) rather than authored inline per-unit.

export const LAST_STAND: PassiveDef = {
  id: 'last_stand',
  name: 'Last Stand',
  description: 'Gain a large evasion boost for 2 turns the first time HP drops below 25%.',
  bindings: [
    {
      id: 'last_stand_trigger',
      name: 'Last Stand',
      trigger: 'OnHPThresholdCrossed',
      conditions: [{ type: 'self' }, { type: 'statCompare', target: 'self', stat: 'hpPercent', op: '<=', value: 0.25 }],
      effects: [{ type: 'ModifyStat', target: 'self', stat: 'evasion', modType: 'percentAdd', value: 0.3, duration: 2 }],
    },
  ],
};

export const RECKLESS_MOMENTUM: PassiveDef = {
  id: 'reckless_momentum',
  name: 'Reckless Momentum',
  description: 'Whenever this unit deals damage, gain 1 AP.',
  bindings: [
    {
      id: 'reckless_momentum_tick',
      name: 'Reckless Momentum',
      trigger: 'OnDamageDealt',
      conditions: [{ type: 'self' }],
      effects: [{ type: 'ModifyAP', target: 'self', amount: 1 }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Fire build: Igniter/Detonator/Support kit — see
// fire-build-abilities-and-passives-todo.md for the full design writeup.
// ---------------------------------------------------------------------------

export const ASHFIRE_FOCUS: PassiveDef = {
  id: 'ashfire_focus',
  name: 'Ashfire Focus',
  description:
    "Party-wide, permanent while alive: the whole party's magic attack goes up for the fight, granted once at battle start. If the holder dies mid-battle, the boost disappears from everyone who had it.",
  bindings: [
    {
      id: 'ashfire_focus_grant',
      name: 'Ashfire Focus',
      trigger: 'OnBattleStart',
      conditions: [],
      effects: [{ type: 'ModifyStat', target: 'allAllies', stat: 'matk', modType: 'percentAdd', value: 0.1 }],
    },
  ],
};

export const SMOLDERING_WOUNDS: PassiveDef = {
  id: 'smoldering_wounds',
  name: 'Smoldering Wounds',
  description: 'Personal: bonus fire damage against a target that is already burning.',
  bindings: [
    {
      id: 'smoldering_wounds_tick',
      name: 'Smoldering Wounds',
      trigger: 'OnDamageDealt',
      conditions: [
        { type: 'self' },
        { type: 'element', value: 'fire' },
        { type: 'hasStatus', target: 'target', status: 'burn', min: 1 },
      ],
      effects: [{ type: 'DealDamage', target: 'target', formula: 'matk * 0.3', element: 'fire' }],
    },
  ],
};

export const CRITICAL_CINDER: PassiveDef = {
  id: 'critical_cinder',
  name: 'Critical Cinder',
  description: 'Personal: critical fire hits apply a bonus burn stack.',
  bindings: [
    {
      id: 'critical_cinder_tick',
      name: 'Critical Cinder',
      trigger: 'OnDamageDealt',
      conditions: [{ type: 'self' }, { type: 'element', value: 'fire' }, { type: 'wasCrit' }],
      effects: [{ type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 1, duration: 3 }],
    },
  ],
};

export const FAN_THE_FLAMES: PassiveDef = {
  id: 'fan_the_flames',
  name: 'Fan the Flames',
  description: 'Personal: chance for a fire hit to apply an extra burn stack.',
  bindings: [
    {
      id: 'fan_the_flames_tick',
      name: 'Fan the Flames',
      trigger: 'OnDamageDealt',
      conditions: [{ type: 'self' }, { type: 'element', value: 'fire' }, { type: 'chance', probability: 0.35 }],
      effects: [{ type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 1, duration: 3 }],
    },
  ],
};

export const KINDLING_SYNC: PassiveDef = {
  id: 'kindling_sync',
  name: 'Kindling Sync',
  description:
    'Ally-reactive: whenever an ally (not the holder) applies a burn stack to an enemy, the holder gains 1 AP. Meant for the Detonator — the more the Igniters spam, the faster the payoff charges.',
  bindings: [
    {
      id: 'kindling_sync_tick',
      name: 'Kindling Sync',
      trigger: 'OnStatusApplied',
      conditions: [
        { type: 'teammate', target: 'source' },
        { type: 'hasStatus', target: 'target', status: 'burn', min: 1 },
      ],
      effects: [{ type: 'ModifyAP', target: 'self', amount: 1 }],
    },
  ],
};

export const PHOENIX_GUARD: PassiveDef = {
  id: 'phoenix_guard',
  name: 'Phoenix Guard',
  description: 'Ally-reactive, party-wide safety net: whenever an ally falls back to the back row, heal them a little on the way out.',
  bindings: [
    {
      id: 'phoenix_guard_tick',
      name: 'Phoenix Guard',
      trigger: 'OnRowChanged',
      conditions: [
        { type: 'teammate', target: 'target' },
        { type: 'row', target: 'target', row: 'back' },
      ],
      effects: [{ type: 'Heal', target: 'target', formula: 'matk * 0.4 + 10' }],
    },
  ],
};

export const VANGUARDS_IGNITION: PassiveDef = {
  id: 'vanguards_ignition',
  name: "Vanguard's Ignition",
  description:
    "Ally-reactive: whenever an ally steps up to the front row (death-triggered promotion or a deliberate SwitchRow cast on them), they get a brief magic attack surge.",
  bindings: [
    {
      id: 'vanguards_ignition_tick',
      name: "Vanguard's Ignition",
      trigger: 'OnRowChanged',
      conditions: [
        { type: 'teammate', target: 'target' },
        { type: 'row', target: 'target', row: 'front' },
      ],
      effects: [{ type: 'ModifyStat', target: 'target', stat: 'matk', modType: 'percentAdd', value: 0.15, duration: 2 }],
    },
  ],
};

export const ASHFALL: PassiveDef = {
  id: 'ashfall',
  name: 'Ashfall',
  description: "Personal, ability-specific: the instant the holder's own Combustion detonates, a light dusting of embers reseeds 1 burn stack on every other enemy.",
  bindings: [
    {
      id: 'ashfall_tick',
      name: 'Ashfall',
      trigger: 'OnAbilityCast',
      conditions: [{ type: 'self' }, { type: 'abilityIs', value: 'combustion' }],
      effects: [{ type: 'ApplyStatus', target: 'allEnemies', status: 'burn', stacks: 1, duration: 2 }],
    },
  ],
};

export const OVERFLOW: PassiveDef = {
  id: 'overflow',
  name: 'Overflow',
  description:
    "Personal: a bonus fire hit on a target the instant the holder's own ConsumeStatus fully clears their status. Flat amount — not scaled by stacks consumed (see fire-build doc for why).",
  bindings: [
    {
      id: 'overflow_tick',
      name: 'Overflow',
      trigger: 'OnStatusExpired',
      conditions: [{ type: 'self' }],
      effects: [{ type: 'DealDamage', target: 'target', formula: 'matk * 0.5', element: 'fire' }],
    },
  ],
};

export const CASCADING_EMBERS: PassiveDef = {
  id: 'cascading_embers',
  name: 'Cascading Embers',
  description: "Party-wide: detonating a target refunds AP to the whole party, not just the Detonator, so everyone can chain off the big consume moment.",
  bindings: [
    {
      id: 'cascading_embers_tick',
      name: 'Cascading Embers',
      trigger: 'OnStatusExpired',
      conditions: [{ type: 'self' }],
      effects: [{ type: 'ModifyAP', target: 'allAllies', amount: 2 }],
    },
  ],
};

export const FLASHPOINT: PassiveDef = {
  id: 'flashpoint',
  name: 'Flashpoint',
  description: 'Personal: a fire hit has a chance to grant the caster an extra turn, chaining straight into another stack-applying cast.',
  bindings: [
    {
      id: 'flashpoint_tick',
      name: 'Flashpoint',
      trigger: 'OnDamageDealt',
      conditions: [{ type: 'self' }, { type: 'element', value: 'fire' }, { type: 'chance', probability: 0.2 }],
      effects: [{ type: 'GrantExtraTurn', target: 'self' }],
    },
  ],
};

export const IGNITION_CHAIN: PassiveDef = {
  id: 'ignition_chain',
  name: 'Ignition Chain',
  description: 'Personal, stretch: a chance for ANY fire ability cast to also tack on a burn stack, even ones that do not land damage.',
  bindings: [
    {
      id: 'ignition_chain_tick',
      name: 'Ignition Chain',
      trigger: 'OnAbilityCast',
      conditions: [{ type: 'self' }, { type: 'element', value: 'fire' }, { type: 'chance', probability: 0.25 }],
      effects: [{ type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 1, duration: 3 }],
    },
  ],
};

export const PASSIVES: Record<string, PassiveDef> = {
  last_stand: LAST_STAND,
  reckless_momentum: RECKLESS_MOMENTUM,
  ashfire_focus: ASHFIRE_FOCUS,
  smoldering_wounds: SMOLDERING_WOUNDS,
  critical_cinder: CRITICAL_CINDER,
  fan_the_flames: FAN_THE_FLAMES,
  kindling_sync: KINDLING_SYNC,
  phoenix_guard: PHOENIX_GUARD,
  vanguards_ignition: VANGUARDS_IGNITION,
  ashfall: ASHFALL,
  overflow: OVERFLOW,
  cascading_embers: CASCADING_EMBERS,
  flashpoint: FLASHPOINT,
  ignition_chain: IGNITION_CHAIN,
};
