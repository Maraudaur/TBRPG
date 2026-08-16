import { useEffect, useRef, useState } from 'react';
import type { Ability, Binding, Effect, EffectTarget, PassiveDef, StatBlock, StatModifier, TriggerType } from '../sim/types';
import { STAT_KEYS } from '../sim/types';
import type { BattleUnit, LogEntry, Team } from '../sim/runtime';
import type { EventBus } from '../sim/eventBus';
import type { BattleState } from '../sim/runtime';
import type { StepOutcome } from '../sim/battleLoop';
import {
  BASIC_ATTACK,
  beginInteractiveBattle,
  createBattleState,
  getValidTargets,
  resolvePlayerTurn,
  runBattle,
} from '../sim/battleLoop';
import { MAX_LEVEL } from '../sim/levelSystem';
import {
  abilityStore,
  characterStore,
  enemyStore,
  enemyPartyStore,
  gearStore,
  partyStore,
  passiveStore,
  statusStore,
} from '../storage';

// Column order left-to-right: party back, party front, enemy front, enemy
// back — so the two front rows sit in the middle, facing each other.
function rowOrderFor(team: Team): readonly ('front' | 'back')[] {
  return team === 'player' ? (['back', 'front'] as const) : (['front', 'back'] as const);
}

// Percent-typed stats (0..1) that should render as a percentage rather than
// a raw number; critDamage is a multiplier (1.5 = +50%) so it gets its own
// "x" format instead.
const PERCENT_STATS = new Set<keyof StatBlock>(['critChance', 'accuracy', 'evasion']);

function formatStatNumber(key: keyof StatBlock, value: number): string {
  if (key === 'critDamage') return `x${value.toFixed(2)}`;
  if (PERCENT_STATS.has(key)) return `${Math.round(value * 100)}%`;
  return `${Math.round(value * 10) / 10}`;
}

/** Whether a stat modifier reads as a buff, a debuff, or neutral (cap/floor
 * clamps aren't really "good" or "bad" on their own). */
function modKind(m: StatModifier): 'buff' | 'debuff' | 'neutral' {
  if (m.type === 'cap' || m.type === 'floor') return 'neutral';
  return m.value >= 0 ? 'buff' : 'debuff';
}

function formatModValue(m: StatModifier): string {
  switch (m.type) {
    case 'flat':
      return `${m.value > 0 ? '+' : ''}${m.value}`;
    case 'percentAdd':
    case 'percentMult':
      return `${m.value > 0 ? '+' : ''}${Math.round(m.value * 100)}%`;
    case 'cap':
      return `≤${m.value}`;
    case 'floor':
      return `≥${m.value}`;
  }
}

// Plain-language wording for an EffectTarget, used to render ability
// tooltips (e.g. "Deal fire damage to the target").
function targetLabel(target: EffectTarget): string {
  switch (target) {
    case 'self':
      return 'yourself';
    case 'target':
      return 'the target';
    case 'source':
      return 'the caster';
    case 'allEnemies':
      return 'all enemies';
    case 'allAllies':
      return 'all allies';
  }
}

// Possessive form, so "modify X's stat" / "switch X's row" read naturally
// regardless of which EffectTarget was picked (own the "yourself" -> "your" irregular).
function targetPossessive(target: EffectTarget): string {
  switch (target) {
    case 'self':
      return 'your';
    case 'target':
      return "the target's";
    case 'source':
      return "the caster's";
    case 'allEnemies':
      return "all enemies'";
    case 'allAllies':
      return "all allies'";
  }
}

/** One plain-English line per effect, for the ability tooltip. Mirrors the
 * exact mechanics from how-to-make-abilities-and-passives.md so the tooltip
 * stays accurate as new effect types are added. */
