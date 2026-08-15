# Iron & Jade — Battle Sim

A browser-based turn-based RPG battle simulator and build sandbox. It exists to answer one question fast: **is this combat system actually fun before anyone commits to full production art or code?**

Everything in a fight — abilities, passives, gear affixes, status effects — is built from the same underlying shape: a `Trigger` (when this fires), a list of `Conditions` (only if these are true), and a list of `Effects` (do these things). That's it. There's no separate hardcoded "ability logic" layer, which means new mechanics can be invented entirely by combining existing pieces, without touching any code.

## What you can do here

- Build characters, enemies, gear, abilities, passives, and statuses, all from in-app editors.
- Assemble parties (front row / back row) for both your side and the enemy side.
- Run a fight two ways: **Auto-Simulate** for an instant full result, or **Test Combat**'s interactive mode to play it move-by-move, with a timed replay that steps through triggers/chains as they resolve so you can actually watch a combo happen instead of just reading a log after the fact.
- Read every trigger, condition, effect, and element interaction in one place on the **Reference** tab — open it once the app is running to see exactly what's available and how each piece behaves.

## Why it's built this way

The point isn't just to simulate one hand-authored kit — it's to make the system open-ended enough that *anyone* can sit down, combine a handful of Triggers/Conditions/Effects, and find out whether the resulting build is actually interesting to play. Row positioning, burn-stack-and-consume combos, party-wide auras, ally-reactive passives, crit-triggered chains — none of these are special-cased; they all fall out of the same small vocabulary. If you want to try designing a build, start on the **Reference** tab to see the full toolbox, then jump into the Abilities/Passives builders and Test Combat to see how it plays.

Two docs in this repo go deeper if you want to build content by hand:

- [`how-to-make-abilities-and-passives.md`](./how-to-make-abilities-and-passives.md) — the full parameter reference and worked recipes for the Trigger/Condition/Effect system.
- [`fire-build-abilities-and-passives-todo.md`](./fire-build-abilities-and-passives-todo.md) — a complete worked example: a 6-person "burn stacking and detonation" party build, designed end-to-end using the system to show what a real build looks like.

## Running it

**Easiest:** double-click `Run Battle Sim.bat`. It'll install dependencies on first run and open the app in your browser.

**Manual:**
```
npm install
npm run dev
```
Then open the local URL it prints (usually `http://localhost:5173`).

Other useful scripts: `npm run test` (unit tests), `npm run headless` (runs a hardcoded battle straight from the terminal, useful for sanity-checking the engine without the UI), `npm run build` (production build).
