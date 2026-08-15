// Static rules reference — documents the sim's current trigger/condition/
// effect vocabulary and how elements behave. Pure docs, no storage reads;
// descriptions are kept in lockstep with resolver.ts/battleLoop.ts by hand
// since this is a small, deliberately-limited type system (tech doc step 1).

interface Entry {
  name: string;
  description: string;
}

const TRIGGERS: Entry[] = [
  { name: 'OnBattleStart', description: 'Fires once, before any turns are taken.' },
  {
    name: 'OnTurnStart',
    description:
      "Fires when a unit's turn begins (source and target are both that unit), before its status durations tick down for the turn.",
  },
  {
    name: 'OnAbilityCast',
    description:
      "Fires after an ability's own cast effects have already resolved, notifying reactive gear/passive listeners that a cast happened. Carries the ability id and its element.",
  },
  {
    name: 'OnDamageDealt',
    description:
      'Fires every time damage lands. source = attacker, target = defender. Use with a self condition on source to build "when I deal damage" effects.',
  },
  {
    name: 'OnDamageTaken',
    description:
      'Fires alongside OnDamageDealt with the identical payload (source = attacker, target = defender). Use with a self condition on target to build "when I get hit" effects.',
  },
  { name: 'OnStatusApplied', description: 'Fires when a status (or additional stacks of one) is added to a unit.' },
  {
    name: 'OnStatusExpired',
    description:
      'Fires when a status runs out of duration naturally, AND when it is removed early via ConsumeStatus — both cases look identical to listeners.',
  },
  {
    name: 'OnHPThresholdCrossed',
    description: 'Fires once each time a unit\'s HP drops through 50% or 25% (each threshold fires only once per battle).',
  },
  { name: 'OnDeath', description: "Fires when a unit's HP reaches 0." },
  {
    name: 'OnRowChanged',
    description:
      "Fires whenever a unit's row actually changes — the death-triggered back-row promotion, and any SwitchRow effect. target = the unit that moved; source is set only when a SwitchRow effect caused it (unset for a death-triggered promotion). Check the unit's current row with a row condition to tell which direction it moved.",
  },
];

const CONDITIONS: Entry[] = [
  {
    name: 'self',
    description:
      'True if the binding\'s owner was either the source or the target of the event. The usual way to distinguish "this happened because of me" from "this happened to someone else".',
  },
  {
    name: 'statCompare',
    description:
      'Compares a stat (any base stat, or currentHp / hpPercent / currentAp) on self, target, or source against a value using <, <=, >, >=, ==, or !=.',
  },
  {
    name: 'hasStatus',
    description: 'True if self/target/source currently holds a named status with stacks in an optional [min, max] range (default: at least 1 stack).',
  },
  { name: 'element', description: "True if the triggering event's damage/ability element matches a given element." },
  { name: 'row', description: 'True if self/target/source is currently in the front or back row.' },
  { name: 'chance', description: 'Rolls the battle\'s RNG against a 0–1 probability.' },
  {
    name: 'teammate',
    description:
      "True if the unit at target/source/self is on the binding owner's team AND isn't the owner itself. The \"an ally, not me\" scope — self can't express this (self is only true for the owner's own participation). Combine with a trigger like OnDamageDealt to react to an ally's action specifically.",
  },
  { name: 'wasCrit', description: 'True if the triggering hit (from a DealDamage effect) was a critical hit.' },
  {
    name: 'abilityIs',
    description: "True if the triggering event's ability id matches a given value — scope a reaction to one specific named ability.",
  },
  { name: 'allOf', description: 'True only if every nested condition is true (logical AND grouping).' },
  { name: 'anyOf', description: 'True if any nested condition is true (logical OR grouping).' },
  { name: 'not', description: 'Inverts a nested condition.' },
];