function describeEffect(effect: Effect): string {
  const who = targetLabel(effect.target);
  switch (effect.type) {
    case 'DealDamage':
      return `Deal ${effect.element} damage (${effect.formula}) to ${who}.`;
    case 'ApplyStatus': {
      const stacks = effect.stacks ?? 1;
      const duration = effect.duration ?? 3;
      if (stacks === 0) return `Refresh ${effect.status} on ${who} to ${duration} turn(s) remaining.`;
      return `Apply ${stacks} stack(s) of ${effect.status} to ${who} (${duration} turn(s)).`;
    }
    case 'ConsumeStatus':
      return `Remove ${effect.count === 'all' ? 'all' : effect.count} stack(s) of ${effect.status} from ${who}.`;
    case 'ModifyStat': {
      const mod = formatModValue({ stat: effect.stat, type: effect.modType, value: effect.value, duration: effect.duration });
      const dur = effect.duration !== undefined ? ` for ${effect.duration} turn(s)` : ' (permanent)';
      return `Modify ${targetPossessive(effect.target)} ${effect.stat} by ${mod}${dur}.`;
    }
    case 'Heal':
      return `Heal ${who} (${effect.formula}).`;
    case 'GrantExtraTurn':
      return `Grant ${who} an extra turn.`;
    case 'ModifyAP':
      return `${effect.amount >= 0 ? 'Restore' : 'Drain'} ${Math.abs(effect.amount)} AP ${effect.amount >= 0 ? 'to' : 'from'} ${who}.`;
    case 'SwitchRow':
      return effect.row ? `Move ${who} to the ${effect.row} row.` : `Switch ${targetPossessive(effect.target)} row.`;
  }
}

/** Tooltip body for an ability: description (if authored) plus a plain-
 * English readout of what its own cast binding actually does — so the
 * tooltip stays accurate even for abilities nobody bothered to write a
 * description for. */
function describeAbility(ability: Ability): { lines: string[]; hasConditions: boolean } {
  const castBindings = ability.bindings.filter((b) => b.trigger === 'OnAbilityCast');
  const lines = castBindings.flatMap((b) => b.effects.map(describeEffect));
  const hasConditions = castBindings.some((b) => b.conditions.length > 0);
  return { lines, hasConditions };
}

// Plain-language "when this fires" wording per trigger, used to describe a
// passive's bindings in the unit detail panel (a passive can carry any
// trigger type, unlike an ability's OnAbilityCast-only bindings above).
const TRIGGER_LABELS: Record<TriggerType, string> = {
  OnBattleStart: 'When the battle starts',
  OnTurnStart: 'At the start of its turn',
  OnAbilityCast: 'When an ability is cast',
  OnDamageDealt: 'When it deals damage',
  OnDamageTaken: 'When it takes damage',
  OnStatusApplied: 'When a status is applied',
  OnStatusExpired: 'When a status expires',
  OnHPThresholdCrossed: 'When an HP threshold is crossed',
  OnDeath: 'When a unit dies',
  OnRowChanged: 'When a row changes',
};

/** One plain-English line per binding on a passive, e.g. "When it deals
 * damage: Deal fire damage (matk * 0.6) to the target. (conditions apply)" */
function describePassiveBinding(binding: Binding): string {
  const effectText = binding.effects.map(describeEffect).join(' ');
  const note = binding.conditions.length > 0 ? ' (conditions apply)' : '';
  return `${TRIGGER_LABELS[binding.trigger]}: ${effectText}${note}`;
}

// ---------------------------------------------------------------------------
// Action replay — the full Combat Log fills in immediately and completely
// (unchanged, see below), but the battlefield itself steps through the same
// log entries one at a time on a timer so chains/triggers are easy to watch
// happen rather than jumping straight to the end state. This never touches
// simulation logic: `units`/`logEntries` are always set to the true final
// state right away, and the replay is a purely cosmetic snapshot that starts
// at the pre-action state and catches up to that same true state one log
// entry at a time (or instantly, via Skip).
// ---------------------------------------------------------------------------

const REPLAY_STEP_MS = 500;
// The Live Log only ever shows the most recent few lines — the full Combat
// Log below already has the complete record, so this stays short and wide
// instead of turning into a second scrollable log.
const LIVE_LOG_LIMIT = 3;

/** Applies one log entry's recorded delta (see the `kind` tags added in
 * resolver.ts, plus the `apCostPaid` tag battleLoop.ts's castAbility() adds)
 * onto a replay snapshot. Only HP/AP/alive/row are animated — everything
 * else (statuses, stat-modifier chips) simply catches up to the true final
 * state once the replay finishes, so this never has to duplicate the
 * resolver's actual stacking/expiry rules. */
