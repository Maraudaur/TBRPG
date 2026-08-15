---
name: battle-sim-ability-and-passive-authoring
description: Use this when creating or editing an Ability or Passive in the Iron & Jade battle sim (this project) — explains the trigger/condition/effect/binding schema, every parameter's valid values, formula syntax, and worked recipes for common ability/passive patterns (nukes, heals, DoTs, buffs, stack-consuming combos, reactive passives). Read this before authoring new combat content by hand or via the in-app Ability/Passive builder.
---

# How to make Abilities and Passives

Abilities and Passives in this sim are both built from the **same underlying shape**: one or more `Binding`s, each a `trigger` + `conditions[]` + `effects[]` + optional `priority`. There is no separate "ability logic" system — an ability is just a `Binding` whose trigger is `OnAbilityCast`, plus some metadata (AP cost, target type, element). A passive is one or more `Binding`s with no cast metadata at all, reacting to whatever trigger you give it. Gear affixes use this same shape too. Learn the Binding shape once and you can build all three.

This doc is the reference for the parameters — read it before hand-authoring JSON/TS for a new ability or passive, or before using the in-app Ability/Passive builder (Abilities tab / Passives tab), since the builder's dropdowns map 1:1 to everything below.

## The two top-level shapes

**Ability** (`src/sim/types.ts`):

```ts
{
  id: string;              // unique, snake_case by convention e.g. "fireball"
  name: string;
  description?: string;
  apCost: number;          // AP the caster spends; 0 is valid (see Basic Attack)
  targetType: AbilityTargetType;  // singleEnemy | singleAlly | allEnemies | allAllies | self
  element: Element;        // physical | fire | ice | lightning | holy | dark | neutral
  levelRequirement?: number;
  bindings: Binding[];     // at least one should have trigger: 'OnAbilityCast'
}
```

**PassiveDef** (`src/sim/types.ts`):

```ts
{
  id: string;
  name: string;
  description?: string;
  bindings: Binding[];     // reactive — almost never OnAbilityCast (see Gotchas)
}
```

Passives are authored once and then **attached to any character or enemy** by id, via the "passives" checklist on the Character/Enemy builder — the same relationship abilities already have (define once, reference by id). Don't author combat logic inline on a character anymore; build it as a Passive and attach it.

## The Binding shape

```ts
{
  id?: string;
  name?: string;            // shown in the combat log, e.g. "[Combustion] ..."
  trigger: TriggerType;
  conditions: Condition[];  // AND'd together; nest allOf/anyOf/not for other logic
  effects: Effect[];        // run in order, top to bottom, if all conditions pass
  priority?: number;        // higher resolves first when multiple bindings fire on the same event at once
}
```

An ability's `OnAbilityCast` binding(s) are executed directly when that ability is cast — NOT through the generic trigger-gathering path. This means casting Fireball can never accidentally fire Heal's `OnAbilityCast` binding. Every OTHER binding in the battle (gear affixes, passives, status-effect ticks) that listens for `OnAbilityCast` — or any other trigger — IS gathered generically and reacts normally. Practical effect: **give a passive an `OnAbilityCast` trigger only if you want it to react to any ability being cast** (e.g. "gain AP whenever an ability is cast"), not to give a character an ability — that's what the Ability entity + `abilities: string[]` list is for.

## Triggers (`TriggerType`)