const EFFECTS: Entry[] = [
  {
    name: 'DealDamage',
    description:
      "Evaluates a formula against the caster's stats, subtracts 50% of the target's def (physical) or mdef (all other elements), applies a further -25% if the damage is physical and the target is in the back row, rolls a crit, then emits OnDamageDealt/OnDamageTaken (both carrying an isCrit flag — see the wasCrit condition) and checks HP thresholds and death.",
  },
  {
    name: 'ApplyStatus',
    description: 'Adds or stacks a status on the target(s), respecting that status\'s stackable/maxStacks/duration rules.',
  },
  {
    name: 'ConsumeStatus',
    description:
      "Removes a number of stacks (or all) of a status from the target. The amount actually removed is stored in that binding's stacksConsumed variable, so a later effect in the same binding can reference it in its formula — this is how effects like \"consume burn stacks for bonus fire damage\" work. If the status is fully removed, the emitted OnStatusExpired event also carries that count on its stacks field, for OTHER bindings reacting to the expiry (not just the same binding's own formula).",
  },
  {
    name: 'ModifyStat',
    description:
      "Adds a stat modifier (flat / percentAdd / percentMult / cap / floor) to the target, optionally with a duration in turns, and recomputes their stats. The modifier is tagged with whoever's binding granted it — if that unit dies mid-battle, the modifier is automatically stripped from everyone it was granted to (a permanent, no-duration ModifyStat targeting allAllies from an OnBattleStart passive is how a \"while I'm alive\" party aura is built; it disappears the moment its holder dies, on top of/separate from the existing duration-based expiry for temporary buffs).",
  },
  { name: 'Heal', description: "Evaluates a formula against the caster's stats and restores HP, capped at the target's max HP." },
  {
    name: 'GrantExtraTurn',
    description: "Moves the target to the front of the turn queue so they act again sooner than everyone else.",
  },
  { name: 'ModifyAP', description: "Adds or subtracts AP from the target directly, clamped to 0..maxAp." },
  {
    name: 'SwitchRow',
    description:
      'Moves the target to a row. Omit "row" to toggle to the opposite of their current row, or force "front"/"back" specifically. Emits OnRowChanged for each unit actually moved (a no-op if already in the target row emits nothing).',
  },
];

const ELEMENTS: Entry[] = [
  { name: 'physical', description: 'Mitigated by the target\'s def. Also the only element reduced by 25% against back-row targets.' },
  { name: 'fire', description: 'Mitigated by the target\'s mdef.' },
  { name: 'ice', description: 'Mitigated by the target\'s mdef.' },
  { name: 'lightning', description: 'Mitigated by the target\'s mdef.' },
  { name: 'holy', description: 'Mitigated by the target\'s mdef.' },
  { name: 'dark', description: 'Mitigated by the target\'s mdef.' },
  { name: 'neutral', description: 'Mitigated by the target\'s mdef.' },
];

