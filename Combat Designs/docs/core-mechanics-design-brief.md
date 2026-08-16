---
name: core-mechanics-design-brief
description: Designer-facing brief on what's possible to build in the battle sim's Trigger/Condition/Effect system, and the power-curve fantasy the whole game is chasing. Read this before sketching a new build; read how-to-make-abilities-and-passives.md when you're ready to actually build it.
---

# Core Mechanics — Design Brief

This doc is for anyone sketching new abilities, passives, or full party builds, before they touch the actual builder UI. It answers two questions: **what fantasy is this game chasing**, and **what tools do you actually have to build it**.

## The fantasy: slow burn into ridiculous

A 6-person party should feel like a normal turn-based RPG at the start of a run — pick a target, hit it, watch a health bar go down. That's on purpose. The game is not trying to be flashy on turn one.

The payoff is what happens by the late game, once a party's kit has come together: individual actions start **chaining into each other** — a crit triggers a bonus effect, which applies a stack, which funds an ally's resource, which triggers their own follow-up, which detonates for a hit an order of magnitude bigger than anything from turn one. Numbers that started in the tens should be capable of reaching into the tens of thousands by the time a party is fully online. Think:

- **Diablo's Whirlwind** — one cast that, once the build comes together, casts itself again, and again, snowballing off its own momentum instead of being one discrete action.
- **Slay the Spire's 100-card storm** — dozens of small, individually-boring triggers stacking into one screen-filling turn that wins the fight outright.
- **A single hit for 99,999** — not because one formula got scary, but because five different party members' passives all funneled into the same detonation.

The design job is finding the **breakpoints**: the specific combination of a stack-generator, a payoff, and a connector between party members that turns "fine turn-based combat" into "oh, that's what this build does." Early game shouldn't have these online yet — they should be things a party grows into.

## The toolbox

Every single thing that happens in a fight — abilities, passives, gear affixes, status ticks — is built from the exact same shape: a **Trigger** (when does this fire), a list of **Conditions** (only if these are true), and a list of **Effects** (do these things). There's no separate "ability code" anywhere. This means the only thing standing between "an idea" and "a working mechanic" is picking the right combination of these three pieces.

This section is a fast tour of what's available and *why you'd reach for it*, not the full technical spec — see [`how-to-make-abilities-and-passives.md`](./how-to-make-abilities-and-passives.md) for exact parameters, or the in-app **Reference** tab for the same list with live element/row rules.

### Triggers — when something fires

| Trigger | Reach for it when you want... |
|---|---|
| `OnBattleStart` | A permanent, set-once effect — most "while I'm alive" auras and party-wide buffs live here. |
| `OnTurnStart` | Something that happens automatically every round regardless of what anyone chooses to do — DoTs, regen, ramping effects. |
| `OnAbilityCast` | To react to *any* ability being cast (by anyone, or scoped to a specific caster/ability) — resource generation, "on cast" procs. |
| `OnDamageDealt` / `OnDamageTaken` | The single richest hook for chains — react to hits landing, whether you caused them or received them. This is where most crit-chains and retaliation effects live. |
| `OnStatusApplied` | React the instant a stack (of anything) lands on someone — this is the hook that lets one character's action fund a *different* character's kit. |
| `OnStatusExpired` | Fires both when a status naturally runs out AND when it's deliberately consumed — the second case is the detonation moment for stack-and-spend builds. |
| `OnHPThresholdCrossed` | Desperation/execute mechanics — something special happens the moment a unit crosses 50% or 25% HP. |
| `OnDeath` | Avenge effects, on-kill payoffs, last-gasp abilities. |
| `OnRowChanged` | React to someone stepping up to the front line or falling back — a tactical/positioning layer distinct from pure damage. |

### Conditions — only if this is true

The condition that unlocks genuine **party synergy** is `teammate` — it's what lets a passive say "when an ally (not me) does X, I get Y," instead of every passive only ever reacting to its own holder's actions. Combine it with `hasStatus`, `wasCrit`, `abilityIs`, or `element` to scope exactly which ally-actions matter. `chance` is how you turn a strong effect into an exciting-but-not-guaranteed proc — low-probability, high-payoff procs are a big part of what makes a chain feel like a surprise rather than a rotation.

### Effects — what actually happens

| Effect | What it's for |
|---|---|
| `DealDamage` | Damage, scaled by a formula against caster/target stats. |
| `ApplyStatus` | Stack a status (burn, or anything custom you invent — an unrecognized status id just behaves as an inert counter until you give it its own `OnTurnStart` tick or attach conditions that read its stack count). |
| `ConsumeStatus` | Spend stacks for a payoff — this is the detonation half of every "stack and spend" build, and the only place a formula can read `stacksConsumed` to scale a hit by how much was banked. |
| `ModifyStat` | Buff or debuff any stat, flat or %, temporary or permanent. Permanent + `OnBattleStart` + targeting `allAllies` is the standard party-wide aura recipe. |
| `Heal` | Straightforward HP restore, formula-scaled. |
| `GrantExtraTurn` | The single most important effect for the "Whirlwind casts Whirlwind" fantasy — pair it with a `chance` condition on a damage/crit trigger and you get a self-sustaining action loop. |
| `ModifyAP` | Resource generation/drain — the connective tissue for "my action funds your action" builds. |
| `SwitchRow` | Move someone between front and back row, deliberately (not just on death) — a tactical safety valve, or a way to force a squishy detonator to the back the instant their big turn is done. |

