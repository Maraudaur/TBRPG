## De-risking before hiring: build a UI-only battle sim

**What it proves:**
- **Design/fun risk on the core loop** — the biggest one. Turns "I believe this will be fun" into "I know this is fun" (or "this specific interaction is flat"), for the cost of the founder's own time instead of months of paid production.
- **A precise, unambiguous spec** — working code beats prose for handing off exact system behavior to a technical co-founder.
- **A sharp hiring/vetting tool** — "here's how I built the trigger/effect system, tell me what's wrong with it" reveals more about a candidate than a resume review.

**What it doesn't prove:**
- **Nothing about art appeal** — the most immediately, visibly judged part of any pitch.
- **Nothing about combat *feel*** — Octopath-style combat lives on animation timing, impact, VFX payoff. A numbers-correct sim can still feel flat in real presentation.
- **Nothing about production-grade architecture** — code built solo (likely AI-assisted) is a reference implementation, not a foundation. Treat it as disposable; let the eventual technical co-founder decide whether to rebuild from scratch rather than inherit it out of sunk cost.

**Verdict:** build it — high-leverage for a non-technical director validating design risk cheaply — but frame it to yourself and any future hire as retiring *design* risk only, not production or presentation risk.

---

## Technical architecture for the battle sim

### Core principle: one unified "effect binding" format

Abilities, passives, and gear affixes all share the same data shape. This is the single decision that makes "crazy builds" possible — a gear item and an ability passive are structurally identical to the engine, so builds emerge from combination rather than hand-authored special cases.

```ts
type Binding = {
  trigger: TriggerType;        // e.g. OnAbilityCast, OnDamageDealt, OnTurnStart
  conditions: Condition[];     // AND'd list; nest AllOf/AnyOf for OR logic
  effects: Effect[];           // executed in order if conditions pass
  priority?: number;           // resolution order when multiple bindings fire on the same trigger
};
```

**Triggers** — events the sim emits: `OnBattleStart`, `OnTurnStart(unit)`, `OnAbilityCast`, `OnDamageDealt`, `OnDamageTaken`, `OnStatusApplied`, `OnStatusExpired`, `OnHPThresholdCrossed`, `OnDeath`.

**Conditions** — composable predicates: stat comparisons, stack/status checks, element match, row check, random chance, `AllOf[]` / `AnyOf[]` / `Not` for logical composition.

**Effects** — atomic, chainable primitives: `DealDamage`, `ApplyStatus`, `ConsumeStatus`, `ModifyStat`, `Heal`, `GrantExtraTurn`, `ModifyAP`. Effects emit new triggers (`DealDamage` fires `OnDamageDealt`), so passives naturally chain off abilities with no special-case code — this is how "shatter" mechanics (consume frost stacks for bonus fire damage) fall out of the system for free.

```ts
// A gear affix and an ability passive — identical shape:
const ashbornRing: Binding = {
  trigger: 'OnDamageDealt',
  conditions: [{ type: 'self' }, { type: 'element', value: 'fire' },
               { type: 'hasStatus', target: 'target', status: 'burn', min: 1 }],
  effects: [{ type: 'ConsumeStatus', target: 'target', status: 'burn', count: 'all' },
            { type: 'DealDamage', target: 'target', formula: 'stacksConsumed * 5', element: 'fire' }]
};
```

### Stats
Base stats per character/enemy + a modifier pipeline collected from gear, buffs, and passives, applied in a fixed order: base → flat adds → % adds (summed) → % multipliers (multiplicative) → caps/floors. Gear doesn't need a separate stat system — it's `statModifiers[]` plus an optional `bindings[]` using the same format as abilities.

### Party of 6, front/back rows, turn order
Turn queue driven by Speed stat (Octopath-style — upcoming turns can be shown to the player). Row stored per-slot on the party composition; row is just another `Condition` type (e.g., physical abilities gated unless "reach," back row takes reduced physical damage).

### Level system
XP table + per-level stat growth (fixed curve or per-archetype), ability unlocks referencing ability IDs by level. Deliberately the least novel system — low priority to over-engineer early.

### Build order (validate risk before building UI)
1. Type definitions for Trigger/Condition/Effect/Binding shapes — no logic yet
2. Stat pipeline — pure function, unit-testable
3. Event bus + effect resolver — **highest-risk piece**; test headless/in isolation first
4. Minimal headless battle loop — hardcoded party vs. enemy, runs to a winner, logs every trigger/condition/effect fired
5. Only once that's stable: builder screens (Character/Enemy/Gear/Ability/Party builders), then the test combat screen wired to real authored data

Rationale: the resolver is where actual design risk lives. Builder UI is comparatively cheap and fast — building it first means rebuilding it every time the underlying schema changes.

### Stack
- **TypeScript** throughout — discriminated unions for Trigger/Condition/Effect types catch unhandled cases at compile time
- **React** for builder forms and the combat test screen
- No backend needed — solo local tool; JSON files or IndexedDB for saved characters/abilities/parties/gear

### Architecture layers
1. **Data layer** — JSON/TS definitions for characters, enemies, abilities, gear, status effects (source of truth)
2. **Simulation core** — event bus, effect resolver, stat pipeline, turn queue (pure logic, no UI)
3. **UI layer** — builder screens (party/character/enemy/gear) + test combat screen with a verbose combat log; writes back into the data layer

This mirrors the strict simulation/presentation separation and event-driven architecture already established for the full production game — the battle sim isn't throwaway work, it's a working reference implementation of the same patterns.

---

*Summary of a planning conversation — not legal, financial, or contractual advice. Get a lawyer for IP assignment and contractor agreement templates.*
