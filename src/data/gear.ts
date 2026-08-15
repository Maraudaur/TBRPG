import type { GearItem } from '../sim/types';

/**
 * Literal implementation of the tech-doc's "ashborn ring" example: dealing
 * fire damage while the target already carries burn stacks consumes them
 * for bonus fire damage. Demonstrates a gear affix using the exact same
 * Binding shape as an ability.
 */
export const ASHBORN_RING: GearItem = {
  id: 'ashborn_ring',
  name: 'Ashborn Ring',
  slot: 'accessory',
  statModifiers: [{ stat: 'matk', type: 'flat', value: 5, source: 'Ashborn Ring' }],
  bindings: [
    {
      id: 'ashborn_shatter',
      name: 'Ashborn Ring: Combustion',
      trigger: 'OnDamageDealt',
      priority: 10,
      conditions: [
        { type: 'self' },
        { type: 'element', value: 'fire' },
        { type: 'hasStatus', target: 'target', status: 'burn', min: 1 },
      ],
      effects: [
        { type: 'ConsumeStatus', target: 'target', status: 'burn', count: 'all' },
        { type: 'DealDamage', target: 'target', formula: 'stacksConsumed * 5', element: 'fire' },
      ],
    },
  ],
};

/**
 * A second "shatter" style combo, this time keyed off frost stacks (matches
 * the tech doc's prose description literally: "consume frost stacks for
 * bonus fire damage"). Lives on a gauntlet instead of a ring for variety.
 */
export const SHATTERPOINT_GAUNTLETS: GearItem = {
  id: 'shatterpoint_gauntlets',
  name: 'Shatterpoint Gauntlets',
  slot: 'armor',
  statModifiers: [{ stat: 'atk', type: 'flat', value: 3, source: 'Shatterpoint Gauntlets' }],
  bindings: [
    {
      id: 'shatterpoint_combo',
      name: 'Shatterpoint Gauntlets: Shatter',
      trigger: 'OnDamageDealt',
      priority: 10,
      conditions: [
        { type: 'self' },
        { type: 'element', value: 'fire' },
        { type: 'hasStatus', target: 'target', status: 'frost', min: 1 },
      ],
      effects: [
        { type: 'ConsumeStatus', target: 'target', status: 'frost', count: 'all' },
        { type: 'DealDamage', target: 'target', formula: 'stacksConsumed * 6', element: 'fire' },
      ],
    },
  ],
};

export const EMBER_STAFF: GearItem = {
  id: 'ember_staff',
  name: 'Ember Staff',
  slot: 'weapon',
  statModifiers: [{ stat: 'matk', type: 'flat', value: 8, source: 'Ember Staff' }],
};

export const IRON_SWORD: GearItem = {
  id: 'iron_sword',
  name: 'Iron Sword',
  slot: 'weapon',
  statModifiers: [{ stat: 'atk', type: 'flat', value: 6, source: 'Iron Sword' }],
};

export const TRAVELERS_CLOAK: GearItem = {
  id: 'travelers_cloak',
  name: "Traveler's Cloak",
  slot: 'armor',
  statModifiers: [
    { stat: 'def', type: 'flat', value: 4, source: "Traveler's Cloak" },
    { stat: 'evasion', type: 'percentAdd', value: 0.05, source: "Traveler's Cloak" },
  ],
};

export const HUNTERS_BOW: GearItem = {
  id: 'hunters_bow',
  name: "Hunter's Bow",
  slot: 'weapon',
  statModifiers: [
    { stat: 'atk', type: 'flat', value: 5, source: "Hunter's Bow" },
    { stat: 'speed', type: 'flat', value: 2, source: "Hunter's Bow" },
  ],
};

export const GEAR_ITEMS: Record<string, GearItem> = {
  ashborn_ring: ASHBORN_RING,
  shatterpoint_gauntlets: SHATTERPOINT_GAUNTLETS,
  ember_staff: EMBER_STAFF,
  iron_sword: IRON_SWORD,
  travelers_cloak: TRAVELERS_CLOAK,
  hunters_bow: HUNTERS_BOW,
};