function EntryTable({ entries }: { entries: Entry[] }) {
  return (
    <table className="reference-table">
      <tbody>
        {entries.map((e) => (
          <tr key={e.name}>
            <td className="reference-name">{e.name}</td>
            <td className="reference-desc">{e.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const DEALDAMAGE_VARS: Entry[] = [
  { name: 'atk / matk / def / mdef / speed / level', description: "The caster's own current stats." },
  { name: 'targetAtk / targetDef / targetMatk / targetMdef', description: "The target's current stats." },
  { name: 'targetMaxHp / targetCurrentHp', description: "The target's max and current HP." },
];

const HEAL_VARS: Entry[] = [{ name: 'atk / matk / level', description: "The caster's own current stats. No target-side variables." }];

const SCRATCH_VARS: Entry[] = [
  {
    name: 'stacksConsumed',
    description:
      'Set by a ConsumeStatus effect earlier in the SAME binding, equal to how many stacks it actually removed. Lets a later DealDamage/Heal in that binding scale off it — this is how "consume stacks for bonus damage" combos are built.',
  },
  {
    name: 'stacks',
    description:
      "Automatically available when the binding belongs to a status effect itself (e.g. burn's own damage-over-time binding) — equal to that status's current stack count on the unit.",
  },
];

const LEVEL_GROWTH_PER_LEVEL: Entry[] = [
  { name: 'maxHp', description: '+12 per level' },
  { name: 'maxAp', description: '+2 per level' },
  { name: 'atk', description: '+2 per level' },
  { name: 'def', description: '+1 per level' },
  { name: 'matk', description: '+2 per level' },
  { name: 'mdef', description: '+1 per level' },
  { name: 'speed', description: '+1 per level' },
  { name: 'critChance / critDamage / accuracy / evasion', description: 'No automatic growth — these only change via gear or buffs.' },
];

export function ReferenceScreen() {
  return (
    <div className="reference-screen">
      <section className="reference-section">
        <h3>Base Stats &amp; Leveling</h3>
        <p className="hint">
          A character or enemy's <code>baseStats</code> (set in their builder) are their stats at level 1 — before any level growth, gear, or buffs
          are applied. Level growth, gear, and buffs are three separate, stacked layers on top of that starting point:
        </p>
        <ol className="reference-list">
          <li>
            <strong>baseStats</strong> — authored directly in the Characters/Enemies builder. This is the floor everything else builds on.
          </li>
          <li>
            <strong>Level growth</strong> — at battle setup, the engine takes the unit's level (their own saved <code>level</code> field, or a Test
            Combat level override for that battle only, capped at 1–99) and adds up the fixed per-level growth below for every level from 2
            up to that level. Level 1 itself adds nothing. This is <strong>flat/additive, not a percentage</strong> — the same fixed amount every
            level regardless of the unit's starting baseStats — and it's currently one single curve shared by every character and enemy; there's no
            per-archetype growth curve yet even though characters have an "archetype" field. The result (baseStats + growth) becomes that unit's
            effective base for the fight.
          </li>
          <li>
            <strong>Gear &amp; buffs</strong> — the stat modifier pipeline (flat → %add → %mult → cap/floor, see equipped gear's statModifiers and
            any ModifyStat effects) applies on top of the grown stats to produce <code>currentStats</code>, the numbers actually used in battle
            (and what DealDamage/Heal formulas and statCompare conditions read).
          </li>
        </ol>
        <p className="hint" style={{ marginTop: 10, marginBottom: 4 }}>
          Growth added per level (levels 2 up to the target level, summed):
        </p>
        <EntryTable entries={LEVEL_GROWTH_PER_LEVEL} />
        <p className="hint" style={{ marginTop: 10 }}>
          Honest gaps: a character's <code>xp</code> field and enemies defaulting to level 1 when unset both work, but XP doesn't currently drive
          leveling automatically — level is just a number you set directly. The curve also supports per-level ability <code>unlocks</code> in its
          data shape, but nothing in the app currently grants abilities that way — every built-in curve entry has an empty unlocks list, so ability
          access today is entirely via the "known abilities" checklist on the Character/Enemy builder, not level.
        </p>
      </section>

      <section className="reference-section">
        <h3>Rows</h3>
        <p className="hint">
          Front row fights; back row supports. Specifically:
        </p>
        <ol className="reference-list">
          <li>A unit in the back row cannot take an action on its turn (no ability, no Basic Attack) — its turn is skipped with a log line. This does NOT affect reactive bindings: passives, gear procs, and status ticks (OnTurnStart, OnDamageDealt, etc.) still fire normally for a back-row unit.</li>
          <li>A back-row unit cannot be picked as the target of a singleEnemy ability from the opposing side — only front-row units are valid enemy targets. Back-row allies can still be healed/buffed by their own side. AllEnemies/AllAllies (AoE) effects still hit everyone regardless of row, including back row — that's the intended way for something to reach the back row.</li>
          <li>When a front-row unit dies, one living back-row teammate (if any) automatically moves up to fill the front row, so a team is never permanently unable to act/be finished off as long as it has anyone alive.</li>
          <li>If a whole team starts a battle with nobody in the front row, one back-row unit is silently moved to front at formation time so the battle isn't a stalemate from the start.</li>
          <li>Abilities/passives can move a unit's row directly with a SwitchRow effect (toggle, or force front/back) — not just death-triggered promotion. Anything that changes a unit's row, death-triggered or not, fires OnRowChanged so a passive can react to entering front or back specifically (check the unit's row after the swap with a row condition).</li>
        </ol>
      </section>

      <section className="reference-section">
        <h3>Party synergy: teammate condition &amp; auras</h3>
        <p className="hint">
          Two building blocks specifically for cross-character design (a party has up to 6 members, and content shouldn't have to live on
          just one of them):
        </p>
        <ol className="reference-list">
          <li>
            The <strong>teammate</strong> condition lets a passive react to an ALLY'S action, not just its own holder's — e.g. "when an ally
            deals fire damage, do X," which <code>self</code> cannot express (self only matches the binding owner's own participation).
          </li>
          <li>
            A <strong>ModifyStat</strong> effect with no duration, cast once from an <code>OnBattleStart</code> binding targeting{' '}
            <code>allAllies</code>, is a true "while I'm alive" party aura — recipients automatically lose the modifier the instant its
            granter dies, separately from the existing duration-based expiry used for temporary buffs/debuffs.
          </li>
        </ol>
        <p className="hint">
          Still a gap: there's no per-element damage stat (a "+X% fire damage" boost has to be approximated as a broader matk buff, or built
          as a conditional bonus-damage reactive passive gated by an element condition) and no way to scope a stat modifier to one specific
          ability's damage — only the abilityIs condition exists for that, which works for a reactive bonus-damage passive but not a stat
          modifier.
        </p>
      </section>

      <section className="reference-section">
        <h3>Formulas</h3>
        <p className="hint">
          The formula field on DealDamage/Heal effects is a plain math expression, evaluated at runtime. Allowed characters: numbers, letters/underscore
          (variable names), <code>+ - * / ( )</code>, decimals, whitespace. No exponents, no functions like min()/max(), no ternaries. Example:{' '}
          <code>atk * 0.8 + stacksConsumed * 5</code>.
        </p>
        <p className="hint" style={{ marginTop: 10, marginBottom: 4 }}>
          Variables available in a <strong>DealDamage</strong> formula:
        </p>
        <EntryTable entries={DEALDAMAGE_VARS} />
        <p className="hint" style={{ marginTop: 10, marginBottom: 4 }}>
          Variables available in a <strong>Heal</strong> formula:
        </p>
        <EntryTable entries={HEAL_VARS} />
        <p className="hint" style={{ marginTop: 10, marginBottom: 4 }}>
          Scratch variables (available in either, when applicable):
        </p>
        <EntryTable entries={SCRATCH_VARS} />
      </section>

      <section className="reference-section">
        <h3>Triggers</h3>
        <p className="hint">Events the sim emits. Bindings (abilities, gear affixes, passives, status effects) listen for these.</p>
        <EntryTable entries={TRIGGERS} />
      </section>

      <section className="reference-section">
        <h3>Conditions</h3>
        <p className="hint">Predicates a binding checks before its effects run. All conditions in a binding's list are AND'd; nest allOf/anyOf/not for other logic.</p>
        <EntryTable entries={CONDITIONS} />
      </section>

      <section className="reference-section">
        <h3>Effects</h3>
        <p className="hint">Atomic, chainable actions a binding's effects list executes in order. Effects emit their own triggers, which is how chains/combos happen automatically.</p>
        <EntryTable entries={EFFECTS} />
      </section>

      <section className="reference-section">
        <h3>Elements</h3>
        <p className="hint">
          There is currently <strong>no</strong> rock-paper-scissors strength/weakness chart (e.g. "fire beats ice") — that would be a new
          feature to add. Today, elements do two things:
        </p>
        <ol className="reference-list">
          <li>Pick which stat mitigates the damage: physical uses the target's def, every other element uses mdef.</li>
          <li>Act as a tag that an element condition can match on, which is how elemental combo effects (e.g. consuming burn stacks for bonus fire damage) are built.</li>
        </ol>
        <EntryTable entries={ELEMENTS} />
      </section>
    </div>
  );
}