| Trigger | Fires when |
|---|---|
| `OnBattleStart` | Once, before any turns. |
| `OnTurnStart` | A unit's turn begins (source = target = that unit), before its status durations tick. |
| `OnAbilityCast` | After an ability's own effects resolve — notifies reactive listeners a cast happened. Carries `ability` id and `element`. |
| `OnDamageDealt` | Any time damage lands. `source` = attacker, `target` = defender. Use with a `self` condition on **source** for "when I deal damage." |
| `OnDamageTaken` | Fires alongside `OnDamageDealt` with the identical payload. Use with a `self` condition on **target** for "when I get hit." |
| `OnStatusApplied` | A status (or more stacks of one) is added to a unit. |
| `OnStatusExpired` | A status runs out naturally, OR is removed early via `ConsumeStatus` — both look identical to listeners. |
| `OnHPThresholdCrossed` | A unit's HP drops through 50% or 25% (each fires once per battle). Carries `threshold` (0.5 or 0.25) on the event, though there's no Condition that reads it directly — use a `statCompare` on `hpPercent` instead (see Last Stand recipe below). |
| `OnDeath` | A unit's HP reaches 0. |
| `OnRowChanged` | A unit's row flips. Fires two ways: (1) automatic back-row promotion when a front-row ally dies (`target` = the promoted unit, no `source`), or (2) a `SwitchRow` effect (`target` = the unit who moved, `source` = the binding owner that caused it). |

## Conditions

All conditions in a binding's `conditions[]` are AND'd. Nest `allOf`/`anyOf`/`not` for other boolean logic.

