# Batch 1 — Full Party Designs (Themes 1–4)

*Lead Combat Systems Designer output. Built against `core-mechanics-design-brief.md` + `how-to-make-abilities-and-passives.md`, using the `party-design-engine.md` template. Every ability, passive, and gear affix below is expressed purely as Trigger / Condition / Effect bindings. Formulas are linear; explosive scaling comes from `percentMult` compounding and deep stack-consumes. All chain loops terminate stochastically well under the 25-link cap.*

**Legend for binding shorthand**
`T:` Trigger · `C:` Conditions (AND'd) · `E:` Effects (top-to-bottom). Effect/condition `target` uses engine semantics: `self` = binding owner, `source`/`target` = the event's source/target role, `allAllies`/`allEnemies` = whole side.

---

# Party 1 — Ten Thousand Sword Immortal (万剑归宗)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Ten Thousand Sword Immortal* — a motionless jianxiu at the eye of an orbiting galaxy of jade flying-swords; the payoff turn floods the screen with sword-light.
* **Primary Pattern:** Chain / Retrigger Loop (`wasCrit` → `chance` → `GrantExtraTurn`).
* **The Breakpoint:** Early on, the Immortal makes one polite slash per turn. Once crit-chance and crit-damage auras stack and the AP-refund engine is online, a single crit has a chance to grant an extra turn — which crits again, which refunds the AP for the *next* cast, which crits again. One button press unspools into a 6–10 action sword-storm, each hit bigger than the last as self-ramping `critDamage` compounds within the turn.
* **Core Loop Diagram:**
  `Sword Immortal casts Myriad Swords` ──crit──> `Sword Heart Cascade (chance GrantExtraTurn self)` ──> `Sword-Song Cantor funnels AP to source` ──> `Flowing Blades ramps self critDamage ×` ──> `Flying-Sword Echo adds a teammate-crit sword hit` ──> *loop until a chance roll fails*

### 6-Unit Roster & Loadouts

**Unit 1 — Sword Immortal · Detonator / Carry**
* **Starting Row:** Front (single-target actives require front row).
* **Gear Affix — "Heart-Sword Scabbard":** stat mods `critChance +0.12 (flat)`, `critDamage +0.30 (flat)`, `speed +8 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self`, `wasCrit`, `chance 0.15` · `E: ModifyAP self +1` (a small self-refund so the storm doesn't stall purely on AP starvation).
* **Passives:**
  * **Sword Heart Cascade** *(the chain engine)* — `T: OnDamageDealt` · `C: self`, `wasCrit`, `chance 0.4` · `E: GrantExtraTurn self`. Stochastic exit: expected extra casts ≈ `0.4 / (1 − 0.4)` ≈ 0.67 per crit; a realistic storm resolves in ~4–8 links, never near 25.
  * **Flowing Blades** *(in-turn compounder)* — `T: OnDamageDealt` · `C: self`, `wasCrit` · `E: ModifyStat self, stat critDamage, modType percentMult, value 0.08, duration 2`. Each crit multiplies the next crit's damage; five crits ≈ +47% compounded (percentMult, applied one at a time), so later swords in the same storm hit far harder than the first.
* **Abilities (Active Kit):**
  * **Myriad Swords (AP 2, Front):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.5", element physical`. Cheap, single-target, crit-hungry — designed to be spammed by the extra-turn loop.
  * **Sword Domain (AP 3, Front):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "atk * 1.0", element physical`. Opener/AoE to spread the first crits across a wave so the storm has more targets to bounce between.

**Unit 2 — Sword-Song Cantor · Cross-Unit Engine + Breakpoint Aura**
* **Starting Row:** Back (reactive-only; protected from single-target enemy fire).
* **Gear Affix — "Resonant Guqin":** stat mods `maxAp +3 (flat)`, `mdef +10 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat speed, modType percentAdd, value 0.10` (party-wide tempo floor).
* **Passives:**
  * **Song of Ten Thousand Edges** *(cross-unit AP funnel — the required `teammate` engine)* — `T: OnDamageDealt` · `C: teammate` (source is an ally, not the Cantor), `wasCrit` · `E: ModifyAP target source, amount +1`. Every ally crit hands AP back to that ally — this is what refuels the Immortal mid-storm so the chain isn't AP-capped.
  * **Rising Chord** *(survival-tethered crit-chance aura)* — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat critChance, modType flat, value 0.15`. Permanent, `sourceUnitId`-tagged; if the Cantor dies the whole party's crit floor collapses — a felt loss, not flavor.

**Unit 3 — Whetstone Warden · Frontline Anchor**
* **Starting Row:** Front.
* **Gear Affix — "Grindstone Plate":** stat mods `maxHp +250 (flat)`, `def +25 (flat)`. Custom affix binding — `T: OnDamageTaken` · `C: self` · `E: ModifyStat self, stat def, modType percentAdd, value 0.05, duration 2` (soft ramp so the anchor gets stickier the longer it's focused).
* **Passives:**
  * **Sharpening Duty** *(teammate crit-damage feed)* — `T: OnDamageTaken` · `C: self` · `E: ModifyStat allAllies, stat critDamage, modType percentMult, value 0.06, duration 3`. The Warden turning damage into party crit-damage means the enemy's attempts to break the frontline actively fuel the storm.
* **Abilities:**
  * **Provoking Stance (AP 1, Front):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat self, stat def, modType percentAdd, value 0.4, duration 2`; `E: DealDamage allEnemies, formula "atk * 0.4", element physical`. A durable turtle-up that also nudges enemy AI aggro via chip damage.

**Unit 4 — Flying-Sword Echo · Secondary Chainer**
* **Starting Row:** Front.
* **Gear Affix — "Twin-Sheath Belt":** stat mods `atk +30 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self`, `wasCrit`, `chance 0.2` · `E: ApplyStatus target, status "sword_wound", stacks 1, duration 3` (a marking counter other kits can read via `hasStatus`).
* **Passives:**
  * **Echoing Blade** *(bounded teammate retrigger)* — `T: OnDamageDealt` · `C: teammate` (source is an ally), `wasCrit` · `E: DealDamage target, formula "atk * 0.7", element physical`. Fires an extra sword-hit whenever *another* unit crits. Cannot self-loop: the Echo's own hit has `source = self`, which fails the `teammate` condition, so it adds exactly one hit per ally crit — a linear amplifier on the storm, not a runaway.
* **Abilities:**
  * **Piercing Thread (AP 2, Front):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.3", element physical`. Independent crit source to seed the Echo network on turns the Immortal is setting up.

**Unit 5 — Jade-Talisman Adept · Sustain**
* **Starting Row:** Back.
* **Gear Affix — "Verdant Sigil":** stat mods `matk +25 (flat)`, `maxHp +150 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: Heal self, formula "matk * 0.3"` (passive self-topoff so it survives AoE).
* **Passives:**
  * **Life in the Blade-Song** *(teammate-linked lifegain)* — `T: OnDamageDealt` · `C: teammate` (ally source), `wasCrit` · `E: Heal source, formula "matk * 0.4"`. Turns the crit storm into party sustain, so long fights don't drain the frontline.
* **Abilities:**
  * **Mending Talisman (AP 2, Back):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.6 + 15"`.
  * **Cleansing Rain (AP 3, Back):** `T: OnAbilityCast` · `C:` none · `E: Heal allAllies, formula "matk * 0.9"`.

**Unit 6 — Formation Disciple · Tempo / Utility**
* **Starting Row:** Back.
* **Gear Affix — "Positioning Fan":** stat mods `speed +12 (flat)`, `evasion +0.08 (flat)`. Custom affix binding — `T: OnRowChanged` · `C: self` · `E: ModifyStat self, stat evasion, modType percentAdd, value 0.25, duration 1`.
* **Passives:**
  * **Windstep Reserve** *(crit-damage compounder aura)* — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat critDamage, modType percentMult, value 0.15`. Multiplies with the Cantor's crit-chance floor and the Warden's ramp — three separate sources compounding is where the "ridiculous" numbers come from.
* **Abilities:**
  * **Blade-Retreat (AP 1, Back):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target, row "back"`. Pull a spent or exposed attacker to safety the instant their storm is done.
  * **Vanguard Call (AP 1, Back):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target, row "front"`; `E: ModifyStat target, stat critChance, modType flat, value 0.15, duration 2`. Push the Immortal up and prime it right before its turn.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Sword-Song Cantor → "Song of Ten Thousand Edges"** (`teammate` + `wasCrit` → `ModifyAP source`). Secondary teammate feeds: Echo, Adept, Warden.
- [x] No exponent/branch formulas: all `DealDamage`/`Heal` are `stat * k (+ c)` linear forms.
- [x] `stacksConsumed` scoping: N/A for this party (no `ConsumeStatus`); nothing reads a cross-binding consume count.
- [x] Chain exits under 25 links: the only self-retrigger is `Sword Heart Cascade` gated on `chance 0.4` — expected depth < 2, practical max well under 25; the Echo is a single non-recursive amplifier.

---

# Party 2 — Ninefold Heavenly Tribulation (九重天劫)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Ninefold Heavenly Tribulation* — an ascending cultivator under a nine-tiered black thundercloud, lightning glyphs crawling up the body until the sky hammers down at once.
* **Primary Pattern:** Stack-and-Detonate (`ApplyStatus` ramp → `ConsumeStatus` + `stacksConsumed`-scaled `DealDamage`).
* **The Breakpoint:** For many turns the Ascendant just banks `tribulation` charge and looks like it's doing nothing. Meanwhile every *other* party member's action quietly banks more charge onto it (the funnel). Then one turn the whole reservoir is consumed for a single all-enemy lightning detonation whose formula reads `stacksConsumed` directly — a hit that scales linearly with dozens of banked stacks, taking a number from the tens into the tens of thousands in one strike.
* **Core Loop Diagram:**
  `Every ally cast / lightning hit` ──> `Charge the Skies (teammate → ApplyStatus tribulation on Ascendant)` ──> `Ascendant OnTurnStart self-banks +stacks` ──> `Ninefold Descent: ConsumeStatus all → DealDamage(matk*2 + stacksConsumed*12)` ──> *reservoir empties, cycle restarts*

### 6-Unit Roster & Loadouts

**Unit 1 — Tribulation Ascendant · Detonator / Carry**
* **Starting Row:** Front (needs to act to detonate; is the intended aggro sink for the drama).
* **Gear Affix — "Nine-Tier Crown":** stat mods `matk +40 (flat)`, `maxHp +200 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: ApplyStatus self, status "tribulation", stacks 2, duration 99` (long duration so the reservoir survives to the detonation turn).
* **Passives:**
  * **Court the Heavens** *(cross-unit intake — the required `teammate` engine)* — `T: OnAbilityCast` · `C: teammate` (an ally other than the Ascendant cast something) · `E: ApplyStatus self, status "tribulation", stacks 1, duration 99`. Every single ally action funnels one charge onto the carry; a 5-support party feeds ~5 stacks/round on top of self-generation.
  * **Storm-Fed** *(intake amplifier)* — `T: OnDamageTaken` · `C: self` · `E: ApplyStatus self, status "tribulation", stacks 1, duration 99`. Taking hits also charges the sky — leaning into the carry-as-lightning-rod fantasy.
* **Abilities (Active Kit):**
  * **Ninefold Descent (AP 4, Front) — the detonation:** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus self, status "tribulation", count "all"` **then** `E: DealDamage allEnemies, formula "matk * 2 + stacksConsumed * 12", element lightning`. `stacksConsumed` is read in the **same binding, in an effect after the consume** — the only legal scope. With ~30 banked stacks this is `matk*2 + 360`, before crit/aura multipliers.
  * **Gathering Cloud (AP 1, Front) — patience button:** `T: OnAbilityCast` · `C:` none · `E: ApplyStatus self, status "tribulation", stacks 3, duration 99`. A turn spent deliberately overcharging when the detonation isn't lethal yet.

**Unit 2 — Cloud-Herald Diviner · Charge Accelerant + Aura**
* **Starting Row:** Back.
* **Gear Affix — "Barometer Beads":** stat mods `maxAp +4 (flat)`, `speed +6 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat matk, modType percentMult, value 0.12`.
* **Passives:**
  * **Herald the Storm** *(fast-cast charge feed via `teammate`)* — `T: OnDamageDealt` · `C: teammate` (ally source), `element lightning` · `E: ApplyStatus source, status "tribulation", stacks 1, duration 99`. Note this stacks onto the *ally who dealt the lightning hit*; pair with the Ascendant's own lightning kit so its hits feed itself, and it rewards a lightning-flavored roster.
* **Abilities:**
  * **Spark Rain (AP 2, Back):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "matk * 0.8", element lightning`. Cheap lightning ticks that also trip "Herald the Storm."

**Unit 3 — Grounding Sentinel · Frontline Anchor**
* **Starting Row:** Front.
* **Gear Affix — "Iron Root Greaves":** stat mods `maxHp +300 (flat)`, `def +30 (flat)`, `mdef +30 (flat)`. Custom affix binding — `T: OnHPThresholdCrossed` · `C: self`, `statCompare self hpPercent <= 0.5` · `E: ModifyStat self, stat def, modType percentAdd, value 0.5, duration 3`.
* **Passives:**
  * **Lightning Rod** *(protective + charge conversion)* — `T: OnDamageTaken` · `C: self` · `E: ApplyStatus target source, status "grounded", stacks 1, duration 2`; `E: ModifyAP self, amount +1`. Builds its own AP by tanking and marks attackers.
* **Abilities:**
  * **Earthen Bulwark (AP 2, Front):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat allAllies, stat mdef, modType percentAdd, value 0.25, duration 3`. Party-wide magic-defense wall to survive the long charge-up phase.

**Unit 4 — Thunder-Rite Acolyte · Cross-Unit AP Funnel**
* **Starting Row:** Back.
* **Gear Affix — "Rite Bell":** stat mods `matk +30 (flat)`, `maxAp +3 (flat)`. Custom affix binding — `T: OnStatusApplied` · `C: self` · `E: ModifyAP self, amount +1` (bells itself up when statuses land on it).
* **Passives:**
  * **Feed the Ascension** *(AP funnel via `teammate`)* — `T: OnStatusApplied` · `C: teammate` (a teammate had a status applied — i.e., the Ascendant's charge landing), `chance 0.5` · `E: ModifyAP allAllies, amount +1`. Turns the constant charge-application into party-wide AP, so everyone can keep casting (which in turn charges the sky — a virtuous, chance-gated cycle that cannot infinite-loop because `ApplyStatus` from a status *tick* isn't what fires it and the 0.5 gate + finite AP cap bound it).
* **Abilities:**
  * **Consecrate (AP 2, Back):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat target, stat matk, modType percentMult, value 0.2, duration 3`. Single-target matk multiplier — bank it on the Ascendant before a detonation to multiply the whole `stacksConsumed` payload.

**Unit 5 — Rain-Bearer Cleric · Sustain**
* **Starting Row:** Back.
* **Gear Affix — "Monsoon Ewer":** stat mods `matk +25 (flat)`, `maxHp +150 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: Heal allAllies, formula "matk * 0.25"` (passive party regen for the slow-burn phase).
* **Passives:**
  * **Cloudburst Mercy** — `T: OnHPThresholdCrossed` · `C: teammate`, `statCompare target hpPercent <= 0.5` · `E: Heal target, formula "matk * 1.4"`. Emergency heal the instant any ally dips under half.
* **Abilities:**
  * **Downpour (AP 3, Back):** `T: OnAbilityCast` · `C:` none · `E: Heal allAllies, formula "matk * 1.1 + 10"`.

**Unit 6 — Sky-Reading Adept · Tempo / Setup**
* **Starting Row:** Back.
* **Gear Affix — "Astrolabe":** stat mods `speed +14 (flat)`, `critChance +0.08 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat critChance, modType flat, value 0.10`.
* **Passives:**
  * **Read the Omens** *(detonation-turn amplifier)* — `T: OnAbilityCast` · `C: teammate`, `abilityIs "ninefold_descent"` · `E: ModifyStat source, stat critDamage, modType percentMult, value 0.25, duration 1`. Recognizes the big cast and juices its crit multiplier the instant it fires. (`abilityIs` reads the event's ability id — a valid reactive trigger-side use.)
* **Abilities:**
  * **Hasten the Heavens (AP 2, Back):** `T: OnAbilityCast` · `C:` none · `E: GrantExtraTurn target`. Hand the Ascendant its detonation turn early when the reservoir is already lethal.
  * **Windshift (AP 1, Back):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target`. Reposition the Sentinel or Ascendant as the fight develops.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Ascendant "Court the Heavens"** (every teammate cast → tribulation on carry) + **Acolyte "Feed the Ascension"** (teammate status-application → party AP) + **Diviner "Herald the Storm"** (teammate lightning hit → charge).
- [x] No exponent/branch formulas: detonation is linear `matk * 2 + stacksConsumed * 12`; all others `stat * k (+ c)`.
- [x] `stacksConsumed` scoping: read **only** inside **Ninefold Descent**, in the `DealDamage` effect that sits *after* its own `ConsumeStatus` in the same binding. No separate passive tries to read another binding's consume count.
- [x] Chain exits under 25 links: no `GrantExtraTurn` self-loop; "Feed the Ascension" is `chance 0.5`-gated and bounded by finite AP caps and the fact that status *ticks* don't re-fire it.

---

# Party 3 — Cinnabar Pill Furnace (丹炉宗师)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Cinnabar Pill Furnace* — an alchemist hunched over a glowing bronze cauldron, flicking finished pills to allies who swallow them mid-fight in a flash of gold.
* **Primary Pattern:** Team Funnel — hub-and-spoke (`teammate` conditions + `ModifyAP` feeding a primary carry).
* **The Breakpoint:** The Furnace Master deals almost nothing personally. Instead it manufactures AP and stacking `percentMult` buffs and pushes them onto the party's designated carry. Early, the carry acts once per round like anyone else. Late, the hub is generating enough AP that the carry takes *two or three* actions per round while riding a stack of compounding atk multipliers — the party's damage effectively multiplies by acting-frequency × buff-stack simultaneously.
* **Core Loop Diagram:**
  `Furnace Master brews (OnTurnStart → ModifyAP allAllies)` ──> `Distribute Pills (ModifyAP + atk percentMult on carry)` ──> `Carry over-casts` ──crit/kill──> `Pill Resonance (teammate refund → ModifyAP source)` ──> `Carry casts again` ──> *bounded by AP cap + refund chance*

### 6-Unit Roster & Loadouts

**Unit 1 — Furnace Master · Team-Funnel Hub / Engine**
* **Starting Row:** Back (pure support; keep it alive at all costs).
* **Gear Affix — "Nine-Cycle Cauldron":** stat mods `maxAp +5 (flat)`, `matk +30 (flat)`, `maxHp +150 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: ModifyAP allAllies, amount +1` (the base "brew" — steady party-wide AP every round).
* **Passives:**
  * **Pill Resonance** *(the required `teammate` refund engine)* — `T: OnDamageDealt` · `C: teammate` (ally source), `wasCrit` · `E: ModifyAP target source, amount +2`. Refunds a big chunk of AP to any ally who crits — with a crit-leaning carry this is a near-total cast rebate, enabling extra actions. Bounded by each unit's `maxAp` cap, so it can't spiral.
  * **Alchemical Overflow** — `T: OnStatusApplied` · `C: self`, `hasStatus self "spirit_fire" min 1` · `E: ModifyAP self, amount +1`. Self-fuel so the hub can keep casting its distribution abilities.
* **Abilities (Active Kit):**
  * **Distribute Pills (AP 2, allAllies):** `T: OnAbilityCast` · `C:` none · `E: ModifyAP allAllies, amount +2`; `E: ModifyStat allAllies, stat atk, modType percentMult, value 0.10, duration 3`. The signature hub action — hands out both the resource and a compounding damage multiplier. Recast to keep the multiplier stack refreshed and climbing.
  * **Golden Elixir (AP 3, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: ModifyAP target, amount +3`; `E: ModifyStat target, stat critChance, modType flat, value 0.15, duration 3`; `E: ApplyStatus target, status "spirit_fire", stacks 1, duration 3`. Focused dose that turbo-charges the carry specifically and flags it with `spirit_fire` for the Pyre Adept synergy below.

**Unit 2 — Cinnabar Blade · Primary Carry**
* **Starting Row:** Front.
* **Gear Affix — "Elixir-Fed Saber":** stat mods `atk +45 (flat)`, `critChance +0.12 (flat)`, `critDamage +0.25 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self`, `hasStatus self "spirit_fire" min 1` · `E: DealDamage target, formula "atk * 0.5", element fire` (a bonus strike whenever it's dosed).
* **Passives:**
  * **Sated Fury** — `T: OnAbilityCast` · `C: self` · `E: ModifyStat self, stat atk, modType percentMult, value 0.05, duration 3`. Self-compounder: the more the funnel lets it act, the more its atk multiplies within the window.
* **Abilities:**
  * **Cinnabar Rend (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.6", element fire`. Its bread-and-butter, meant to be cast 2–3× per round once fed.
  * **Blossom Cut (AP 3, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "atk * 1.1", element fire`.

**Unit 3 — Warding Brazier · Frontline Anchor**
* **Starting Row:** Front.
* **Gear Affix — "Brazier Aegis":** stat mods `maxHp +320 (flat)`, `def +28 (flat)`. Custom affix binding — `T: OnDamageTaken` · `C: self`, `chance 0.3` · `E: ModifyAP self, amount +1`.
* **Passives:**
  * **Body as Cauldron** *(protective teammate feed)* — `T: OnDamageTaken` · `C: self` · `E: ModifyStat allAllies, stat def, modType percentAdd, value 0.04, duration 2`. Converts incoming punishment into a stacking party defense buff.
* **Abilities:**
  * **Iron Furnace Stance (AP 2, Front):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat self, stat def, modType percentAdd, value 0.4, duration 2`; `E: ModifyStat self, stat mdef, modType percentAdd, value 0.4, duration 2`.

**Unit 4 — Pyre Adept · Secondary Carry / Detonator**
* **Starting Row:** Front.
* **Gear Affix — "Emberflask Gloves":** stat mods `matk +40 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnAbilityCast` · `C: self` · `E: ApplyStatus target, status "spirit_fire", stacks 1, duration 3`.
* **Passives:**
  * **Draw the Furnace** *(cross-unit AP intake via `teammate`)* — `T: OnAbilityCast` · `C: teammate` (any ally cast), `chance 0.5` · `E: ModifyAP self, amount +1`. A second funnel receiver: the party's total activity partially funds the Adept too, so the hub effectively powers two carries.
* **Abilities:**
  * **Combust Spirit-Fire (AP 3, singleEnemy) — mini-detonation:** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus target, status "spirit_fire", count "all"` **then** `E: DealDamage target, formula "matk * 1.4 + stacksConsumed * 20", element fire`. Reads `stacksConsumed` in-binding, after its own consume. Cash in the `spirit_fire` the Furnace Master and gloves have been layering on the enemy.
  * **Ember Fan (AP 2, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "matk * 0.9", element fire`; `E: ApplyStatus allEnemies, status "spirit_fire", stacks 1, duration 3`. Spread `spirit_fire` before a Combust.

**Unit 5 — Dew-Gathering Healer · Sustain**
* **Starting Row:** Back.
* **Gear Affix — "Jade Dew Gourd":** stat mods `matk +28 (flat)`, `maxHp +170 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: Heal allAllies, formula "matk * 0.2"`.
* **Passives:**
  * **Restorative Draught** *(teammate-linked heal)* — `T: OnAbilityCast` · `C: teammate`, `abilityIs "distribute_pills"` · `E: Heal allAllies, formula "matk * 0.6"`. Every time the hub distributes pills, the party is also topped up.
* **Abilities:**
  * **Great Mend (AP 3, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.8 + 20"`.

**Unit 6 — Courier Disciple · Tempo / Utility**
* **Starting Row:** Back.
* **Gear Affix — "Swift Sandals":** stat mods `speed +16 (flat)`, `evasion +0.10 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat speed, modType percentAdd, value 0.10`.
* **Passives:**
  * **Perfect Delivery** *(extra-turn payoff for the carry)* — `T: OnAbilityCast` · `C: teammate`, `abilityIs "golden_elixir"`, `chance 0.5` · `E: GrantExtraTurn source`. When the hub doses the carry with Golden Elixir, half the time the carry immediately gets to act on it. Single, chance-gated, non-recursive — cannot chain past one grant per elixir cast.
* **Abilities:**
  * **Rush Order (AP 2, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: ModifyAP target, amount +3`. A manual burst of AP to force an extra carry action on demand.
  * **Reposition (AP 1, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target`.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Furnace Master "Pill Resonance"** (teammate crit → `ModifyAP source +2`) is the primary hub engine; **Pyre Adept "Draw the Furnace"** and **Courier "Perfect Delivery"** are secondary teammate-scoped funnels.
- [x] No exponent/branch formulas: all linear; explosive output comes from stacked `atk percentMult` (Distribute Pills × Sated Fury) plus acting-frequency from AP funnels.
- [x] `stacksConsumed` scoping: read **only** inside **Combust Spirit-Fire**, in the `DealDamage` after that binding's own `ConsumeStatus`.
- [x] Chain exits under 25 links: only retrigger is "Perfect Delivery" — one `chance 0.5` `GrantExtraTurn` per Golden Elixir cast, not self-recursive; AP refunds are hard-capped by each unit's `maxAp`.

---

# Party 4 — Spirit-Gathering Grand Array (聚灵大阵)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Spirit-Gathering Grand Array* — talisman-flag bearers anchoring a glowing geomantic formation, a pulsing "array eye" at the center binding the whole party together.
* **Primary Pattern:** Breakpoint Auras (`OnBattleStart` + `ModifyStat(allAllies)` with survival dependence), reinforced by a `teammate` combat-buff loop.
* **The Breakpoint:** The instant battle starts, four separate permanent auras layer onto the party — and because several are `percentMult`, they compound rather than merely add, so ordinary attacks land like ultimates from turn one of the *engagement* (the "slow burn" here is across a *run*: you grow into having all four array-holders online and geared). The knife's edge: every aura is `sourceUnitId`-tagged to its holder. Kill the Array Eye and its auras vanish party-wide in the same tick — a genuine "the formation collapses" failure state. The late-fight escalation comes from a `teammate` crit-loop that keeps stacking temporary `percentMult` on top of the permanent floor.
* **Core Loop Diagram:**
  `OnBattleStart: Eye + 3 Flags each ModifyStat(allAllies)` ──compound──> `party floor raised massively` ──> `any ally crit → Array Resonance (teammate → allAllies critDamage percentMult)` ──> `bigger crits → more resonance` ──> *bounded by durations; collapses instantly if the Eye dies*

### 6-Unit Roster & Loadouts

**Unit 1 — Array Eye · Keystone Aura Holder**
* **Starting Row:** Back (the whole build's survival hinges on this unit — hide it).
* **Gear Affix — "Heart-of-Formation Jade":** stat mods `maxHp +280 (flat)`, `mdef +25 (flat)`, `matk +25 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat critDamage, modType percentMult, value 0.20` (a second keystone multiplier that also dies with the Eye).
* **Passives:**
  * **Eye of the Grand Array** *(keystone survival-tethered aura)* — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat atk, modType percentMult, value 0.20`; `E: ModifyStat allAllies, stat matk, modType percentMult, value 0.20`. Permanent, `sourceUnitId`-tagged to the Eye; on the Eye's death every point of this is stripped from all six units simultaneously. This is the deliberate glass-foundation breakpoint.
  * **Array Resonance** *(the required `teammate` combat loop)* — `T: OnDamageDealt` · `C: teammate` (ally source), `wasCrit` · `E: ModifyStat allAllies, stat critDamage, modType percentMult, value 0.05, duration 3`. Every ally crit compounds the party's crit-damage temporarily; late fights snowball this on top of the permanent floor. Non-recursive: the buff doesn't cause the crit, so it can't self-trigger.
* **Abilities:**
  * **Anchor the Center (AP 2, self):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat self, stat def, modType percentAdd, value 0.5, duration 3`; `E: ModifyStat self, stat mdef, modType percentAdd, value 0.5, duration 3`. The Eye's self-preservation button.

**Unit 2 — Vermilion Flag (Attack) · Aura Holder + Frontline**
* **Starting Row:** Front (doubles as an anchor).
* **Gear Affix — "Vermilion Standard":** stat mods `maxHp +260 (flat)`, `atk +35 (flat)`, `def +22 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat critChance, modType flat, value 0.12`.
* **Passives:**
  * **Banner of Onset** *(survival-tethered aura)* — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat atk, modType percentAdd, value 0.25`. `percentAdd` here (sums with gear) so it layers cleanly with the Eye's `percentMult` for a big combined atk swing.
  * **Frontline Ward** — `T: OnDamageTaken` · `C: self` · `E: ModifyStat self, stat def, modType percentAdd, value 0.05, duration 2`.
* **Abilities:**
  * **Rallying Strike (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.5", element physical`.

**Unit 3 — Azure Flag (Speed) · Aura Holder + Tempo**
* **Starting Row:** Back.
* **Gear Affix — "Azure Streamer":** stat mods `speed +14 (flat)`, `maxAp +3 (flat)`, `mdef +20 (flat)`. Custom affix binding — `T: OnRowChanged` · `C: teammate` · `E: ModifyStat target, stat evasion, modType percentAdd, value 0.2, duration 2` (rewards an ally who just repositioned).
* **Passives:**
  * **Streaming Ley-Lines** *(survival-tethered aura)* — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat speed, modType percentMult, value 0.18`. Compounding tempo — more actions/round for the whole party.
* **Abilities:**
  * **Shifting Formation (AP 1, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target`; `E: ModifyStat target, stat speed, modType percentAdd, value 0.2, duration 2`. Positioning tempo layer — move a unit and speed it up.

**Unit 4 — Sable Flag (Ward) · Aura Holder + Support**
* **Starting Row:** Back.
* **Gear Affix — "Sable Pennant":** stat mods `maxHp +240 (flat)`, `mdef +30 (flat)`, `matk +22 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat maxHp, modType percentAdd, value 0.15`.
* **Passives:**
  * **Warding Lattice** *(survival-tethered aura)* — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat def, modType percentAdd, value 0.20`; `E: ModifyStat allAllies, stat mdef, modType percentAdd, value 0.20`. Raises the whole party's survivability floor so the array can hold long enough to matter.
  * **Reinforce the Eye** *(teammate protection)* — `T: OnDamageTaken` · `C: teammate`, `statCompare target hpPercent <= 0.5` · `E: ModifyStat target, stat def, modType percentAdd, value 0.3, duration 2`. Automatically hardens any ally (especially the Eye) that gets low.
* **Abilities:**
  * **Spirit Bulwark (AP 3, allAllies):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat allAllies, stat mdef, modType percentAdd, value 0.3, duration 3`; `E: Heal allAllies, formula "matk * 0.7"`.

**Unit 5 — Formation Carry · Primary Damage**
* **Starting Row:** Front.
* **Gear Affix — "Ley-Charged Spear":** stat mods `atk +50 (flat)`, `critChance +0.10 (flat)`, `critDamage +0.30 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self`, `wasCrit`, `chance 0.25` · `E: ModifyAP self, amount +1`.
* **Passives:**
  * **Empowered by the Array** *(aura receiver amplifier)* — `T: OnAbilityCast` · `C: self` · `E: ModifyStat self, stat atk, modType percentMult, value 0.06, duration 3`. Rides the array's floor and compounds its own atk as it acts — the unit that visibly turns "raised floor" into "ridiculous ceiling."
* **Abilities:**
  * **Grand Array Lance (AP 3, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 2.0", element physical`. A high base multiplier that the compounded auras (atk `percentAdd` from Vermilion + `percentMult` from Eye + self-ramp + crit-damage stack) inflate dramatically.
  * **Sweeping Standard (AP 3, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "atk * 1.2", element physical`.

**Unit 6 — Talisman Warden · Cross-Unit Engine + Sustain**
* **Starting Row:** Back.
* **Gear Affix — "Conduit Talismans":** stat mods `matk +30 (flat)`, `maxAp +4 (flat)`, `maxHp +160 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: Heal allAllies, formula "matk * 0.2"`.
* **Passives:**
  * **Ley-Line Conduit** *(cross-unit AP funnel via `teammate`)* — `T: OnDamageDealt` · `C: teammate` (ally source), `wasCrit` · `E: ModifyAP target source, amount +1`. Feeds AP back to whoever crits — chiefly the Formation Carry — so the raised-floor party also gets to *act more*, converting the aura advantage into extra turns.
* **Abilities:**
  * **Focus the Array (AP 2, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: ModifyAP target, amount +2`; `E: ModifyStat target, stat critChance, modType flat, value 0.15, duration 3`. Point the formation's power at one carry.
  * **Mending Sigil (AP 3, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.7 + 15"`.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Talisman Warden "Ley-Line Conduit"** (teammate crit → `ModifyAP source`); reinforced by **Array Eye "Array Resonance"** (teammate crit → party critDamage) and **Sable Flag "Reinforce the Eye"** (teammate low-HP → protection).
- [x] No exponent/branch formulas: all linear; the "explosion" is four `OnBattleStart` auras compounding (`percentMult` × `percentAdd`) plus the crit-damage resonance stack — exactly the compounding-modifier route the brief prescribes.
- [x] `stacksConsumed` scoping: N/A (no `ConsumeStatus` in this party); nothing reads a cross-binding consume count.
- [x] Chain exits under 25 links: no `GrantExtraTurn` self-loop; "Array Resonance" is a duration-limited buff that cannot cause the crit that triggers it, so it is strictly non-recursive.

---

## Global Constraint Audit (all four parties)

| Constraint | Status | Notes |
|---|---|---|
| Pure Trigger/Condition/Effect schemas only | ✅ | Every ability, passive, and gear affix above is a `T/C/E` binding using only documented triggers, conditions, and effects. |
| Linear formulas only | ✅ | All `DealDamage`/`Heal` formulas are `stat * k (+ c)` or `stat * k + stacksConsumed * k`. No exponents, `min`/`max`, or ternaries. |
| Explosive scaling from `percentMult` + stacks | ✅ | Sword storm (crit-damage percentMult ramp), Tribulation (deep `stacksConsumed` consume), Furnace (atk percentMult × acting-frequency), Array (4 compounding OnBattleStart auras). |
| `stacksConsumed` scoped to its own binding | ✅ | Only used in **Ninefold Descent** (P2) and **Combust Spirit-Fire** (P3); in both, the `stacksConsumed`-reading `DealDamage` sits after the `ConsumeStatus` *in the same binding*. |
| ≥1 `teammate` cross-unit engine per party | ✅ | P1 Sword-Song Cantor; P2 Court the Heavens / Feed the Ascension; P3 Pill Resonance; P4 Ley-Line Conduit. |
| Chains resolve under 25-link cap | ✅ | Only self-`GrantExtraTurn` loop is P1's Sword Heart Cascade (`chance 0.4`, expected depth <2). All other retriggers are single, non-recursive, chance-gated grants. |

> **One engine caveat flagged (per the brief's honesty rule):** none of these designs rely on a *standalone* passive reading another binding's `stacksConsumed` — that's the documented engine gap, and all consume-scaling is kept inside the consuming binding. If you later want a separate "bonus damage per stack the Ascendant consumed" passive on a *different* unit, that is not currently buildable and would need the engine wishlist item.
