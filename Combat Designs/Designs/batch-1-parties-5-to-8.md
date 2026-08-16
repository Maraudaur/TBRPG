# Batch 2 — Full Party Designs (Themes 5–8)

*Lead Combat Systems Designer output. Built against `core-mechanics-design-brief.md` + `how-to-make-abilities-and-passives.md`, using the `party-design-engine.md` template. Every ability, passive, and gear affix below is expressed purely as Trigger / Condition / Effect bindings. Formulas are linear; explosive scaling comes from `percentMult` compounding and deep stack-consumes. All chain loops terminate naturally well under the 25-link cap.*

**Legend for binding shorthand**
`T:` Trigger · `C:` Conditions (AND'd) · `E:` Effects (top-to-bottom). Effect/condition `target` uses engine semantics: `self` = binding owner, `source`/`target` = the event's source/target role, `allAllies`/`allEnemies` = whole side. `not(x)` / `allOf` / `anyOf` are the nesting conditions.

---

# Party 5 — Blood-Path Demon Cultivator (血魔道)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Blood-Path Demon Cultivator* — a pale, black-veined heretic burning their own blood as fuel, crimson qi erupting harder the closer they edge toward qi-deviation.
* **Primary Pattern:** Execute / Comeback Breakpoint (`OnHPThresholdCrossed` at 50% and 25%, gated on `hpPercent`).
* **The Breakpoint:** At full HP the Sovereign is deliberately mediocre. The build's whole design is to *push itself down* — an active self-sacrifice button and a party that feeds on pain — so it crosses 50% then 25%, ratcheting on permanent `percentMult` atk and crit buffs at each threshold. Once low and buffed, its execute finisher scales off the enemy's missing HP, so a wounded demon at 20% HP hits many times harder than a healthy one — the classic "should be dying, is instead unkillable" turn.
* **Core Loop Diagram:**
  `Blood Offering (DealDamage self) drops Sovereign under threshold` ──> `Qi Deviation (OnHPThresholdCrossed → permanent atk percentMult)` ──> `any ally hurt → Feast on Suffering (teammate → Sovereign atk% + AP)` ──> `Crimson Rend / Sever the Thread execute vs low targets` ──> *comeback ceiling climbs each threshold*

### 6-Unit Roster & Loadouts

**Unit 1 — Blood Sovereign · Execute Carry**
* **Starting Row:** Front.
* **Gear Affix — "Heart-Blood Regalia":** stat mods `atk +45 (flat)`, `maxHp +260 (flat)`, `critDamage +0.30 (flat)`. Custom affix binding — `T: OnHPThresholdCrossed` · `C: self`, `statCompare self hpPercent <= 0.25` · `E: ModifyStat self, stat critChance, modType flat, value 0.25`.
* **Passives:**
  * **Qi Deviation (I)** *(comeback breakpoint)* — `T: OnHPThresholdCrossed` · `C: self`, `statCompare self hpPercent <= 0.5` · `E: ModifyStat self, stat atk, modType percentMult, value 0.40` (no duration → permanent for the rest of the fight).
  * **Qi Deviation (II)** — `T: OnHPThresholdCrossed` · `C: self`, `statCompare self hpPercent <= 0.25` · `E: ModifyStat self, stat atk, modType percentMult, value 0.60`; `E: ModifyStat self, stat critDamage, modType percentMult, value 0.40`. The two thresholds compound multiplicatively — crossing both is roughly ×1.4 × ×1.6 = ×2.24 base atk before gear/auras.
  * **Feast on Suffering** *(the required `teammate` engine)* — `T: OnDamageTaken` · `C: teammate` (a teammate took the hit, not the Sovereign) · `E: ModifyStat self, stat atk, modType percentMult, value 0.05, duration 3`; `E: ModifyAP self, amount +1`. Every wound the party suffers feeds the demon's atk and refuels its AP — a cross-unit engine that turns the whole team's pain into the carry's fuel. (`teammate` excludes the Sovereign's own self-damage, so Blood Offering can't loop this.)
* **Abilities (Active Kit):**
  * **Blood Offering (AP 1, self) — the enabler:** `T: OnAbilityCast` · `C:` none · `E: DealDamage self, formula "level * 6", element dark`. Deliberate self-harm to force a threshold crossing early and turn the comeback mechanic into a controllable button instead of waiting to be hurt. `level`-scaled so it stays a meaningful chunk without ever being lethal on its own.
  * **Crimson Rend (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.7", element dark`. The bread-and-butter that the Qi Deviation multipliers inflate.
  * **Sever the Thread (AP 3, singleEnemy) — execute:** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.5 + targetMaxHp * 0.20 - targetCurrentHp * 0.20", element dark`. Linear execute: at full enemy HP the `+max −current` terms cancel; as the target drops, the subtraction shrinks and the net bonus approaches +20% of the target's max HP. No branching — pure linear math.

**Unit 2 — Sanguine Herald · Threshold Enabler + Support**
* **Starting Row:** Back.
* **Gear Affix — "Bloodletting Censer":** stat mods `matk +30 (flat)`, `maxAp +3 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat atk, modType percentAdd, value 0.15`.
* **Passives:**
  * **Shared Wounds** *(teammate execute-enabler)* — `T: OnDamageDealt` · `C: teammate` (an ally hit something), `chance 0.4` · `E: ApplyStatus target, status "hemorrhage", stacks 1, duration 3`. Layers a bleed-marker on enemies the party is already hitting, growing the Acolyte's detonation fuel.
* **Abilities:**
  * **Crimson Communion (AP 2, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "level * 8", element dark`; `E: ModifyStat target, stat critChance, modType flat, value 0.2, duration 3`. Can be aimed at the *Sovereign* to shove it under a threshold on demand while also buffing it — the intended combo with Blood Offering when one self-hit isn't enough.

**Unit 3 — Bone Warden · Frontline Anchor**
* **Starting Row:** Front.
* **Gear Affix — "Ossuary Plate":** stat mods `maxHp +340 (flat)`, `def +30 (flat)`, `mdef +26 (flat)`. Custom affix binding — `T: OnHPThresholdCrossed` · `C: self`, `statCompare self hpPercent <= 0.5` · `E: ModifyStat self, stat def, modType percentAdd, value 0.5, duration 4`.
* **Passives:**
  * **Bulwark of Bone** *(teammate protection)* — `T: OnDamageTaken` · `C: teammate`, `statCompare target hpPercent <= 0.25` · `E: ModifyStat target, stat def, modType percentAdd, value 0.3, duration 2`. Hardens allies (including the Sovereign) once they hit the danger zone the build deliberately courts — keeps "low HP" from tipping into "dead."
* **Abilities:**
  * **Grave Taunt (AP 2, Front):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat self, stat def, modType percentAdd, value 0.4, duration 2`; `E: DealDamage allEnemies, formula "atk * 0.5", element physical`.

**Unit 4 — Crimson Acolyte · Detonator (Bleed Cash-In)**
* **Starting Row:** Front.
* **Gear Affix — "Vein-Tap Claws":** stat mods `atk +38 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self` · `E: ApplyStatus target, status "hemorrhage", stacks 1, duration 3`.
* **Passives:**
  * **Scent of Blood** — `T: OnDamageDealt` · `C: self`, `statCompare target hpPercent <= 0.5` · `E: ModifyStat self, stat critChance, modType flat, value 0.1, duration 2`. Gets more precise as targets bleed out.
* **Abilities:**
  * **Rupture (AP 3, singleEnemy) — detonation:** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus target, status "hemorrhage", count "all"` **then** `E: DealDamage target, formula "atk * 1.4 + stacksConsumed * 16", element dark`. `stacksConsumed` read in the **same binding**, in the `DealDamage` *after* its own `ConsumeStatus`. Cash in every bleed the party layered on.
  * **Bloodspray (AP 2, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "atk * 0.9", element dark`; `E: ApplyStatus allEnemies, status "hemorrhage", stacks 1, duration 3`.

**Unit 5 — Marrow Priest · Sustain (Sweet-Spot Keeper)**
* **Starting Row:** Back.
* **Gear Affix — "Marrow Chalice":** stat mods `matk +28 (flat)`, `maxHp +170 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: Heal allAllies, formula "matk * 0.18"`.
* **Passives:**
  * **Stay the Reaper** — `T: OnHPThresholdCrossed` · `C: teammate`, `statCompare target hpPercent <= 0.25` · `E: Heal target, formula "matk * 1.6"`. A single big pull-back the moment an ally hits 25% — it keeps the Sovereign *at* the powerful low-HP band without letting it die, rather than healing it out of its own breakpoint.
* **Abilities:**
  * **Blood Transfusion (AP 3, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.7 + 15"`.

**Unit 6 — Hex Diviner · Execute Setup + Tempo**
* **Starting Row:** Back.
* **Gear Affix — "Withering Beads":** stat mods `matk +30 (flat)`, `speed +12 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allEnemies, stat def, modType percentAdd, value -0.15` (a party-wide armor shred that stacks the enemies into execute range faster).
* **Passives:**
  * **Doom Sense** *(teammate execute assist)* — `T: OnDamageDealt` · `C: teammate` (ally source), `statCompare target hpPercent <= 0.25` · `E: DealDamage target, formula "matk * 1.0", element dark`. Chips low targets whenever an ally strikes them, helping secure the kills that keep the Sovereign fed and the enemy count dropping. Non-recursive: the Diviner's own hit has `source = self`, failing `teammate`.
* **Abilities:**
  * **Curse of Frailty (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat target, stat def, modType percentAdd, value -0.4, duration 3`; `E: ModifyStat target, stat mdef, modType percentAdd, value -0.4, duration 3`.
  * **Blood Beckon (AP 1, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: GrantExtraTurn target`. Hand the Sovereign an extra action the turn it comes fully online.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Blood Sovereign "Feast on Suffering"** (teammate hurt → Sovereign atk% + AP); plus teammate-scoped assists on Herald, Bone Warden, Marrow Priest, Hex Diviner.
- [x] No exponent/branch formulas: execute is linear `atk * 1.5 + targetMaxHp * 0.20 - targetCurrentHp * 0.20`; all others `stat * k (+ c)`.
- [x] `stacksConsumed` scoping: read **only** inside **Rupture**, in the `DealDamage` after that binding's own `ConsumeStatus`.
- [x] Chain exits under 25 links: no self-`GrantExtraTurn` loop (Blood Beckon is a single external grant); threshold triggers fire once each per battle by engine rule; "Doom Sense" is a single non-recursive assist.

---

# Party 6 — Nine-Tailed Fox Illusionist (九尾狐)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Nine-Tailed Fox Illusionist* — a fox-spirit trailing nine tails of mist, flickering between afterimages; enemies swing where she was while she reappears in a different rank.
* **Primary Pattern:** Positioning Tempo (`SwitchRow` + `OnRowChanged`), with a `fox_fire` stack-detonate payoff.
* **The Breakpoint:** Every row change is a trigger. Early it's just a dodge tool; late, the party is engineered so that *moving* is the strongest thing you can do — each `SwitchRow` procs damage, banks `fox_fire`, funnels AP, and buffs the mover, while the Matriarch shoves enemy attackers to the back row where **they cannot act at all**. A full turn becomes a blur of repositions that simultaneously denies the enemy their actions and detonates a hoard of `fox_fire` — control and burst from the same motion.
* **Core Loop Diagram:**
  `Phantom Step (SwitchRow self) → OnRowChanged` ──> `Ninefold Afterimage (row change → fox_fire + damage)` ──> `Mirror Dance (teammate row change → mover gains AP)` ──> `enemy SwitchRow → back row → enemy loses its action` ──> `Illusory Collapse: ConsumeStatus fox_fire → burst` ──> *bounded: reactive procs never call SwitchRow*

### 6-Unit Roster & Loadouts

**Unit 1 — Nine-Tailed Matriarch · Tempo Carry**
* **Starting Row:** Front (dances front↔back).
* **Gear Affix — "Ninefold Tail-Wrap":** stat mods `speed +16 (flat)`, `evasion +0.12 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnRowChanged` · `C: self` · `E: ApplyStatus self, status "fox_fire", stacks 2, duration 4`.
* **Passives:**
  * **Ninefold Afterimage** *(the positioning engine)* — `T: OnRowChanged` · `C: self` · `E: DealDamage allEnemies, formula "matk * 0.6", element fire`; `E: ModifyStat self, stat evasion, modType percentAdd, value 0.2, duration 2`. Every time she moves she flickers out a burst and gets harder to hit. Note: this reaction contains **no `SwitchRow`**, so it fires exactly once per row change and cannot recurse.
* **Abilities (Active Kit):**
  * **Phantom Step (AP 1, self):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow self`; `E: DealDamage allEnemies, formula "matk * 0.5", element fire`. Her core tempo button — one cast = one row change = one Afterimage proc + fox_fire.
  * **Illusory Collapse (AP 3, allEnemies) — detonation:** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus self, status "fox_fire", count "all"` **then** `E: DealDamage allEnemies, formula "matk * 1.3 + stacksConsumed * 14", element fire`. `stacksConsumed` read in the **same binding**, after its own `ConsumeStatus` — cash in a run of accumulated dances.

**Unit 2 — Mirror-Image Disciple · Cross-Unit Engine**
* **Starting Row:** Back.
* **Gear Affix — "Twin-Mirror Pendant":** stat mods `maxAp +4 (flat)`, `speed +10 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat evasion, modType flat, value 0.10`.
* **Passives:**
  * **Mirror Dance** *(the required `teammate` engine)* — `T: OnRowChanged` · `C: teammate` (an ally other than the Disciple changed row) · `E: ModifyAP target, amount +1`; `E: ModifyStat target, stat critChance, modType flat, value 0.1, duration 2`. Every ally reposition refunds that ally AP and sharpens them — this is what lets the Matriarch (and anyone else) dance repeatedly in a single turn instead of running dry. Cross-unit: owner reacts to *teammates'* row changes and rewards the mover.
* **Abilities:**
  * **Shared Reflection (AP 2, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target`; `E: ModifyStat target, stat matk, modType percentMult, value 0.12, duration 3`. Move an ally *and* buff them — triggers their own OnRowChanged procs on the Disciple's turn.

**Unit 3 — Vermilion Guard · Frontline Anchor + Enemy Displacer**
* **Starting Row:** Front.
* **Gear Affix — "Warding Fan-Shield":** stat mods `maxHp +300 (flat)`, `def +28 (flat)`. Custom affix binding — `T: OnRowChanged` · `C: self` · `E: ModifyStat self, stat def, modType percentAdd, value 0.2, duration 2`.
* **Passives:**
  * **Guardian's Cadence** *(teammate tempo payoff)* — `T: OnRowChanged` · `C: teammate` · `E: ModifyStat target, stat atk, modType percentMult, value 0.06, duration 3`; `E: ModifyStat target, stat matk, modType percentMult, value 0.06, duration 3`. Whoever steps up (or back) gets a compounding hybrid buff — repeated dances stack these `percentMult` layers into the "ridiculous" range.
* **Abilities:**
  * **Displacing Palm (AP 2, singleEnemy) — control:** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.2", element physical`; `E: SwitchRow target, row "back"`. Shove an enemy attacker to the back row, where it **cannot take its turn-action** — pure tempo denial. (Fires the enemy's `OnRowChanged`, but enemies here have no row-reaction passives, so nothing chains.)

**Unit 4 — Illusionist Twin · Secondary Detonator**
* **Starting Row:** Front.
* **Gear Affix — "Phantom Bells":** stat mods `matk +36 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnRowChanged` · `C: self` · `E: ApplyStatus self, status "fox_fire", stacks 1, duration 4`.
* **Passives:**
  * **Echoing Illusions** — `T: OnRowChanged` · `C: teammate` · `E: ApplyStatus self, status "fox_fire", stacks 1, duration 4`. Banks fox_fire off *allies'* movement too, so the Twin fills its reservoir passively while the party dances.
* **Abilities:**
  * **Mirror Burst (AP 3, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus self, status "fox_fire", count "all"` **then** `E: DealDamage allEnemies, formula "matk * 1.1 + stacksConsumed * 12", element fire`. A second, independent fox_fire cash-in (its own binding, its own consume → its own `stacksConsumed`).
  * **Blink Strike (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.4", element fire`; `E: SwitchRow self`. Attack and reposition in one motion.

**Unit 5 — Charmer of Mists · Control / Tempo**
* **Starting Row:** Back.
* **Gear Affix — "Beguiling Veil":** stat mods `speed +14 (flat)`, `mdef +22 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat speed, modType percentMult, value 0.12`.
* **Passives:**
  * **Disorienting Presence** — `T: OnRowChanged` · `C: teammate` · `E: ModifyStat allEnemies, stat accuracy, modType percentAdd, value -0.08, duration 2`. The party's constant repositioning makes the enemy miss more.
* **Abilities:**
  * **Beguiling Shift (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target, row "back"`; `E: ModifyStat target, stat evasion, modType percentAdd, value -0.3, duration 2`. Second enemy-displacement tool to lock two attackers out of acting.
  * **Fox's Grace (AP 2, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: SwitchRow target`; `E: ModifyAP target, amount +1`.

**Unit 6 — Spirit-Fox Healer · Sustain**
* **Starting Row:** Back.
* **Gear Affix — "Moonlit Gourd":** stat mods `matk +28 (flat)`, `maxHp +160 (flat)`. Custom affix binding — `T: OnRowChanged` · `C: teammate` · `E: Heal target, formula "matk * 0.4"`.
* **Passives:**
  * **Restorative Mist** — `T: OnTurnStart` · `C: self` · `E: Heal allAllies, formula "matk * 0.2"`.
* **Abilities:**
  * **Nine-Tails Blessing (AP 3, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.7 + 15"`.
  * **Veil of Renewal (AP 3, allAllies):** `T: OnAbilityCast` · `C:` none · `E: Heal allAllies, formula "matk * 0.8"`.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Mirror-Image Disciple "Mirror Dance"** (teammate row change → `ModifyAP` to the mover + crit); reinforced by Guardian's Cadence, Echoing Illusions, Disorienting Presence, and the Healer's row-change heal — all `teammate`-scoped.
- [x] No exponent/branch formulas: all `DealDamage`/`Heal` are linear `stat * k (+ c)` or `stat * k + stacksConsumed * k`.
- [x] `stacksConsumed` scoping: read **only** inside **Illusory Collapse** and **Mirror Burst**, each in the `DealDamage` after that same binding's own `ConsumeStatus`.
- [x] Chain exits under 25 links: **no reactive binding calls `SwitchRow`** — every `SwitchRow` is on an active ability, so each produces exactly one `OnRowChanged`, firing reactions once with no recursion. No self-`GrantExtraTurn` loops.

---

# Party 7 — Five Elements Generative Cycle (五行相生)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Five Elements Generative Cycle* — five cultivators in a colored ring (wood-green, fire-red, earth-yellow, metal-white, water-blue), each one's technique visibly kindling the next around the wheel, all anchored by a central Taiji core.
* **Primary Pattern:** Team Funnel — peer relay (`teammate` conditions banking a shared convergence for the Core carry).
* **The Breakpoint:** Each of the five elementalists, when it acts, lays a compounding `percentMult` buff on the whole party in its governing stat *and* banks a `wuxing_harmony` charge onto the Core. Early, one member acting is a small nudge. Once the full ring is online, a single round has all five act in sequence — five compounding buffs land on everyone and five charges convey to the Core, which then detonates the entire convergence in one harmonized blast. The "cycle completing" is the breakpoint: the whole party's stats spike the same round the Core dumps a deep `stacksConsumed` payload.
* **Core Loop Diagram:**
  `Each elementalist casts → allAllies [stat] percentMult (compounds)` ──> `Convergence (teammate cast → wuxing_harmony onto Core)` ──> `Metal crit → AP relay to source` ──> `ring keeps spinning` ──> `Taiji Nova: ConsumeStatus harmony → allEnemies burst` ──> *bank empties, wheel turns again*

### 6-Unit Roster & Loadouts

**Unit 1 — Wuji Taiji Core · Detonator / Funnel Hub**
* **Starting Row:** Front.
* **Gear Affix — "Taiji Diagram Pendant":** stat mods `matk +40 (flat)`, `maxHp +220 (flat)`, `maxAp +3 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: ApplyStatus self, status "wuxing_harmony", stacks 1, duration 99`.
* **Passives:**
  * **Convergence of Five** *(the required `teammate` funnel)* — `T: OnAbilityCast` · `C: teammate` (any ally other than the Core cast) · `E: ApplyStatus self, status "wuxing_harmony", stacks 1, duration 99`. Every elementalist's action conveys a charge to the Core — a five-spoke funnel that fills the reservoir ~5×/round at full ring.
* **Abilities (Active Kit):**
  * **Taiji Nova (AP 4, allEnemies) — detonation:** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus self, status "wuxing_harmony", count "all"` **then** `E: DealDamage allEnemies, formula "matk * 1.6 + stacksConsumed * 11", element neutral`. `stacksConsumed` read in the **same binding**, after its own `ConsumeStatus`. Harmonized (neutral) so no element resist blunts it.
  * **Balance Strike (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.4", element neutral`.

**Unit 2 — Verdant Wood Sage · Growth (Wood 木)**
* **Starting Row:** Back.
* **Gear Affix — "Living-Root Staff":** stat mods `matk +26 (flat)`, `maxHp +180 (flat)`, `maxAp +3 (flat)`. Custom affix binding — `T: OnTurnStart` · `C: self` · `E: ModifyAP allAllies, amount +1` (wood = generation; steady party AP so the ring can keep spinning).
* **Passives:**
  * **Flourish** — `T: OnAbilityCast` · `C: self` · `E: ModifyStat allAllies, stat maxHp, modType percentAdd, value 0.08, duration 99`; `E: Heal allAllies, formula "matk * 0.4"`. Wood's contribution to the compounding ring.
* **Abilities:**
  * **Verdant Surge (AP 2, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.5 + 12"`; `E: ModifyStat target, stat matk, modType percentMult, value 0.10, duration 3`.

**Unit 3 — Cinder Fire Adept · Damage (Fire 火)**
* **Starting Row:** Front.
* **Gear Affix — "Emberheart Talisman":** stat mods `matk +38 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnAbilityCast` · `C: self` · `E: ModifyStat allAllies, stat matk, modType percentMult, value 0.06, duration 4` (fire = the party's damage-multiplier spoke; recasting keeps it stacking).
* **Passives:**
  * **Kindle the Ring** *(teammate relay amplifier)* — `T: OnAbilityCast` · `C: teammate`, `chance 0.5` · `E: ModifyStat self, stat matk, modType percentMult, value 0.05, duration 4`. Every ally action has a chance to feed the fire's own scaling — the relay pushing power *into* the primary damage spoke.
* **Abilities:**
  * **Blaze Cascade (AP 3, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "matk * 1.2", element fire`.
  * **Searing Lance (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.5", element fire`.

**Unit 4 — Stone Earth Warden · Anchor (Earth 土)**
* **Starting Row:** Front.
* **Gear Affix — "Mountain-Root Aegis":** stat mods `maxHp +320 (flat)`, `def +30 (flat)`, `mdef +26 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat def, modType percentAdd, value 0.18`.
* **Passives:**
  * **Steadfast Ground** — `T: OnAbilityCast` · `C: self` · `E: ModifyStat allAllies, stat mdef, modType percentAdd, value 0.10, duration 99`. Earth's stabilizing spoke — lets the fragile ring survive long enough to complete the cycle.
* **Abilities:**
  * **Tectonic Guard (AP 2, allAllies):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat allAllies, stat def, modType percentAdd, value 0.25, duration 3`.

**Unit 5 — Gleaming Metal Sage · Crit / AP Relay (Metal 金)**
* **Starting Row:** Front.
* **Gear Affix — "Whitegold Edge":** stat mods `atk +40 (flat)`, `critChance +0.12 (flat)`, `critDamage +0.25 (flat)`. Custom affix binding — `T: OnAbilityCast` · `C: self` · `E: ModifyStat allAllies, stat critChance, modType flat, value 0.06, duration 4`.
* **Passives:**
  * **Sharpened Cycle** *(teammate AP relay)* — `T: OnDamageDealt` · `C: teammate` (ally source), `wasCrit` · `E: ModifyAP target source, amount +1`. Metal "cuts" extra tempo into whoever crits, keeping the wheel spinning — a second cross-unit funnel alongside the Core's Convergence.
* **Abilities:**
  * **Thousand-Edge Cut (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.5", element holy`.

**Unit 6 — Tide Water Diviner · Control / Sustain (Water 水)**
* **Starting Row:** Back.
* **Gear Affix — "Deepcurrent Pearl":** stat mods `matk +30 (flat)`, `speed +12 (flat)`, `maxHp +150 (flat)`. Custom affix binding — `T: OnBattleStart` · `C:` none · `E: ModifyStat allAllies, stat speed, modType percentMult, value 0.10`.
* **Passives:**
  * **Flowing Return** — `T: OnAbilityCast` · `C: teammate`, `chance 0.4` · `E: Heal allAllies, formula "matk * 0.35"`. Water closes the cycle back to wood — the party's own activity keeps it topped up.
* **Abilities:**
  * **Tidal Slow (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.2", element ice`; `E: ModifyStat target, stat speed, modType percentMult, value -0.3, duration 3`.
  * **Nourishing Wave (AP 3, allAllies):** `T: OnAbilityCast` · `C:` none · `E: Heal allAllies, formula "matk * 0.9 + 10"`.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Taiji Core "Convergence of Five"** (every teammate cast → harmony charge on the Core) + **Metal Sage "Sharpened Cycle"** (teammate crit → AP relay) + Fire's "Kindle the Ring" and Water's "Flowing Return" (teammate-gated).
- [x] No exponent/branch formulas: detonation is linear `matk * 1.6 + stacksConsumed * 11`; explosive scaling comes from five compounding `percentMult`/`percentAdd` spokes plus a deep harmony consume.
- [x] `stacksConsumed` scoping: read **only** inside **Taiji Nova**, in the `DealDamage` after that binding's own `ConsumeStatus`.
- [x] Chain exits under 25 links: no `GrantExtraTurn` loop anywhere; all relay effects are single, `chance`-gated or one-shot, and AP is `maxAp`-capped.

---

# Party 8 — Yellow Springs Ghost Harvester (黄泉引魂)

### Archetype Fantasy & Breakpoint Loop
* **Theme / Fantasy Name:** *Yellow Springs Ghost Harvester* — a ghost-path cultivator wreathed in blue-white yin flame, a lantern of trapped souls at the hip flaring brighter with every kill.
* **Primary Pattern:** Chain / Retrigger Loop via `OnDeath` (on-kill payoffs cascading into more kills).
* **The Breakpoint:** Nothing dramatic happens until bodies start dropping. The first kill fires a reaping pulse that harvests souls, buffs the Harvester, and can *itself* land the killing blow on the next enemy — which fires another pulse, and another. Once the party can reliably tip one enemy over, a single well-timed hit sets off a soul-cascade that clears an entire wave in one turn, the lantern fattening with each death. The banked souls then feed a `stacksConsumed` finisher for the next fight's opener.
* **Core Loop Diagram:**
  `Ally lands a killing blow → OnDeath (enemy)` ──> `Reaping Harvest (enemy death → soul_harvest + matk% + AoE pulse)` ──> `pulse kills next enemy → OnDeath again` ──> `Grave Pact (teammate execute) secures more kills` ──> `Open the Lantern: ConsumeStatus soul_harvest → burst` ──> *cascade stops when no enemy dies (≤ enemy count, far under 25)*

### 6-Unit Roster & Loadouts

**Unit 1 — Yellow Springs Harvester · Chain Carry**
* **Starting Row:** Front.
* **Gear Affix — "Soul-Lantern Grasp":** stat mods `matk +42 (flat)`, `maxHp +220 (flat)`, `critChance +0.10 (flat)`. Custom affix binding — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: ModifyAP self, amount +2` (every enemy death refuels the Harvester).
* **Passives:**
  * **Reaping Harvest** *(the OnDeath chain engine)* — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: ApplyStatus self, status "soul_harvest", stacks 2, duration 99`; `E: ModifyStat self, stat matk, modType percentMult, value 0.10, duration 99`; `E: DealDamage allEnemies, formula "matk * 0.8", element dark`. The `not(self)` + `not(teammate)` conditions isolate **enemy** deaths (a dead enemy is neither the owner nor an ally). The AoE pulse can land the next kill → another `OnDeath` → another pulse: the cascade. It terminates naturally when a pulse fails to kill anything, and is hard-bounded by the finite enemy count (≤ ~6), nowhere near the 25-link cap. Each death also permanently ratchets the Harvester's matk, so late links hit harder than early ones.
* **Abilities (Active Kit):**
  * **Open the Lantern (AP 3, allEnemies) — detonation:** `T: OnAbilityCast` · `C:` none · `E: ConsumeStatus self, status "soul_harvest", count "all"` **then** `E: DealDamage allEnemies, formula "matk * 1.4 + stacksConsumed * 18", element dark`. `stacksConsumed` read in the **same binding**, after its own `ConsumeStatus`. Dump the harvested souls in one blast — often the opener that tips the first enemy over to start the cascade.
  * **Reaper's Scythe (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.6", element dark`. Reliable single-target to secure the first kill.

**Unit 2 — Soul-Lantern Binder · Cross-Unit Engine**
* **Starting Row:** Back.
* **Gear Affix — "Binding Chains":** stat mods `matk +30 (flat)`, `maxAp +4 (flat)`. Custom affix binding — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: ModifyAP allAllies, amount +1` (party-wide kill dividend).
* **Passives:**
  * **Grave Pact** *(the required `teammate` engine)* — `T: OnDamageDealt` · `C: teammate` (an ally struck a target), `statCompare target hpPercent <= 0.25` · `E: DealDamage target, formula "matk * 1.3", element dark`. When any ally hits a low enemy, the Binder adds a dark strike to secure the kill — directly manufacturing the `OnDeath` events the whole party's chain feeds on. Non-recursive: the Binder's own strike has `source = self`, failing `teammate`.
  * **Soul Tithe** — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: ApplyStatus source, status "soul_harvest", stacks 1, duration 99`. Feeds an extra soul to whoever landed the kill.
* **Abilities:**
  * **Chain of Yellow Springs (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.2", element dark`; `E: ModifyStat target, stat def, modType percentAdd, value -0.3, duration 3`. Softens a tough target into cascade range.

**Unit 3 — Grave Warden · Frontline Anchor**
* **Starting Row:** Front.
* **Gear Affix — "Tombstone Plate":** stat mods `maxHp +330 (flat)`, `def +30 (flat)`, `mdef +24 (flat)`. Custom affix binding — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: ModifyStat self, stat def, modType percentAdd, value 0.1, duration 3`.
* **Passives:**
  * **Warden of the Dead** *(teammate protection)* — `T: OnDamageTaken` · `C: teammate`, `statCompare target hpPercent <= 0.5` · `E: ModifyStat target, stat def, modType percentAdd, value 0.25, duration 2`.
* **Abilities:**
  * **Grave Bulwark (AP 2, Front):** `T: OnAbilityCast` · `C:` none · `E: ModifyStat self, stat def, modType percentAdd, value 0.4, duration 2`; `E: DealDamage allEnemies, formula "atk * 0.4", element physical`.

**Unit 4 — Wraith Caller · Setup / DoT**
* **Starting Row:** Back.
* **Gear Affix — "Wailing Censer":** stat mods `matk +36 (flat)`, `speed +10 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self` · `E: ApplyStatus target, status "yin_rot", stacks 1, duration 3`.
* **Passives:**
  * **Attend the Passing** — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: ModifyStat self, stat matk, modType percentMult, value 0.06, duration 99`. The Caller also grows off the cascade.
* **Abilities:**
  * **Soul Rot (AP 2, singleEnemy):** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "matk * 1.1", element dark`; `E: ApplyStatus target, status "yin_rot", stacks 2, duration 3`.
  * **Wail of the Damned (AP 3, allEnemies):** `T: OnAbilityCast` · `C:` none · `E: DealDamage allEnemies, formula "matk * 1.0", element dark`. Softens a whole wave toward the cascade threshold.

**Unit 5 — Nether Priest · Sustain**
* **Starting Row:** Back.
* **Gear Affix — "Lantern of Return":** stat mods `matk +28 (flat)`, `maxHp +170 (flat)`. Custom affix binding — `T: OnDeath` · `C: not(self)`, `not(teammate on target)` · `E: Heal allAllies, formula "matk * 0.5"` (each kill also mends the party — the cascade sustains you).
* **Passives:**
  * **Yin Renewal** — `T: OnTurnStart` · `C: self` · `E: Heal allAllies, formula "matk * 0.18"`.
* **Abilities:**
  * **Spirit Mend (AP 3, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: Heal target, formula "matk * 1.7 + 15"`.

**Unit 6 — Hex Reaper · Execute Assist + Tempo**
* **Starting Row:** Front.
* **Gear Affix — "Reaping Hooks":** stat mods `atk +40 (flat)`, `critChance +0.12 (flat)`. Custom affix binding — `T: OnDamageDealt` · `C: self`, `statCompare target hpPercent <= 0.25` · `E: ModifyStat self, stat critChance, modType flat, value 0.15, duration 2`.
* **Passives:**
  * **Cull the Weak** *(teammate execute assist)* — `T: OnAbilityCast` · `C: teammate`, `chance 0.4` · `E: DealDamage allEnemies, formula "atk * 0.5", element physical`. Chip-damage on ally casts to nudge multiple enemies simultaneously toward the death threshold, widening the cascade. `allEnemies` also reaches the back row that single-target can't.
* **Abilities:**
  * **Death's Door (AP 3, singleEnemy) — execute:** `T: OnAbilityCast` · `C:` none · `E: DealDamage target, formula "atk * 1.4 + targetMaxHp * 0.20 - targetCurrentHp * 0.20", element dark`. Linear execute (same cancel-at-full, bonus-at-low structure as Party 5) to guarantee the first domino falls.
  * **Soul Beckon (AP 1, singleAlly):** `T: OnAbilityCast` · `C:` none · `E: GrantExtraTurn target`. Give the Harvester an extra turn to fire Open the Lantern the moment the reservoir is deep.

### Breakpoint Verification Checklist
- [x] Cross-unit `teammate` resource funnel: **Soul-Lantern Binder "Grave Pact"** (teammate hits a low enemy → Binder secures the kill), plus **Hex Reaper "Cull the Weak"** (teammate cast → AoE chip). Both manufacture the `OnDeath` events the chain runs on.
- [x] No exponent/branch formulas: executes are linear `atk * 1.4 + targetMaxHp * 0.20 - targetCurrentHp * 0.20`; all others `stat * k (+ c)` or `stat * k + stacksConsumed * k`.
- [x] `stacksConsumed` scoping: read **only** inside **Open the Lantern**, in the `DealDamage` after that binding's own `ConsumeStatus`.
- [x] Chain exits under 25 links: the `OnDeath` → reaping-pulse → `OnDeath` cascade is hard-bounded by the finite living-enemy count (typically ≤ 6) and stops the instant a pulse kills nothing; no `GrantExtraTurn` self-loop (Soul Beckon is a single external grant).

---

## Global Constraint Audit (Parties 5–8)

| Constraint | Status | Notes |
|---|---|---|
| Pure Trigger/Condition/Effect schemas only | ✅ | Every ability, passive, and gear affix is a `T/C/E` binding using only documented triggers, conditions (incl. `not`/`allOf` nesting), and effects. |
| Linear formulas only | ✅ | All formulas are `stat * k (+ c)`, `stat * k + stacksConsumed * k`, or the linear execute `atk * k + targetMaxHp * k - targetCurrentHp * k`. No exponents, `min`/`max`, or ternaries. |
| Explosive scaling from `percentMult` + stacks | ✅ | P5 dual-threshold atk percentMult; P6 fox_fire consume + stacked row-change percentMult; P7 five compounding spokes + harmony consume; P8 permanent matk ratchet per death + soul consume. |
| `stacksConsumed` scoped to its own binding | ✅ | Rupture (P5), Illusory Collapse + Mirror Burst (P6), Taiji Nova (P7), Open the Lantern (P8) — in every case the reading `DealDamage` sits after the `ConsumeStatus` in the same binding. |
| ≥1 `teammate` cross-unit engine per party | ✅ | P5 Feast on Suffering; P6 Mirror Dance; P7 Convergence of Five + Sharpened Cycle; P8 Grave Pact. |
| Chains resolve under 25-link cap | ✅ | P6 reactive bindings never call `SwitchRow` (one OnRowChanged per active); P8 OnDeath cascade bounded by enemy count; no party has a self-`GrantExtraTurn` loop. |

> **Engine caveats flagged (per the brief's honesty rule):**
> 1. **`OnDeath` team-scoping (P8):** these designs assume `not(self)` + `not(teammate on target)` correctly isolates *enemy* deaths. If the builder lacks a clean "enemy died" predicate, this is the one spot to verify in Test Combat first; worst case, the on-death procs also fire on ally deaths (harmless but off-flavor) and would want a dedicated condition on the engine wishlist.
> 2. **No cross-binding `stacksConsumed`:** as in Batch 1, no unit reads another binding's consume count; all consume-scaling stays inside the consuming binding.
> 3. **Deliberate self-damage (P5):** Blood Offering uses `DealDamage target: self` to trigger thresholds on purpose — confirm the engine treats self-inflicted damage as crossing `OnHPThresholdCrossed` (the brief implies any HP drop through 50%/25% fires it).