## Patterns worth building toward

These are named shapes, not finished designs — pick one, then go build the specific version of it.

**Stack-and-detonate.** Generate a resource on one or more units (`ApplyStatus`), then cash it in on a single big hit (`ConsumeStatus` + a `stacksConsumed`-scaled `DealDamage`). This is the most direct route to a genuinely huge single number, and it's the shape the existing fire-build party ([`fire-build-abilities-and-passives-todo.md`](./fire-build-abilities-and-passives-todo.md)) is built around — worth reading end to end as a template before inventing a second element's version of it.

**Chain / retrigger loops.** A crit, a kill, or a big hit has a `chance` to `GrantExtraTurn` or re-trigger part of its own effect chain. This is the actual mechanism behind "Whirlwind spawns Whirlwind" and "100 cards in one turn" — one binding's effects emit new trigger events, which can satisfy the conditions of *other* bindings, which fire more effects, and so on. The chain only stops when nothing new qualifies or it hits the engine's safety cap of 25 links deep — in practice a real breakpoint moment looks like a short cascade of triggers firing in sequence, visible turn-by-turn in Test Combat's replay.

**Team funnel.** One character's action generates a resource for a *different* character, via a `teammate`-scoped reactive passive (an Igniter applying stacks funds the Detonator's AP, for example). This is specifically what makes a 6-person party feel like a team instead of six soloists taking turns — design at least one of these into every build.

**Breakpoint auras.** A holder grants the whole party a stat boost the instant the fight starts, tied to their own survival (`OnBattleStart` + `ModifyStat(allAllies)`, no duration). These are quieter than chain loops but are what make the *floor* of a build rise over a run — losing the aura-holder should be a real, felt loss, not a flavor detail.

**Execute / comeback breakpoints.** `OnHPThresholdCrossed` lets a build have a distinct "everything changes" moment once someone (ally or enemy) crosses 50% or 25% — bonus damage against low-HP targets, a defensive panic button, a passive that only turns on once things get dicey. This is a good lever for making the *late* turns of a single fight escalate, not just the late game of a run.

**Positioning tempo.** `SwitchRow` + `OnRowChanged` add a tactical axis that isn't about numbers at all — deliberately retreating a spent attacker, or rewarding whoever just stepped up to the front line with a surge. Good for breaking up pure numeric power creep with a decision-making layer.

## Designing around the real constraints

A few honest limits, so a proposed mechanic doesn't hit a wall in the builder:

- **Formulas are linear math only** — no exponents, no function calls, no `if`. `matk * 1.8 + stacksConsumed * 7` works; anything that wants `stacks^2` doesn't. Get "explosive" scaling from **many stacking terms and modifiers** (lots of small %-multiplier buffs compounding, lots of stacks banked before one big consume) rather than from one formula doing exponential math.
- **`percentAdd` sums, then `percentMult` multiplies one at a time** — so five `+10% percentAdd` modifiers give one clean +50%, while five `+10% percentMult` modifiers compound to roughly +61%. Reach for `percentMult` specifically when you want stacking buffs to feel like they're accelerating, not just adding up.
- **Trigger chains cap at 25 links deep** as a safety net against infinite loops — a well-designed chain build should resolve well under that in practice; treat it as a guardrail, not a target to design toward.
- **A reactive passive can't currently scale off a number from a *different* binding's event** (e.g. a standalone "bonus damage per stack consumed" passive can't read someone else's `ConsumeStatus` count) — that scaling only works within the same binding that ran the `ConsumeStatus`. If a design needs it as a separate reusable passive, that's a real engine gap — flag it rather than assuming it's buildable. See [`engine-wishlist-todo.md`](./engine-wishlist-todo.md) for the full running list of what's been added and what's still out of reach.
- **Enemies can be leveled independently of the party** (level 1–99, per-side override in Test Combat) — use this to sanity-check a build's late-game ceiling against an appropriately scaled-up target, not just the default sample enemies.

## Where to go next

1. Pick a fantasy (a chain, a detonation, a team funnel — whatever's exciting) and sketch it in one sentence using the vocabulary above.
2. Open [`how-to-make-abilities-and-passives.md`](./how-to-make-abilities-and-passives.md) for exact parameter shapes and worked recipes, or the in-app **Reference** tab for a live-updating version of the same thing.
3. Build it in the Abilities/Passives tabs, attach it to a sample party, and play it out in **Test Combat**'s interactive mode — the timed replay is specifically there so you can watch a chain actually unfold step by step and confirm it feels like the breakpoint you designed, not just that the math works.