function applyReplayDelta(snapshot: BattleUnit[], entry: LogEntry): BattleUnit[] {
  const data = (entry.data ?? {}) as Record<string, unknown>;
  const sourceId = typeof data.source === 'string' ? data.source : undefined;
  const targetId = typeof data.target === 'string' ? data.target : undefined;
  const apCostPaid = typeof data.apCostPaid === 'number' ? data.apCostPaid : 0;

  return snapshot.map((u) => {
    let next = u;
    // The ability-cast log entry pays AP from the CASTER (source), which is
    // a distinct unit from `target` (the ability's target) on that same entry.
    if (apCostPaid > 0 && u.id === sourceId) {
      next = { ...next, currentAp: Math.max(0, next.currentAp - apCostPaid) };
    }
    if (u.id === targetId) {
      switch (data.kind) {
        case 'damage':
          next = { ...next, currentHp: Math.max(0, next.currentHp - ((data.damage as number) ?? 0)) };
          break;
        case 'heal':
          next = { ...next, currentHp: Math.min(next.currentStats.maxHp, next.currentHp + ((data.amount as number) ?? 0)) };
          break;
        case 'apChange':
          next = {
            ...next,
            currentAp: Math.max(0, Math.min(next.currentStats.maxAp, next.currentAp + ((data.amount as number) ?? 0))),
          };
          break;
        case 'death':
          next = { ...next, alive: false, currentHp: 0 };
          break;
        case 'rowChange':
          next = { ...next, row: (data.row as 'front' | 'back') ?? next.row };
          break;
      }
    }
    return next;
  });
}

type FloaterTone = 'damage' | 'crit' | 'heal' | 'ap' | 'status';

interface FloaterSpec {
  unitId: string;
  text: string;
  tone: FloaterTone;
}

interface Floater extends FloaterSpec {
  id: number;
}

/** Turns one replay log entry into zero or more floating-text pops (damage
 * numbers, +AP, status stack changes) — read from the exact same `data`
 * payload applyReplayDelta already uses, so the numbers on screen always
 * match what actually happened. A single entry can spawn two floaters (e.g.
 * an ability-cast entry pays AP from the caster while also, via a later
 * entry, dealing damage to the target) since `source` and `target` are
 * different units. */
function floatersForEntry(entry: LogEntry): FloaterSpec[] {
  const data = (entry.data ?? {}) as Record<string, unknown>;
  const sourceId = typeof data.source === 'string' ? data.source : undefined;
  const targetId = typeof data.target === 'string' ? data.target : undefined;
  const apCostPaid = typeof data.apCostPaid === 'number' ? data.apCostPaid : 0;
  const out: FloaterSpec[] = [];

  if (apCostPaid > 0 && sourceId) {
    out.push({ unitId: sourceId, text: `-${apCostPaid} AP`, tone: 'ap' });
  }

  if (targetId) {
    switch (data.kind) {
      case 'damage': {
        const dmg = (data.damage as number) ?? 0;
        const isCrit = data.isCrit === true;
        out.push({ unitId: targetId, text: isCrit ? `-${dmg} CRIT` : `-${dmg}`, tone: isCrit ? 'crit' : 'damage' });
        break;
      }
      case 'heal': {
        const amount = (data.amount as number) ?? 0;
        if (amount > 0) out.push({ unitId: targetId, text: `+${amount}`, tone: 'heal' });
        break;
      }
      case 'apChange': {
        const amount = (data.amount as number) ?? 0;
        if (amount !== 0) out.push({ unitId: targetId, text: `${amount > 0 ? '+' : ''}${amount} AP`, tone: 'ap' });
        break;
      }
      case 'statusApplied': {
        const stacks = (data.stacks as number) ?? 1;
        const status = (data.status as string) ?? 'status';
        out.push({ unitId: targetId, text: `+${stacks} ${status}`, tone: 'status' });
        break;
      }
      case 'statusExpired':
      case 'statusReduced': {
        const stacks = (data.stacks as number) ?? 0;
        const status = (data.status as string) ?? 'status';
        if (stacks > 0) out.push({ unitId: targetId, text: `-${stacks} ${status}`, tone: 'status' });
        break;
      }
    }
  }

  return out;
}

