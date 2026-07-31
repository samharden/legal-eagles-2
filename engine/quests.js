"use strict";
// ============================== QUEST ENGINE v2 ==============================
// Descended from LE1's QLINE graph, which was the right bet: quests as DATA that
// only listen to events the rest of the game already emits, and grant rewards
// through functions that already exist. LE2 keeps that and changes three things.
//
//   1. A `learn` stage. LE1 could ask you to kill, fetch, talk or arrive. A case
//      asks you to FIND OUT — so the central stage type completes on facts.
//   2. A `resolve` stage. Investigations do not end when a counter fills; they
//      end when you decide what to do. `resolve` parks the quest until something
//      calls qResolve(), and the branch taken is recorded on the quest.
//   3. Stages carry their own `hint`, and the active stage's hint IS the HUD
//      objective — so there is exactly one place that says what to do next.
//
//   stages: talk{npc} · learn{fact|facts[]} · collect{item,n} · reach{region}
//           · use{prop} · resolve{options[]}

const QUESTS = new Map();
export const qstate = {};        // id -> { stage, done, counts:{}, outcome }

export const questHooks = {
  onStart: null,     // (def) => void
  onStage: null,     // (def, stageIdx) => void
  onComplete: null,  // (def, outcome) => void
  onFail: null,      // (def, reason) => void
  knows: () => false,
  // A quest may declare `layer`. THE STREET and THE FLOOR are separate games
  // sharing a registry, so a floor matter must not open while you are walking
  // around in daylight — the host answers whether a quest belongs here.
  layerOk: () => true,
};

export function defineQuests(defs) {
  for (const d of defs) QUESTS.set(d.id, d);
}
export function questDef(id) { return QUESTS.get(id); }
export function allQuests() { return [...QUESTS.values()]; }

const st = id => (qstate[id] ||= { stage: 0, done: false, counts: {}, outcome: null });

export const isActive = id => !!qstate[id] && !qstate[id].done;
export const isDone = id => !!(qstate[id] && qstate[id].done);
export const outcomeOf = id => qstate[id] && qstate[id].outcome;
export const started = id => !!qstate[id];

export function activeQuests() {
  return allQuests().filter(q => isActive(q.id) && questHooks.layerOk(q));
}
export function currentStage(id) {
  const q = QUESTS.get(id), s = qstate[id];
  if (!q || !s || s.done) return null;
  return q.stages[s.stage] || null;
}

export function startQuest(id) {
  const q = QUESTS.get(id);
  if (!q || qstate[id] || !questHooks.layerOk(q)) return false;
  st(id);
  if (questHooks.onStart) questHooks.onStart(q);
  enterStage(q, 0);
  return true;
}

function enterStage(q, i) {
  const stage = q.stages[i];
  if (!stage) return;
  if (stage.onStart) stage.onStart();
  if (questHooks.onStage) questHooks.onStage(q, i);
  // a stage whose condition is ALREADY satisfied must not block — entering the
  // region you are standing in, or learning a fact you already knew, has to
  // advance immediately or the quest deadlocks on arrival
  if (stageSatisfied(q, stage)) advance(q);
}

function stageSatisfied(q, stage) {
  const s = st(q.id);
  switch (stage.type) {
    case 'learn': {
      const ids = stage.facts || [stage.fact];
      return ids.every(f => questHooks.knows(f));
    }
    case 'collect': return (s.counts[stage.item] || 0) >= (stage.n || 1);
    case 'kill': return (s.counts['kill:' + stage.enemy] || 0) >= (stage.n || 1);
    default: return false;   // talk / reach / use / resolve need a real event
  }
}

function advance(q) {
  const s = st(q.id);
  s.stage++;
  if (s.stage >= q.stages.length) return complete(q);
  enterStage(q, s.stage);
}

function complete(q, outcome) {
  const s = st(q.id);
  if (s.done) return;
  s.done = true;
  if (outcome) s.outcome = outcome;
  if (q.onComplete) q.onComplete(s.outcome);
  if (questHooks.onComplete) questHooks.onComplete(q, s.outcome);
}