| Condition | Shape | Meaning |
|---|---|---|
| `self` | `{ type: 'self' }` | True if this binding's owner was either the source OR target of the event. The standard way to scope a reactive binding to "me". |
| `teammate` | `{ type, target }` | True if `target` (event's `target`/`source` role, same resolution as elsewhere) is on the owner's team AND is not the owner itself. The way to build ally-facing/party-synergy passives — see Party synergy recipe below. |
| `statCompare` | `{ type, target, stat, op, value }` | `target` is `self`\|`target`\|`source` (who the event's `target`/`source` role refers to — see below). `stat` is any base stat (`maxHp`,`maxAp`,`atk`,`def`,`matk`,`mdef`,`speed`,`critChance`,`critDamage`,`accuracy`,`evasion`) or `currentHp`\|`hpPercent`\|`currentAp`. `op` is `<`,`<=`,`>`,`>=`,`==`,`!=`. |
| `hasStatus` | `{ type, target, status, min?, max? }` | True if `target` currently holds `status` with stacks in `[min, max]` (default: at least 1). `status` is a free-text id — autocompletes from the Statuses tab. |
| `element` | `{ type, value }` | True if the triggering event's element matches. |
| `row` | `{ type, target, row }` | True if `target` is currently `front` or `back`. |
| `chance` | `{ type, probability }` | Rolls the battle's RNG against a 0–1 probability. |
| `wasCrit` | `{ type: 'wasCrit' }` | True if the triggering hit (`OnDamageDealt`/`OnDamageTaken`) was a critical hit. Reads the event's `isCrit` field — no `target` to configure. |
| `abilityIs` | `{ type, value }` | True if the triggering event's `ability` id matches `value` (free-text, autocompletes from the Abilities tab). Only meaningful on triggers that carry an `ability` field (`OnAbilityCast`). Use this for "only when MY specific ability is cast" reactive bonuses — see Gotchas for what this can't do. |
| `allOf` / `anyOf` | `{ type, conditions: Condition[] }` | AND / OR over nested conditions. |
| `not` | `{ type, condition }` | Inverts a nested condition. |

`target: 'self' | 'target' | 'source'` on `statCompare`/`hasStatus`/`row` resolves to: `self` = this binding's owner, `target` = the event's `target` field, `source` = the event's `source` field. E.g. on an `OnDamageTaken` binding, `{ target: 'source', ... }` reads the attacker; `{ target: 'self', ... }` reads the unit who got hit (assuming the binding's owner is that unit).

## Effects

Effects run top-to-bottom within a binding. Every `Effect` has a `target: EffectTarget` — `self` | `target` | `source` | `allEnemies` | `allAllies` (resolved relative to the binding owner and the triggering event, same `self`/`target`/`source` semantics as conditions; `allEnemies`/`allAllies` hit every living unit on that side regardless of row).

| Effect | Shape | Behavior |
|---|---|---|
| `DealDamage` | `{ type, target, formula, element }` | Evaluates `formula` (see Formulas below) against the **caster's** stats, subtracts 50% of the target's `def` (physical) or `mdef` (everything else), applies a further −25% if physical vs. a back-row target, rolls a crit (`critChance`/`critDamage`), then emits `OnDamageDealt`+`OnDamageTaken` (both carry `isCrit`) and checks HP thresholds/death. Minimum 1 damage if `formula` evaluates > 0. |
| `ApplyStatus` | `{ type, target, status, stacks?, duration? }` | Adds/stacks a status. `stacks` defaults to 1, `duration` defaults to that status's `defaultDuration` (or 3). Respects the status's `stackable`/`maxStacks`. |
| `ConsumeStatus` | `{ type, target, status, count: number \| 'all' }` | Removes stacks from `target`. Sets `vars.stacksConsumed` to how many were actually removed — readable by a **later effect in the same binding's formula**. This is the combo primitive (see Combustion recipe). The `OnStatusExpired` event it emits carries `stacks` = how many were removed, so other reactive listeners (not just the same binding) can read the actual count too. |
| `ModifyStat` | `{ type, target, stat, modType, value, duration? }` | `modType` is `flat`\|`percentAdd`\|`percentMult`\|`cap`\|`floor` (see Stat Pipeline below). No `duration` = permanent; with a `duration` (turns) it's temporary and shows as a colored chip in Test Combat. The pushed modifier is tagged with `sourceUnitId` = the binding's owner; if that owner dies mid-battle, every modifier it granted (to itself or anyone else) is stripped automatically. This is what makes "while I'm alive, allies get +X" auras work — see Party synergy recipe below. |
| `Heal` | `{ type, target, formula }` | Evaluates `formula` against the **caster's** stats, restores HP capped at max. |
| `GrantExtraTurn` | `{ type, target }` | Moves `target` to the front of the turn queue. |
| `ModifyAP` | `{ type, target, amount }` | Adds/subtracts AP directly, clamped to `0..maxAp`. |
| `SwitchRow` | `{ type, target, row? }` | Moves `target` between front/back row. Omit `row` to toggle (swap to whichever row it isn't in); set `row: 'front'`/`'back'` to force a specific row. No-ops if the target is already in that row or is dead. Emits `OnRowChanged`. |

## Formulas (`DealDamage`/`Heal`)

`formula` is a plain math expression evaluated at runtime, NOT free-form JS. Allowed characters: numbers, letters/underscore (variable names), `+ - * / ( )`, decimals, whitespace. **No exponents, no function calls (`min`/`max`/etc.), no ternaries.**

Variables available in a **DealDamage** formula: `atk`, `matk`, `def`, `mdef`, `speed`, `level` (caster's own current stats), `targetAtk`, `targetDef`, `targetMatk`, `targetMdef`, `targetMaxHp`, `targetCurrentHp` (target's stats).

Variables available in a **Heal** formula: `atk`, `matk`, `level` (caster only — no target-side vars).

Scratch variables (available in either, when applicable): `stacksConsumed` (set by an earlier `ConsumeStatus` in the same binding), `stacks` (auto-seeded only when the binding belongs to a status effect's own tick, e.g. Burn's damage — NOT available in an ordinary ability/passive binding).

Example: `matk * 1.8 + stacksConsumed * 7`

## Stat pipeline (how ModifyStat / gear stack up)

`base → flat adds (summed) → %add (summed, applied once) → %mult (multiplicative, one at a time) → cap → floor`. `percentAdd`/`percentMult` values are fractions: `0.2` = +20%. This applies uniformly to gear's `statModifiers[]` and any `ModifyStat` effects — same pipeline, same order, regardless of source.

## Row rules that affect ability design

- A unit in the **back row cannot act at all** — no ability, no Basic Attack. Reactive bindings (passives, gear, status ticks) still fire for them normally; only their own turn-action is skipped.
- **Single-target enemy abilities (`singleEnemy`) can only hit front-row opponents.** Back row is immune to direct single-target enemy targeting. Allies can still target their own back row with `singleAlly` (heals/buffs work fine).
- `allEnemies`/`allAllies` (AoE) **do** hit back row — that's the intended way to reach it.
- Design implication: if you want an ability that can meaningfully threaten a backline, it needs `targetType: 'allEnemies'` (or a reactive passive triggered off something other than being directly targeted).
- Row swaps aren't only death-triggered anymore: a `SwitchRow` effect lets an ability or passive move a unit front↔back directly, and `OnRowChanged` lets other passives react to any row change (death-promotion or ability-caused).

## Party synergy: `teammate` condition & auras

Two patterns cover "boost my whole party" content:

**Reactive ally buff** — trigger off something the owner does, but scope the condition to teammates instead of self, using `teammate` on the target you actually want to affect:
```ts
// "whenever I land a crit, all other allies gain +10% atk for 2 turns"
bindings: [{ trigger: 'OnDamageDealt', conditions: [{ type: 'self' }, { type: 'wasCrit' }],
  effects: [{ type: 'ModifyStat', target: 'allAllies', stat: 'atk', modType: 'percentAdd', value: 0.1, duration: 2 }] }]
```

**Permanent "while I'm alive" aura** — an `OnBattleStart` binding targeting `allAllies` with NO `duration` grants a permanent modifier tagged with the granter's `sourceUnitId`. If the granter dies, every modifier it handed out (including to itself) is automatically stripped from every recipient in the same tick as the death:
```ts
// "while this unit is alive, all allies get +15% matk"
bindings: [{ trigger: 'OnBattleStart', conditions: [],
  effects: [{ type: 'ModifyStat', target: 'allAllies', stat: 'matk', modType: 'percentAdd', value: 0.15 }] }]
```
This is the only way to build a true persistent aura — a `duration`-based `ModifyStat` always expires on its own turn countdown regardless of who's alive.

**Known gaps** (not buildable yet, no engine support): there's no per-element damage stat to boost (only the base stats), and no way to scope a stat modifier to one specific ability's damage — `abilityIs` only works as a reactive *trigger-side* condition ("when ability X is cast, do Y"), not as a way to say "boost ability X's damage specifically."

## Recipes

**Simple single-target nuke** (Slash/Fireball pattern):
```ts
targetType: 'singleEnemy', element: 'fire',
bindings: [{ trigger: 'OnAbilityCast', conditions: [],
  effects: [{ type: 'DealDamage', target: 'target', formula: 'matk * 1.3', element: 'fire' }] }]
```

**AoE damage** (Cleave pattern) — set both the ability's `targetType` AND the effect's `target` to the ally/enemy-wide option:
```ts
targetType: 'allEnemies', element: 'physical',
bindings: [{ trigger: 'OnAbilityCast', conditions: [],
  effects: [{ type: 'DealDamage', target: 'allEnemies', formula: 'atk * 0.8', element: 'physical' }] }]
```

**Heal** (Mend pattern):
```ts
targetType: 'singleAlly', element: 'holy',
bindings: [{ trigger: 'OnAbilityCast', conditions: [],
  effects: [{ type: 'Heal', target: 'target', formula: 'matk * 1.5 + 10' }] }]
```

**Damage + apply a status** (Fireball's burn):
```ts
effects: [
  { type: 'DealDamage', target: 'target', formula: 'matk * 1.3', element: 'fire' },
  { type: 'ApplyStatus', target: 'target', status: 'burn', stacks: 2, duration: 3 },
]
```

**Consume stacks for bonus effect** — the "shatter"/combo pattern (Combustion, Ashborn Ring). `ConsumeStatus` MUST come before the effect that reads `stacksConsumed`:
```ts
effects: [
  { type: 'ConsumeStatus', target: 'target', status: 'burn', count: 'all' },
  { type: 'DealDamage', target: 'target', formula: 'matk * 1.8 + stacksConsumed * 7', element: 'fire' },
]
```

**Temporary buff/debuff ability** (shows as a chip on the unit card in Test Combat):
```ts
effects: [{ type: 'ModifyStat', target: 'target', stat: 'evasion', modType: 'percentAdd', value: 0.3, duration: 2 }]
```
Use `target: 'self'` for a self-buff, `target: 'target'` on a `singleEnemy` ability for a debuff.

**Reactive passive — "whenever I deal damage, gain AP"** (Reckless Momentum):
```ts
bindings: [{ trigger: 'OnDamageDealt', conditions: [{ type: 'self' }],
  effects: [{ type: 'ModifyAP', target: 'self', amount: 1 }] }]
```

**Reactive passive — "at low HP, gain evasion"** (Last Stand). There's no Condition that reads the `OnHPThresholdCrossed` event's `threshold` field directly, so gate on the unit's actual `hpPercent` instead:
```ts
bindings: [{ trigger: 'OnHPThresholdCrossed',
  conditions: [{ type: 'self' }, { type: 'statCompare', target: 'self', stat: 'hpPercent', op: '<=', value: 0.25 }],
  effects: [{ type: 'ModifyStat', target: 'self', stat: 'evasion', modType: 'percentAdd', value: 0.3, duration: 2 }] }]
```

**Damage-over-time status** (this lives on the Status, not the ability — an ability just applies it via `ApplyStatus`). Build the status on the Statuses tab with its own tick binding:
```ts
// StatusEffectDef "burn": bindings: [{ trigger: 'OnTurnStart', conditions: [{ type: 'self' }],
//   effects: [{ type: 'DealDamage', target: 'self', formula: 'stacks * 3', element: 'fire' }] }]
```
`stacks` is only available in a binding that belongs to the status itself (seeded automatically) — not in an ordinary ability/passive binding.

## Gotchas

- **Formula syntax is a whitelist**, not real JS — no `Math.min`, no `**`, no `? :`. Do the clamping via `cap`/`floor` ModifyStat instead, or keep the formula linear.
- **`self` condition** means "I was source OR target" — the trigger type is what disambiguates "I did this" (`OnDamageDealt` + self) from "this was done to me" (`OnDamageTaken` + self).
- **An ability's own `OnAbilityCast` binding is special-cased** (see Binding shape section) — don't rely on it to make other abilities' bindings fire; use a separate reactive passive/gear binding with `OnAbilityCast` for "whenever any ability is cast" effects.
- **Status ids are free strings.** Typing an id with no matching `StatusEffectDef` (Statuses tab) still applies a stack — it just does nothing on its own (a flag/counter, like Frost). Build the status separately if you want automatic behavior.
- **Priority** only matters when multiple DIFFERENT bindings react to the same event at the same moment — it doesn't reorder effects within one binding (those always run top-to-bottom as written).
- **Depth guard:** trigger chains (effect → new trigger → binding → new trigger → ...) abort after 25 levels to catch runaway loops from a miswritten combo.
- **Passives are attached by id**, not authored inline on a character/enemy anymore — build it once on the Passives tab, then check it on the Character/Enemy builder.

## Two ways to add a new Ability/Passive

1. **In the app** (recommended): Abilities tab / Passives tab → "+ new ability/passive" → fill in the fields and binding editor described above → Save. Immediately available to attach to any character/enemy.
2. **In code** (`src/data/abilities.ts` / `src/data/passives.ts`): add a new exported `Ability`/`PassiveDef` object following the shapes above, and add it to that file's `ABILITIES`/`PASSIVES` record. New code-defined entries reach users who've already used the app (and already have localStorage populated) automatically on next load — `syncSeedData()` (`src/storage/index.ts`) merges in anything with a new id without touching existing saved/edited entries.