export function CombatTestScreen() {
  const parties = partyStore.list();
  const enemyParties = enemyPartyStore.list();

  const [partyId, setPartyId] = useState<string>(parties[0]?.id ?? '');
  const [enemyPartyId, setEnemyPartyId] = useState<string>(enemyParties[0]?.id ?? '');
  // Blank = use each character/enemy's own saved level. Set to re-run the
  // same roster at an arbitrary level for endgame/power-curve testing
  // without editing every character or enemy definition.
  const [playerLevelOverride, setPlayerLevelOverride] = useState<string>('');
  const [enemyLevelOverride, setEnemyLevelOverride] = useState<string>('');
  const [initialOrder, setInitialOrder] = useState<{ name: string; team: string; speed: number }[]>([]);

  // Interactive-battle state. The live BattleState/EventBus are mutable and
  // live in a ref (mutated in place by the resolver); logEntries/units/outcome
  // are snapshotted into React state after every action so the UI re-renders.
  const battleRef = useRef<{ battle: BattleState; bus: EventBus } | null>(null);
  const [outcome, setOutcome] = useState<StepOutcome | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [winnerInfo, setWinnerInfo] = useState<{ winner: Team | 'draw'; turns: number } | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // Replay playback state — see applyReplayDelta above. `replayUnits` is a
  // cosmetic snapshot rendered on the battlefield in place of `units` while
  // a replay is in progress; `units` itself is always the true final state.
  const [replayUnits, setReplayUnits] = useState<BattleUnit[] | null>(null);
  const [replayActive, setReplayActive] = useState<{ source?: string; target?: string }>({});
  const [isReplaying, setIsReplaying] = useState(false);
  // Entries revealed so far for the CURRENT (or most recently finished)
  // replay batch only — a small "what's happening right now" companion to
  // the full Combat Log below, which always shows everything at once.
  const [liveLogLines, setLiveLogLines] = useState<LogEntry[]>([]);
  // Floating damage/heal/AP/status-stack numbers popping over unit cards in
  // sync with each replay step. Each gets a unique id so several can be on
  // screen at once (e.g. an AoE step still only spawns one per unit here,
  // but two different steps landing close together can overlap briefly);
  // a floater removes itself from this array when its CSS animation ends.
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterIdRef = useRef(0);
  // Which unit's HP/AP bars are currently mid-shake from taking a hit —
  // self-clears via onAnimationEnd once the CSS shake finishes.
  const [shakeUnitId, setShakeUnitId] = useState<string | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayQueueRef = useRef<{ entries: LogEntry[]; index: number }>({ entries: [], index: 0 });

  useEffect(() => {
    // Clear any in-flight replay timer on unmount so it can't setState after
    // the component is gone.
    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, []);

  function finishReplay() {
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    replayQueueRef.current = { entries: [], index: 0 };
    setReplayUnits(null);
    setReplayActive({});
    setIsReplaying(false);
    setFloaters([]);
    setShakeUnitId(null);
  }

  function removeFloater(id: number) {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  }

  function stepReplay() {
    const { entries, index } = replayQueueRef.current;
    if (index >= entries.length) {
      finishReplay();
      return;
    }
    const entry = entries[index];
    const data = (entry.data ?? {}) as Record<string, unknown>;
    setReplayUnits((prev) => (prev ? applyReplayDelta(prev, entry) : prev));
    setReplayActive({
      source: typeof data.source === 'string' ? data.source : undefined,
      target: typeof data.target === 'string' ? data.target : undefined,
    });
    setLiveLogLines((prev) => [...prev, entry].slice(-LIVE_LOG_LIMIT));
    const spawned = floatersForEntry(entry);
    if (spawned.length > 0) {
      setFloaters((prev) => [...prev, ...spawned.map((f) => ({ ...f, id: ++floaterIdRef.current }))]);
    }
    if (data.kind === 'damage' && typeof data.target === 'string') {
      setShakeUnitId(data.target);
    }
    replayQueueRef.current = { entries, index: index + 1 };
    replayTimerRef.current = setTimeout(stepReplay, REPLAY_STEP_MS);
  }

  function startReplay(newEntries: LogEntry[], preUnits: BattleUnit[]) {
    if (newEntries.length === 0) return;
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    replayQueueRef.current = { entries: newEntries, index: 0 };
    setReplayUnits(preUnits);
    setReplayActive({});
    setLiveLogLines([]);
    setIsReplaying(true);
    replayTimerRef.current = setTimeout(stepReplay, REPLAY_STEP_MS);
  }

  function skipReplay() {
    // `units` is already the true final state (set immediately in
    // applyOutcome) — skipping just tears down the cosmetic overlay early,
    // but the live log should still catch up to show everything that batch
    // contained, matching the full log below.
    setLiveLogLines(replayQueueRef.current.entries.slice(-LIVE_LOG_LIMIT));
    finishReplay();
  }

  function buildSetup() {
    const party = partyStore.get(partyId);
    const enemyParty = enemyPartyStore.get(enemyPartyId);
    const gearLookup = Object.fromEntries(gearStore.list().map((g) => [g.id, g]));
    const abilityLookup = Object.fromEntries(abilityStore.list().map((a) => [a.id, a]));
    const passiveLookup = Object.fromEntries(passiveStore.list().map((p) => [p.id, p]));
    const statusDefs = Object.fromEntries(statusStore.list().map((s) => [s.id, s]));

    const parseLevel = (raw: string): number | undefined => {
      if (raw.trim() === '') return undefined;
      const n = Math.round(Number(raw));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const playerLevel = parseLevel(playerLevelOverride);
    const enemyLevel = parseLevel(enemyLevelOverride);

    const player = (party?.slots ?? [])
      .filter((s) => s.characterId)
      .map((s) => ({ def: characterStore.get(s.characterId!)!, row: s.row, levelOverride: playerLevel }))
      .filter((p) => p.def);

    const enemyParticipants = (enemyParty?.slots ?? [])
      .filter((s) => s.enemyId)
      .map((s) => ({ def: enemyStore.get(s.enemyId!)!, row: s.row, levelOverride: enemyLevel }))
      .filter((e) => e.def);

    return { player, enemies: enemyParticipants, gearLookup, abilityLookup, passiveLookup, statusDefs, maxTurns: 200 };
  }

  function setupValid(setup: ReturnType<typeof buildSetup>) {
    return setup.player.length > 0 && setup.enemies.length > 0;
  }

  function resetBattleUi() {
    battleRef.current = null;
    setOutcome(null);
    setSelectedAbility(null);
    finishReplay();
    setLiveLogLines([]);
  }

  function preview() {
    const setup = buildSetup();
    if (!setupValid(setup)) {
      setInitialOrder([]);
      return;
    }
    const { battle } = createBattleState(setup);
    const order = [...battle.units]
      .sort((a, b) => b.currentStats.speed - a.currentStats.speed)
      .map((u) => ({ name: u.name, team: u.team, speed: u.currentStats.speed }));
    setInitialOrder(order);
  }

  function runAuto() {
    const setup = buildSetup();
    if (!setupValid(setup)) {
      alert('Select a party with at least one member and at least one enemy.');
      return;
    }
    preview();
    resetBattleUi();
    setSelectedUnitId(null);
    const result = runBattle(setup);
    setLogEntries(result.log);
    setUnits(result.units);
    setWinnerInfo({ winner: result.winner, turns: result.turns });
  }

  function startInteractive() {
    const setup = buildSetup();
    if (!setupValid(setup)) {
      alert('Select a party with at least one member and at least one enemy.');
      return;
    }
    preview();
    setSelectedUnitId(null);
    finishReplay();
    setLiveLogLines([]);
    const { battle, bus, outcome: initialOutcome } = beginInteractiveBattle(setup);
    battleRef.current = { battle, bus };
    setOutcome(initialOutcome);
    setSelectedAbility(null);
    setLogEntries([...battle.log]);
    setUnits([...battle.units]);
    setWinnerInfo(
      initialOutcome.status === 'finished' ? { winner: initialOutcome.winner, turns: battle.turn } : null,
    );
  }

  function applyOutcome(next: StepOutcome, preLogLength: number, preUnits: BattleUnit[]) {
    const ctx = battleRef.current;
    if (!ctx) return;
    setOutcome(next);
    setSelectedAbility(null);
    // Full log fills in immediately and completely — it's the permanent,
    // complete record, kept separate from the timed battlefield replay below.
    setLogEntries([...ctx.battle.log]);
    setUnits([...ctx.battle.units]);
    if (next.status === 'finished') {
      setWinnerInfo({ winner: next.winner, turns: ctx.battle.turn });
    }
    startReplay(ctx.battle.log.slice(preLogLength), preUnits);
  }

  function pickAbility(ability: Ability) {
    const ctx = battleRef.current;
    if (!ctx || !outcome || outcome.status !== 'awaitingPlayer' || isReplaying) return;
    const acting = outcome.unit;
    if (ability.apCost > acting.currentAp) return;

    const targets = getValidTargets(acting, ability, ctx.battle);
    if (targets.length === 0) {
      // self / allAllies / allEnemies abilities don't need a target pick
      const preLogLength = ctx.battle.log.length;
      const preUnits = ctx.battle.units.map((u) => ({ ...u }));
      const next = resolvePlayerTurn(ctx.battle, ctx.bus, acting, ability, undefined);
      applyOutcome(next, preLogLength, preUnits);
    } else {
      setSelectedAbility(ability);
    }
  }

  function pickTarget(target: BattleUnit) {
    const ctx = battleRef.current;
    if (!ctx || !outcome || outcome.status !== 'awaitingPlayer' || !selectedAbility || isReplaying) return;
    const preLogLength = ctx.battle.log.length;
    const preUnits = ctx.battle.units.map((u) => ({ ...u }));
    const next = resolvePlayerTurn(ctx.battle, ctx.bus, outcome.unit, selectedAbility, target.id);
    applyOutcome(next, preLogLength, preUnits);
  }

  const awaitingUnit = outcome?.status === 'awaitingPlayer' ? outcome.unit : null;
  const targetChoices =
    awaitingUnit && selectedAbility ? getValidTargets(awaitingUnit, selectedAbility, battleRef.current!.battle) : [];
  const selectedUnit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) : undefined;
  // A BattleUnit only carries aggregated reactive *bindings*, not which named
  // passives they came from — look the unit's definition back up (character
  // or enemy, depending on team) to get its `passives: string[]` and resolve
  // each one to its full PassiveDef for display.
  const selectedUnitPassives: PassiveDef[] = selectedUnit
    ? (() => {
        const def = selectedUnit.team === 'player' ? characterStore.get(selectedUnit.defId) : enemyStore.get(selectedUnit.defId);
        return (def?.passives ?? [])
          .map((id) => passiveStore.get(id))
          .filter((p): p is PassiveDef => p !== undefined);
      })()
    : [];
  // While a replay is playing, the battlefield shows the animated snapshot
  // instead of the true (already-final) state; everything else (target
  // validity, the stat detail panel, etc.) always reads the true `units`.
  const displayUnits = replayUnits ?? units;

  return (
    <div className="combat-screen">
      <div className="combat-setup">
        <h3>Test Combat</h3>
        <label>
          Player Party
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">(select a party)</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Enemy Party
          <select value={enemyPartyId} onChange={(e) => setEnemyPartyId(e.target.value)}>
            <option value="">(select an enemy party)</option>
            {enemyParties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {enemyParties.length === 0 && (
          <p className="hint">No enemy parties saved yet — build one on the Enemy Parties tab.</p>
        )}

        <fieldset>
          <legend>level override (blank = each unit's own level)</legend>
          <div className="editor-fields">
            <label>
              player party
              <input
                type="number"
                min={1}
                max={MAX_LEVEL}
                placeholder="—"
                value={playerLevelOverride}
                onChange={(e) => setPlayerLevelOverride(e.target.value)}
              />
            </label>
            <label>
              enemy party
              <input
                type="number"
                min={1}
                max={MAX_LEVEL}
                placeholder="—"
                value={enemyLevelOverride}
                onChange={(e) => setEnemyLevelOverride(e.target.value)}
              />
            </label>
          </div>
          <p className="hint">Re-run the same roster at any level (1–{MAX_LEVEL}) to test an endgame power curve, without editing every character/enemy.</p>
        </fieldset>

        <div className="combat-buttons">
          <button type="button" onClick={preview}>
            Preview Turn Order
          </button>
        </div>
        <div className="combat-buttons">
          <button type="button" className="btn-save" onClick={startInteractive}>
            Play Battle
          </button>
          <button type="button" onClick={runAuto}>
            Auto-Simulate
          </button>
        </div>

        {initialOrder.length > 0 && (
          <div className="turn-order">
            <h4>Initial turn order (by speed)</h4>
            <ol>
              {initialOrder.map((u, i) => (
                <li key={i} className={u.team}>
                  {u.name} ({u.team}) — spd {u.speed}
                </li>
              ))}
            </ol>
          </div>
        )}

        {winnerInfo && (
          <div className={`winner-banner winner-${winnerInfo.winner}`}>
            Winner: {winnerInfo.winner} — {winnerInfo.turns} turns
          </div>
        )}
      </div>

      <div className="combat-play-area">
        {units.length > 0 && (
          <div className="battle-roster">
            <h3>Battlefield</h3>
            <div className="roster-teams">
              {(['player', 'enemy'] as const).map((team) => (
                <div key={team} className={`roster-team roster-${team}`}>
                  <div className="roster-team-label">{team === 'player' ? 'Party' : 'Enemies'}</div>
                  <div className="roster-rows">
                    {rowOrderFor(team).map((row) => (
                      <div key={row} className="roster-row-col">
                        <div className="roster-row-label">{row}</div>
                        {displayUnits
                          .filter((u) => u.team === team && u.row === row)
                          .map((u) => {
                            const hpPct = Math.max(0, Math.round((u.currentHp / u.currentStats.maxHp) * 100));
                            const apPct = Math.max(0, Math.round((u.currentAp / u.currentStats.maxAp) * 100));
                            const isActing = awaitingUnit?.id === u.id;
                            const isTargetable = !isReplaying && targetChoices.some((t) => t.id === u.id);
                            const isReplaySource = replayActive.source === u.id;
                            const isReplayTarget = replayActive.target === u.id;
                            const buffMods = u.statModifiers.filter((m) => m.duration !== undefined);
                            const unitFloaters = floaters.filter((f) => f.unitId === u.id);
                            const isShaking = shakeUnitId === u.id;
                            return (
                              <div
                                key={u.id}
                                className={`unit-card ${u.alive ? '' : 'unit-dead'} ${isActing ? 'unit-acting' : ''} ${isTargetable ? 'unit-targetable' : ''} ${isReplaySource ? 'unit-replay-source' : ''} ${isReplayTarget ? 'unit-replay-target' : ''}`}
                                onClick={() => isTargetable && pickTarget(u)}
                              >
                                {unitFloaters.length > 0 && (
                                  <div className="floater-stack">
                                    {unitFloaters.map((f) => (
                                      <span
                                        key={f.id}
                                        className={`floater floater-${f.tone}`}
                                        onAnimationEnd={() => removeFloater(f.id)}
                                      >
                                        {f.text}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="unit-card-name">
                                  <span
                                    className="unit-name-link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUnitId(u.id);
                                    }}
                                  >
                                    {u.name}
                                  </span>
                                </div>
                                <div
                                  className={`bar bar-hp ${isShaking ? 'bar-shake' : ''}`}
                                  onAnimationEnd={() => setShakeUnitId((prev) => (prev === u.id ? null : prev))}
                                >
                                  <div className="bar-fill" style={{ width: `${hpPct}%` }} />
                                  <span className="bar-label">
                                    HP {u.currentHp}/{u.currentStats.maxHp}
                                  </span>
                                </div>
                                <div className={`bar bar-ap ${isShaking ? 'bar-shake' : ''}`}>
                                  <div className="bar-fill" style={{ width: `${apPct}%` }} />
                                  <span className="bar-label">
                                    AP {u.currentAp}/{u.currentStats.maxAp}
                                  </span>
                                </div>
                                {(u.statuses.length > 0 || buffMods.length > 0) && (
                                  <div className="unit-statuses">
                                    {u.statuses.map((s, i) => (
                                      <span key={`s-${i}`} className="status-chip" title={`${s.duration} turn(s) left`}>
                                        {s.statusId} x{s.stacks}
                                      </span>
                                    ))}
                                    {buffMods.map((m, i) => (
                                      <span
                                        key={`m-${i}`}
                                        className={`stat-chip stat-chip-${modKind(m)}`}
                                        title={`${m.source ?? 'unknown source'} — ${m.duration} turn(s) left`}
                                      >
                                        {m.stat} {formatModValue(m)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isReplaying && (
              <div className="replay-banner">
                <span>
                  <span className="replay-banner-dot" />
                  Resolving…
                </span>
                <button type="button" onClick={skipReplay}>
                  Skip
                </button>
              </div>
            )}

            {(awaitingUnit || outcome?.status === 'finished') && (
              <div className="action-row">
                <div className="action-bar-col">
                  {awaitingUnit && (
                    <div className="action-bar">
                      <h4>{awaitingUnit.name}'s turn — choose an action</h4>
                      <div className="ability-choices">
                        {[...awaitingUnit.abilities, BASIC_ATTACK].map((ability) => {
                          const affordable = ability.apCost <= awaitingUnit.currentAp;
                          const { lines, hasConditions } = describeAbility(ability);
                          return (
                            <div key={ability.id} className="ability-btn-wrapper">
                              <button
                                type="button"
                                disabled={!affordable || isReplaying}
                                className={`ability-btn ${selectedAbility?.id === ability.id ? 'ability-btn-selected' : ''}`}
                                onClick={() => pickAbility(ability)}
                              >
                                {ability.name} <span className="ap-cost">{ability.apCost} AP</span>
                              </button>
                              <div className="ability-tooltip">
                                <div className="ability-tooltip-header">
                                  <strong>{ability.name}</strong>
                                  <span className="ability-tooltip-meta">
                                    {ability.element} · {ability.targetType} · {ability.apCost} AP
                                  </span>
                                </div>
                                {ability.description && <p className="ability-tooltip-desc">{ability.description}</p>}
                                {lines.length > 0 && (
                                  <ul className="ability-tooltip-effects">
                                    {lines.map((line, i) => (
                                      <li key={i}>{line}</li>
                                    ))}
                                  </ul>
                                )}
                                {hasConditions && <p className="ability-tooltip-note">Only takes effect if its conditions are met.</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selectedAbility && targetChoices.length > 0 && (
                        <div className="hint">Click a highlighted unit above to target it with {selectedAbility.name}.</div>
                      )}
                    </div>
                  )}

                  {!awaitingUnit && outcome?.status === 'finished' && (
                    <div className="hint">Battle over — start a new one above to play again.</div>
                  )}
                </div>

                <div className="live-log-panel">
                  <h4>Live Log</h4>
                  <div className="live-log-scroll">
                    {liveLogLines.length === 0 && (
                      <div className="hint">Play a move to watch what triggers, in order, right here.</div>
                    )}
                    {liveLogLines.map((entry, i) => (
                      <div key={i} className="log-entry">
                        {entry.eventType && <span className="log-type">[{entry.eventType}]</span>}
                        <span className="log-message">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="combat-log">
          <h3>Combat Log</h3>
          <div className="log-scroll">
            {logEntries.map((entry, i) => (
              <div key={i} className="log-entry">
                <span className="log-turn">T{entry.turn}</span>
                {entry.eventType && <span className="log-type">[{entry.eventType}]</span>}
                <span className="log-message">{entry.message}</span>
              </div>
            ))}
            {logEntries.length === 0 && <div className="hint">Play or simulate a battle to see the verbose log here.</div>}
          </div>
        </div>
      </div>

      {selectedUnit && (
        <div className="unit-detail-backdrop" onClick={() => setSelectedUnitId(null)}>
          <div className="unit-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="unit-detail-header">
              <h3>{selectedUnit.name}</h3>
              <button type="button" className="btn-remove" onClick={() => setSelectedUnitId(null)}>
                close
              </button>
            </div>
            <div className="hint">
              {selectedUnit.team} · {selectedUnit.row} row · level {selectedUnit.level} · {selectedUnit.alive ? 'alive' : 'dead'}
            </div>

            <table className="unit-stat-table">
              <thead>
                <tr>
                  <th>stat</th>
                  <th>base</th>
                  <th>current</th>
                </tr>
              </thead>
              <tbody>
                {STAT_KEYS.map((key) => {
                  const base = selectedUnit.baseStats[key];
                  const current = selectedUnit.currentStats[key];
                  const diff = current - base;
                  const cls = diff > 0.001 ? 'stat-up' : diff < -0.001 ? 'stat-down' : '';
                  return (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{formatStatNumber(key, base)}</td>
                      <td className={cls}>{formatStatNumber(key, current)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h4>Active modifiers</h4>
            {selectedUnit.statModifiers.length === 0 ? (
              <div className="hint">none</div>
            ) : (
              <ul className="unit-detail-list">
                {selectedUnit.statModifiers.map((m, i) => (
                  <li key={i} className={`mod-${modKind(m)}`}>
                    <strong>{m.stat}</strong> {m.type} {formatModValue(m)} — {m.source ?? 'unknown source'}
                    {m.duration !== undefined ? ` (${m.duration} turn(s) left)` : ' (permanent)'}
                  </li>
                ))}
              </ul>
            )}

            <h4>Statuses</h4>
            {selectedUnit.statuses.length === 0 ? (
              <div className="hint">none</div>
            ) : (
              <ul className="unit-detail-list">
                {selectedUnit.statuses.map((s, i) => (
                  <li key={i}>
                    {s.statusId} × {s.stacks} — {s.duration} turn(s) left
                  </li>
                ))}
              </ul>
            )}

            <h4>Passives</h4>
            {selectedUnitPassives.length === 0 ? (
              <div className="hint">none</div>
            ) : (
              <div className="unit-detail-passives">
                {selectedUnitPassives.map((p) => (
                  <div key={p.id} className="unit-detail-passive">
                    <div className="unit-detail-passive-name">{p.name}</div>
                    {p.description && <p className="unit-detail-passive-desc">{p.description}</p>}
                    <ul className="unit-detail-passive-effects">
                      {p.bindings.map((b, i) => (
                        <li key={b.id ?? i}>{describePassiveBinding(b)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