/**
 * The matter is over and you did not resolve it. This is LE2's real failure
 * state: not a death screen, a case you were supposed to be working while you
 * were somewhere else. Permanent — there is no retry, which is the whole point
 * of a deadline.
 */
export function failQuest(id, reason) {
  const q = QUESTS.get(id), s = qstate[id];
  if (!q || !s || s.done) return false;
  s.done = true;
  s.failed = true;
  s.outcome = 'failed';
  s.reason = reason || 'not resolved in time';
  if (q.onFail) q.onFail(s.reason);
  if (questHooks.onFail) questHooks.onFail(q, s.reason);
  return true;
}
export const isFailed = id => !!(qstate[id] && qstate[id].failed);

/** Every started, unfinished matter — the host checks these against the clock. */
export function openQuests() { return allQuests().filter(q => qstate[q.id] && !qstate[q.id].done); }

/**
 * Feed gameplay in. Types: talk{npc} · learn{fact} · collect{item} ·
 * reach{region} · use{prop} · kill{enemy}
 */
export function questEvent(type, data = {}) {
  for (const q of QUESTS.values()) {
    const s = qstate[q.id];
    if (!s || s.done) continue;
    const stage = q.stages[s.stage];
    if (!stage) continue;

    // Counters accumulate whether or not the current stage wants them, so a
    // player who picks things up early is not punished for being ahead. Kills
    // count the same way: a matter that asks you to put down three Past Selves
    // should not care which one you met first, and it used to, because the
    // counter only incremented when the CURRENT stage already matched.
    if (type === 'collect' && data.item) s.counts[data.item] = (s.counts[data.item] || 0) + 1;
    if (type === 'kill' && data.enemy) s.counts['kill:' + data.enemy] = (s.counts['kill:' + data.enemy] || 0) + 1;

    let hit = false;
    switch (stage.type) {
      case 'talk':    hit = type === 'talk' && data.npc === stage.npc; break;
      case 'reach':   hit = type === 'reach' && data.region === stage.region; break;
      case 'use':     hit = type === 'use' && data.prop === stage.prop; break;
      case 'kill':
      case 'learn':
      case 'collect': hit = stageSatisfied(q, stage); break;
      case 'resolve': hit = false; break;   // only qResolve ends this one
    }
    if (hit) advance(q);
  }
  qTick();
}

/** End a `resolve` stage with a named branch. */
export function qResolve(id, outcome) {
  const q = QUESTS.get(id), s = qstate[id];
  if (!q || !s || s.done) return false;
  const stage = q.stages[s.stage];
  if (!stage || stage.type !== 'resolve') return false;
  s.outcome = outcome;
  if (stage.onResolve) stage.onResolve(outcome);
  advance(q);
  return true;
}

/** Auto-start anything whose prereq has come true. Called every frame. */
export function qTick() {
  for (const q of QUESTS.values()) {
    if (qstate[q.id] || !q.auto || !questHooks.layerOk(q)) continue;
    if (!q.prereq || q.prereq()) startQuest(q.id);
  }
}

/**
 * A stage's hint, as text. Authored as a plain string almost everywhere, but a
 * `learn` stage that counts its facts out loud cannot be a constant — it went
 * on saying "you have found one" to a player holding two, which reads as the
 * quest having failed to notice, and the only way to find out otherwise was to
 * go and find the third one on faith.
 */
export function hintText(stage) {
  if (!stage || !stage.hint) return null;
  return typeof stage.hint === 'function' ? stage.hint() : stage.hint;
}

/** The one-line objective for the HUD — the active stage's own hint. */
export function objective() {
  for (const q of activeQuests()) {
    const text = hintText(currentStage(q.id));
    if (text) return { quest: q, text };
  }
  return null;
}

export function saveQuests() { return JSON.parse(JSON.stringify(qstate)); }
export function loadQuests(o) {
  for (const k in qstate) delete qstate[k];
  Object.assign(qstate, o || {});
}
export function resetQuests() { for (const k in qstate) delete qstate[k]; }
