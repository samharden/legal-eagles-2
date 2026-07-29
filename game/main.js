"use strict";
// ============================== MAIN ==============================
// Boot, state machine, the play loop. Phase 0 scope: the opening fork, a player
// who can walk a seamless two-region city, interact, take things, hit things,
// and have all of that survive the region being evicted and rebuilt.

import { ctx, cam, camFollow, view, setZoom, cycleZoom, toggleFullscreen, TILE, W, H, C, IS_TOUCH, DEV } from '../engine/stage.js';
import { SPR, drawSprite } from '../engine/sprites.js';
import { Rig, FX } from '../engine/anim.js';
import { audioInit, musicTick, toggleMute, SFX } from '../engine/audio.js';
import * as Input from '../engine/input.js';
import { World, moveEntity } from '../engine/region.js';
import { saveGame, loadGame, hasSave } from '../engine/save.js';
import * as Facts from '../engine/facts.js';
import * as Quests from '../engine/quests.js';
import { Cal, clockHooks, dateString, schedule, unschedule, allEntries, advanceDay, saveClock, loadClock, resetClock } from '../engine/clock.js';
import * as Practice from '../engine/practice.js';
import { Hours, hoursHooks, bill, lightUp, lightFree, isLit, writeDown, fmtHours, pressure, saveHours, loadHours, resetHours } from '../engine/hours.js';
import { Dialogue } from '../engine/dialogue.js';
import { REGIONS, SPAWN } from './city.js';
import { LAYERS, layerOf } from './layers.js';
import { actorDef } from './actors.js';
import { drawWorld, drawPrompt } from './render.js';
import { Intro } from './intro.js';
import { npcDialogue, CASE_HOOKS } from './cases.js';
import { Casefile } from './casefile.js';

/* -------------------------------- state -------------------------------- */
export const G = {
  state: 'menu',        // menu | intro | play | dialog
  path: null,           // 'send' | 'delete'
  layer: 'street',
  world: null,
  player: null,
  fx: null,
  t: 0,
  msg: { text: '', t: 0 },
  banner: { text: '', sub: '', t: 0 },
  carried: [],
  prompt: null,
  complaint: null,      // the Bar Complaint, once you have earned one
  ally: null,           // the paralegal, if she is on the payroll
  dark: false,          // standing on an unlit floor
  shots: [],            // paper in the air
  served: 0,            // stacking, and it does not come off until you sleep
};

// what you tell yourself in an unlit corridor
const DARK_BARKS = [
  'it is very quiet',
  'you are counting your own steps',
  'something ahead is billing',
  'the carpet changed and you did not see it change',
  'this is the same corridor',
];

const SPEED = 205, DASH_SPD = 880, DASH_T = 0.16, DASH_CD = 1.1;

function makePlayer(x, y) {
  return {
    x, y, spr: 'p_f', face: { x: 0, y: 1 }, r: 14,
    hp: 100, maxhp: 100, moving: false,
    dashT: 0, dashCd: 0, meleeCd: 0, hurtCd: 0,
    rig: new Rig(),
  };
}

/* ------------------------- case / quest plumbing ------------------------ */
// The engine never imports game code; it calls out through these.
Quests.questHooks.knows = id => Facts.knows(id);
Quests.questHooks.layerOk = q => !q.layer || q.layer === G.layer;
Quests.questHooks.onComplete = q => {
  SFX.send();
  if (q.due) unschedule(q.id);   // a closed matter is off the docket
  // Closing a matter on THE FLOOR is the biggest single entry on the timesheet.
  // It is also the only way to bank enough to light anything substantial, which
  // is how the layer makes you WANT to do the building's work.
  if (HAS_HOURS()) bill(BILL_MATTER, `${fmtHours(BILL_MATTER)} — ${q.name}: matter concluded`);
  refreshCasefile(); syncHud();
};
// the objective line must follow the stage the moment it changes, including
// mid-conversation — otherwise the HUD tells you to do the thing you just did
Quests.questHooks.onStage = () => { refreshCasefile(); syncHud(); };

// Learning a fact is a gameplay event like any other: it can complete a stage.
Facts.onLearn.push((id, def) => {
  G.fx.bark(G.player.x, G.player.y - 40, 'NOTED', C.cyan, 1.8);
  say('NOTED — ' + def.text, 7);
  SFX.pick();
  if (HAS_HOURS()) bill(BILL_FACT, `${fmtHours(BILL_FACT)} — review and analysis`);
  Quests.questEvent('learn', { fact: id });
  refreshCasefile();
});

// A matter with a `due` gets a real docket entry the moment it opens.
Quests.questHooks.onStart = q => {
  showBanner('NEW MATTER', q.name);
  say(q.blurb, 7);
  SFX.district();
  if (q.due && HAS_CLOCK()) {
    const day = Cal.day + q.due;
    // `once: false` on purpose. A rent day fires and is spent, but a deadline
    // has to STAY on the docket after its date so endDay() can still see it and
    // so the Casefile can show it in red. It is removed only when the matter
    // closes or fails. Making it `once` silently made deadlines unmissable.
    schedule({ day, once: false, kind: 'deadline', ref: q.id, label: q.dueLabel || (q.name + ' — due') });
    say(`${q.name}. Due ${dateString(day)}.`, 7);
  }
};
Quests.questHooks.onFail = q => {
  SFX.del(); G.fx.addTrauma(0.6);
  unschedule(q.id);
  refreshCasefile(); syncHud();
};

CASE_HOOKS.layer = () => G.layer;
CASE_HOOKS.say = (t, d) => say(t, d);
CASE_HOOKS.banner = (a, b) => showBanner(a, b);
CASE_HOOKS.fee = (n, memo) => {
  if (!n) return;
  Practice.fee(n, memo, Cal.day);
  say(`Fee received: $${n}. ${memo}`, 5);
  syncHud();
};
CASE_HOOKS.retainer = (n, memo) => {
  Practice.retainer(n, memo, Cal.day);
  say(`$${n} into TRUST. It is not yours until you have earned it.`, 7);
  syncHud();
};
CASE_HOOKS.earn = (n, memo) => {
  const got = Practice.earn(n, memo, Cal.day);
  if (got) say(`$${got} earned and moved from trust to operating. That one is yours.`, 6);
  syncHud();
};
CASE_HOOKS.rep = (d, n) => {
  if (!n) return;
  Practice.bumpRep(d, n);
  say(`Word gets around ${districtName(d)}.`, 3);
};

/** The city is the one place district names live. Nothing else spells them. */
export function districtName(id) {
  const r = REGIONS.find(x => x.id === id);
  return r ? r.name : id;
}

function refreshCasefile() { if (Casefile.open) Casefile.render(G.layer); }

/* ================================ THE DOCKET ============================= */
// THE FLOOR has no clock — its calendar reads the same date forever, so the
// whole survival layer is Path A's alone. This is the one predicate that says so.
const HAS_CLOCK = () => G.layer === 'street';

/* ================================ THE HOURS ============================== */
// ...and its mirror. THE FLOOR has no money and no dates; it has the lights,
// and what the lights cost. Both predicates are deliberately one line each,
// because "which systems does this layer have" is a question the rest of the
// file should never have to answer for itself.
const HAS_HOURS = () => G.layer === 'floor';

// what work is worth, in tenths of an hour
const BILL_FACT = 3;      // 0.3 — a fact established
const BILL_PROP = 1;      // 0.1 — something read for the first time
const BILL_MATTER = 40;   // 4.0 — a matter closed
const DARK_DRAIN = 1.7;   // energy per second on an unlit floor
const COLLAPSE_TAKE = 20; // 2.0 — what the building charges for time you lost

hoursHooks.onBill = (t, memo) => {
  G.fx.bark(G.player.x, G.player.y - 52, '+' + fmtHours(t), '#9be05e', 2.0);
  SFX.page();
  syncHud();
};
hoursHooks.onLight = (regionId, cost) => {
  showBanner('THE LIGHTS COME ON', `${fmtHours(cost)} HOURS — CHARGED`);
  SFX.district();
  say('It is not a switch. It is a ceiling coming on one bank at a time, the whole length of the floor, the way it does at ten past six for people who are staying.', 9);
  refreshCasefile(); syncHud();
};
// The trap, announced. Not as a warning — the building is not warning you.
hoursHooks.onPressure = step => {
  const lines = [
    '', 'Somewhere a printer starts, runs four pages, and stops.',
    'The corridor is longer than it was. You have not measured it. You know.',
    'A phone rings on a desk you passed. It rings eleven times.',
    'Your name is on more doors than it was when you woke up.',
    'The building has stopped treating you as a visitor.',
    'You are the most productive person on this floor. There is nobody else on this floor.',
  ];
  showBanner('BILLED — ' + fmtHours(Hours.billed), 'THE BUILDING HAS NOTICED');
  say(lines[step] || lines[lines.length - 1], 9);
  G.fx.addTrauma(0.45);
  SFX.del();
};

const RENT = 1100, RENT_EVERY = 7;
const ALLY_SPD = 190;
// Her reach must comfortably EXCEED the distance she stands off at, or the one
// thing she is paid to do — hit whatever has closed on you — is the one thing
// she cannot reach. Station 44, reach 44 + the target's radius.
const ALLY_STATION = 44, ALLY_REACH = 44;

function scheduleRent() {
  for (let i = 1; i <= 12; i++)
    schedule({ day: 1 + i * RENT_EVERY, kind: 'rent', label: `Rent — Suite 2B ($${RENT})` });
}

/**
 * Payroll is scheduled the day somebody is hired, not at the start of the game,
 * so the docket never carries a line for an obligation you do not have. A week's
 * wages, a week from now, and every week after that until there is nobody left
 * to pay — which lands it off the rent's rhythm by however many days you took to
 * decide, and that is the point: two squeezes a week, on days you chose.
 */
function schedulePayroll() {
  if (allEntries().some(e => e.ref === 'payroll')) return;
  for (let i = 1; i <= 14; i++)
    schedule({ day: Cal.day + i * 7, ref: 'payroll', kind: 'payroll', label: 'Payroll — Suite 2B' });
}

clockHooks.onDue = e => {
  if (e.kind === 'rent') rentDay();
  else if (e.kind === 'payroll') payrollDay();
  else if (e.kind === 'deadline') {
    // the entry fires ON the due date; the matter has this day to be resolved.
    // The check happens at the END of the day, in endDay() below.
    say(`DUE TODAY — ${e.label}.`, 8);
    showBanner('DUE TODAY', e.label);
  }
};

/* -------------------------------- boot --------------------------------- */
function beginPath(layerId, path) {
  G.path = path;
  G.layer = layerId;
  Facts.resetFacts();
  Quests.resetQuests();
  G.world = new World(REGIONS, layerId);
  G.world.onEnter = (def, built) => {
    const L = built.layerData;
    const unlit = G.layer === 'floor' && !isLit(def.id);
    showBanner(def.name, layerOf(G.layer).name + (unlit ? ' · UNLIT' : ''));
    // a district you have not paid for describes itself differently, and the
    // line you get after you light it is the one that was always written for it
    const line = (unlit && L.greetDark) || L.greet;
    if (line) say(line, 6);
    SFX.district();
    Quests.questEvent('reach', { region: def.id });
  };
  const s = SPAWN[layerId];
  G.player = makePlayer(s.x, s.y);
  G.carried = [];
  G.complaint = null;
  G.ally = null;
  G.shots = [];
  G.served = 0;
  resetClock();
  Practice.resetPractice();
  Practice.seedRep(REGIONS.map(r => r.id));
  resetHours();
  if (layerId === 'street') {
    Practice.post(4100, 'Opening balance — everything you had', 'operating', 1);
    scheduleRent();
  }
  if (layerId === 'floor') {
    // Wherever you wake up is already on the lights, and nowhere else is. The
    // region declares it rather than main.js hard-coding a district, because by
    // the end of Phase 3 there are six of these and only one is free.
    for (const def of REGIONS)
      if (def.layers.floor && def.layers.floor.litFree) lightFree(def.id);
  }
  G.world.update(s.x, s.y);
  camFollow(s.x, s.y);
  G.state = 'play';
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = '';
  Quests.qTick();      // opens whichever matter this path starts with
  syncHud();
}

function startNew() {
  audioInit();
  document.getElementById('menu').style.display = 'none';
  G.state = 'intro';
  Intro.start((layerId, path) => beginPath(layerId, path));
}

function continueGame() {
  audioInit();
  const d = loadGame();
  if (!d) { startNew(); return; }
  beginPath(d.layer, d.path);
  G.player.x = d.x; G.player.y = d.y;
  G.player.hp = d.hp ?? 100;
  G.carried = d.carried || [];
  // restore knowledge, matters, the docket and the books BEFORE residency, so
  // quest markers and already-read props come back in the right state
  Facts.loadFacts(d.facts);
  Quests.loadQuests(d.quests);
  loadClock(d.clock);
  Practice.loadPractice(d.practice);
  Practice.seedRep(REGIONS.map(r => r.id));   // a save made before a district existed
  if (d.hours) loadHours(d.hours);
  G.world.loadDeltas(d.deltas);
  // rebuild residency at the restored position so deltas apply to fresh builds
  for (const id of G.world.residentIds()) G.world.evict(id);
  G.world.currentId = null;
  G.world.update(G.player.x, G.player.y);
  camFollow(G.player.x, G.player.y);
  if (d.complaint) spawnComplaint();
  // both are derived from the practice, never serialized separately — a save
  // that disagreed with itself about who is on the payroll would be the worst
  // kind of bug to reproduce
  applyUpgrades();
  syncAlly();
  syncHud();
  say(`Representation resumed. ${dateString()}.`, 4);
}

export function doSave() {
  if (G.state !== 'play') return false;
  return saveGame({
    layer: G.layer, path: G.path,
    x: G.player.x, y: G.player.y, hp: G.player.hp,
    carried: G.carried,
    facts: Facts.saveFacts(),
    quests: Quests.saveQuests(),
    clock: saveClock(),
    practice: Practice.savePractice(),
    hours: saveHours(),
    complaint: !!G.complaint,
    deltas: G.world.saveDeltas(),
  });
}

/* ------------------------------ messaging ------------------------------ */
function say(text, t = 4) { G.msg.text = text; G.msg.t = t; }
function showBanner(text, sub) { G.banner.text = text; G.banner.sub = sub || ''; G.banner.t = 3.2; }
// prompts read as keyboard by default; on touch they name the on-screen button
const ek = s => IS_TOUCH ? s.replace('[E]', '[USE]') : s;

/* --------------------------- world interaction -------------------------- */

/** '!' when an NPC is the current objective, '?' when they merely have lines. */
function npcMarker(id) {
  for (const q of Quests.activeQuests()) {
    const stage = Quests.currentStage(q.id);
    if (stage && stage.type === 'talk' && stage.npc === id) return '!';
    // a resolve stage is parked ON the npc who offered it
    if (stage && stage.type === 'resolve' && q.stages[Quests.qstate[q.id].stage - 1]
      && q.stages[Quests.qstate[q.id].stage - 1].npc === id) return '!';
  }
  return null;
}

/** Open any dialogue tree — an NPC, the rent man, a form letter. */
function openDialogue(tree, onClose) {
  G.state = 'dialog';
  Input.clearHeld();
  SFX.blip();
  Dialogue.open(tree, () => {
    G.state = 'play';
    if (onClose) onClose();
    refreshCasefile();
    syncHud();
  });
}

function talkTo(npc) {
  const tree = npcDialogue(npc.id);
  if (!tree) { say(`${npc.name} has nothing to say.`, 3); return; }
  G.state = 'dialog';
  Input.clearHeld();
  SFX.blip();
  // Order matters here. The tree is BUILT from the state you walked up in — so
  // the intake conversation still reads as intake — and the talk event fires
  // immediately AFTER, before a word is exchanged. That is what lets a single
  // conversation both satisfy a `talk` stage and answer the `resolve` stage
  // behind it: by the time the player picks a resolution, `resolve` is current.
  // Emitting only on close made qResolve() a no-op, because the quest was still
  // parked on the talk stage while the player was choosing.
  //
  // AUTHORING RULE: never put two consecutive `talk` stages on the same NPC —
  // the open/close pair would walk through both in one conversation.
  Quests.questEvent('talk', { npc: npc.id });
  Dialogue.open(tree, () => {
    G.state = 'play';
    // and again on close, for a stage this conversation's own facts unlocked
    Quests.questEvent('talk', { npc: npc.id });
    refreshCasefile();
    syncHud();
  });
}

function useProp(pr) {
  const first = !pr.used;
  // a `repeat` prop is a place you keep going back to — the filing window, the
  // stairs up to your office, the lighting panel. It must never be marked spent.
  if (!pr.repeat) { pr.used = true; G.world.markUsed(pr.region, pr.id); }

  // The COMMON half runs for every kind of prop, before any of them decide how
  // to present themselves. A prop that opened a dialogue used to return before
  // this, which meant a prop carrying both a `tree` and a `fact` silently never
  // taught the fact — and the matter behind it could not be finished.
  Quests.questEvent('use', { prop: pr.id });
  const learned = pr.fact ? Facts.learn(pr.fact) : false;
  if (pr.fact && !learned) SFX.page();
  // Reading something on THE FLOOR is work, and work on this layer is billable.
  // 0.1 is nothing; it is nothing six hundred times. Only on a genuine first
  // read or a fact you did not have — otherwise a `repeat` prop is a bank.
  if (((!pr.repeat && first) || learned) && HAS_HOURS() && !pr.lights)
    bill(BILL_PROP, `${fmtHours(BILL_PROP)} — reviewed file materials`);

  // ...and then the PRESENTATION half.
  if (pr.lights) return openPanel(pr);
  if (pr.office) return openOffice(pr);
  // A prop can name a dialogue tree. Some things you have a conversation with
  // are not people — a personnel file with your name on it is one of them, and
  // a `resolve` stage has to be answerable somewhere.
  const tree = pr.tree ? npcDialogue(pr.tree) : null;
  if (tree) {
    openDialogue(tree, () => Quests.questEvent('use', { prop: pr.id }));
    return;
  }
  say(pr.text, 9);
  SFX.door();
  if (pr.endDay) endDay();
  syncHud();
}

/**
 * The lighting panel. Every dark floor has one, and it is the only transaction
 * on this layer — a breaker box with a time-entry form taped to it, because the
 * building does not turn lights on for people, it turns them on for matters.
 *
 * It is deliberately not a keypress. The cost has to be READ, in the building's
 * own language, every single time, so that the tenth floor you light costs the
 * player the same sentence the first one did.
 */
function openPanel(pr) {
  // one source for what a floor costs: the region's own floor-layer data, so
  // the panel, the Casefile and the save all quote the same number.
  const def = REGIONS.find(r => r.id === pr.region);
  const cost = (def && def.layers.floor && def.layers.floor.lightCost) || 10;
  const lit = isLit(pr.region);
  const T = { who: 'FLOOR LIGHTING — CHARGE TO MATTER № ____', spr: 'sign', start: 'a', nodes: {} };

  if (lit) {
    T.nodes.a = { text: 'The form is filled in. The hours are in your handwriting and the matter number is blank, and the lights are on, and nobody has ever asked about the matter number.' };
    openDialogue(T);
    return;
  }

  T.nodes.a = {
    text: (pr.text || 'A breaker panel with a form taped over the switches.')
      + `\n\n    ────────────────────────────────`
      + `\n    HOURS TO BE CHARGED . . ${fmtHours(cost).padStart(5)}`
      + `\n    BANKED . . . . . . . . .${fmtHours(Hours.banked).padStart(6)}`
      + `\n    MATTER № . . . . . . . .  ______`
      + `\n    ────────────────────────────────\n`
      + `\nUnder the line, in the same hand as everything else in this building: THE LIGHTS RUN AS LONG AS THE WORK DOES.`,
    choices: () => [
      { tag: 'BILL', label: `Sign it. Charge ${fmtHours(cost)} hours to the floor.`,
        if: () => Hours.banked >= cost,
        showLocked: true,
        lockedNote: `short by ${fmtHours(cost - Hours.banked)} — go and do something billable`,
        fx: () => { lightUp(pr.region, cost); Quests.questEvent('light', { region: pr.region }); },
        to: 'done' },
      { label: 'Leave it dark. You can see well enough.', to: null },
    ],
  };
  T.nodes.done = {
    text: 'You write the hours in, and you do not write a matter number, because there is no matter — and the lights come on anyway, which tells you what the form is actually for.',
  };
  openDialogue(T);
}

/* ---------------------------- ending the day ---------------------------- */

/**
 * Sleep. Everything that was going to catch up with you catches up here:
 * deadlines lapse, rent comes due, and you get the energy back that the day
 * took. This is the only place the clock moves, which is what makes "I'll do
 * it tomorrow" a decision instead of a shrug.
 */
function endDay(forced) {
  if (!HAS_CLOCK()) { say('The calendar on the wall reads the same date it read before. Nothing here is going to become tomorrow.', 7); return; }

  // A matter whose due date has passed is over. Checked at day's end, so the
  // due date itself is a full day you can still work in.
  for (const q of Quests.openQuests()) {
    if (!q.due) continue;
    const entry = allEntries().find(e => e.ref === q.id && e.kind === 'deadline');
    if (!entry || entry.day > Cal.day) continue;
    // A receptionist is somebody who was at a phone while you were not. She gets
    // one day back per matter and no more — the grace is a person, not a rule,
    // and a person can only call the same clerk about the same file once.
    if (Practice.hasStaff('receptionist') && !entry.graced) {
      entry.graced = true;
      entry.day = Cal.day + 1;
      showBanner('ONE DAY OF GRACE', q.name.toUpperCase());
      say(`Perla got somebody on the phone about ${q.name} at ten to four. You have tomorrow. You do not have the day after.`, 9);
      continue;
    }
    unschedule(q.id);
    Quests.failQuest(q.id, 'the date passed');
  }

  advanceDay();
  // Sleeping is the only thing that gets the paper off you.
  if (G.served) { say(`You went through what you were handed. ${G.served} of them, and none of them were about anything you did.`, 6); G.served = 0; }
  G.shots.length = 0;
  if (Practice.hasStaff('associate')) associateWorks();

  // Evicted, you can still end the day — blocking it would soft-lock the game,
  // since ending days is how you get to the work that pays the arrears. You
  // just sleep worse.
  const roofless = !Practice.Office.held;
  G.player.hp = roofless ? Math.round(G.player.maxhp * 0.55) : G.player.maxhp;

  const d = Cal.day;
  showBanner(dateString(d), forced ? 'you lost the rest of yesterday' : `DAY ${d}`);
  if (!forced) say(roofless
    ? `${dateString(d)}. You slept in the firm car with the files in the footwell and woke up at an angle you will feel until Thursday.`
    : `${dateString(d)}. You slept about four hours, which is two more than the firm ever allowed.`, 6);
  SFX.district();
  syncHud();
  refreshCasefile();
}

/**
 * An associate is a second case in flight. Overnight he establishes one thing
 * on one open matter — the oldest hole on the earliest matter, so he is
 * predictable and you can plan around him, which is what having staff is for.
 * He never resolves anything. Deciding is still the job.
 */
function associateWorks() {
  for (const q of Quests.openQuests()) {
    if (q.layer && q.layer !== G.layer) continue;
    const holes = Facts.openFacts(q.id);
    if (!holes.length) continue;
    Facts.learn(holes[0].id);
    say(`A note on the folding table in handwriting that is not yours: Desmond sat with ${q.name} until two. — ${holes[0].text}`, 10);
    return;
  }
}

/** Rent day. The Wok bills weekly, in cash, which is its own answer. */
function rentDay() {
  const owed = RENT;
  const T = { who: 'The Golden Wok', spr: 'sign', start: 'a', nodes: {} };
  T.nodes.a = {
    text: `Rent. Eleven hundred, weekly, cash, and the man who collects it does not come upstairs — he stands at the bottom and waits, which is worse.\n\nOperating account: $${Practice.Books.operating}.   Trust: $${Practice.Books.trust}.`,
    choices: () => [
      { label: `Pay the $${owed} out of the operating account.`,
        if: () => Practice.canPay(owed),
        showLocked: true, lockedNote: 'not enough in operating',
        fx: () => { Practice.expense(owed, 'Rent — Suite 2B', Cal.day); Practice.clearArrears(); },
        to: 'paid' },
      { tag: 'TRUST', label: `Take $${Math.min(owed, Practice.Books.trust)} out of the trust account.`,
        if: () => Practice.Books.trust > 0,
        to: 'trustWarn' },
      { label: 'Tell him next week.', to: 'miss' },
    ],
  };
  T.nodes.paid = { text: 'He counts it twice on the step, nods at nothing in particular, and goes back inside. That is the whole ceremony.' };
  T.nodes.trustWarn = {
    text: 'It is right there in the same bank, under a different word. Delgado will not look at it this week. Nobody looks at it any week — that is the entire reason it works, right up until it does not.',
    choices: [
      { label: 'Do it.', fx: () => doCommingle(owed), to: 'didIt' },
      { label: 'Don\'t. Tell him next week.', to: 'miss' },
    ],
  };
  T.nodes.didIt = { text: 'The transfer takes eleven seconds. You are current on the rent. You are also, as of eleven seconds ago, holding less of your client\'s money than you are supposed to be holding.' };
  T.nodes.miss = {
    text: 'He does not argue. He writes something on the back of his hand and goes back inside, and that is somehow the part that gets you.',
    fx: () => {
      const n = Practice.missRent(Cal.day);
      say(n >= 2 ? 'Second missed week.' : 'Rent missed. One more and the tape comes off the buzzer.', 7);
    },
  };
  openDialogue(T);
}

/**
 * Payroll. The rent man at least comes to the bottom of the stairs; these three
 * are upstairs, in the room, and they have arranged their week around this.
 */
function payrollDay() {
  const owed = Practice.payrollTotal();
  if (!owed) return;
  const who = Practice.Firm.staff.map(id => Practice.STAFF[id].name).join(', ');
  const T = { who: 'PAYROLL', spr: 'sign', start: 'a', nodes: {} };
  T.nodes.a = {
    text: `Friday, near enough. ${who} — $${owed} between them, and not one of them has asked you about it, which is worse than if they had.\n\nOperating account: $${Practice.Books.operating}.   Trust: $${Practice.Books.trust}.`,
    choices: () => [
      { label: `Pay the $${owed}.`,
        if: () => Practice.canPay(owed),
        showLocked: true, lockedNote: 'not enough in operating',
        fx: () => Practice.expense(owed, 'Payroll — Suite 2B', Cal.day),
        to: 'paid' },
      { tag: 'TRUST', label: `Make payroll out of the trust account.`,
        if: () => Practice.Books.trust > 0, to: 'trustWarn' },
      { label: 'Tell them it will be Monday.', to: 'miss' },
    ],
  };
  T.nodes.paid = { text: 'Nobody says thank you and nobody should. It is a wage.' };
  T.nodes.trustWarn = {
    text: 'The same button as last time, and it is easier this time, and it will be easier again. The money in that account belongs to people who are not in this room and cannot see it going.',
    choices: [
      { label: 'Do it.', fx: () => doCommingle(owed), to: 'didIt' },
      { label: 'Don\'t. Tell them Monday.', to: 'miss' },
    ],
  };
  T.nodes.didIt = { text: 'Payroll is made. Three people go home able to make their own rent, on money that was never yours to make it with.' };
  T.nodes.miss = {
    text: 'They take it well, which is how you know how many times it has happened to them before. By the end of the week the desks are clear and the redweld is gone off the second chair.',
    fx: () => {
      const gone = Practice.loseStaff(Cal.day);
      CASE_HOOKS.rep('strand', -2);
      CASE_HOOKS.rep('courthouse', -1);
      say(`${gone.map(s => s.name).join(' and ')} did not come back Monday.`, 9);
    },
  };
  openDialogue(T);
}

/* ------------------------------ the practice ---------------------------- */

/**
 * Suite 2B. The only room in the game that is yours, so it is the only place
 * that sells you anything — the day ends here, the hiring happens here, and the
 * office gets better here, in that order of how often you will use it.
 */
function openOffice(pr) {
  const T = { who: 'SUITE 2B', spr: 'sign', start: 'a', nodes: {} };

  // Both of these are FUNCTIONS on purpose. You can buy the second chair and
  // then hire somebody without leaving the room, so every gate and every line
  // in here has to read live state — the dialogue engine re-evaluates `text`
  // and `choices` on each render specifically so this works. Hoisting either
  // one into a const at tree-build time silently freezes the room.
  T.nodes.a = {
    text: () => pr.text + (Practice.Firm.staff.length
      ? `\n\nOn the payroll: ${Practice.Firm.staff.map(id => `${Practice.STAFF[id].name} (${Practice.STAFF[id].role}, $${Practice.STAFF[id].wage}/wk)`).join('; ')}.`
      : ''),
    choices: () => [
      { label: 'Put the day down. Sleep.', fx: () => endDay(), to: null },
      { tag: 'HIRE', label: 'Take somebody on.',
        if: () => Practice.hasUpgrade('chair'), showLocked: true,
        lockedNote: 'there is one chair, and you are in it',
        to: 'hire' },
      { label: 'The office itself.', to: 'office' },
      { label: 'Back down the stairs.', to: null },
    ],
  };

  T.nodes.hire = {
    text: 'Three names, and all three of them are somebody\'s whole month.',
    choices: () => {
      const out = Object.values(Practice.STAFF).map(s => ({
        label: `${s.name} — ${s.role}. $${s.hire} now, $${s.wage} a week. ${s.effect}`,
        if: () => !Practice.hasStaff(s.id) && Practice.canPay(s.hire),
        showLocked: true,
        lockedNote: Practice.hasStaff(s.id) ? 'already on the payroll' : `you do not have $${s.hire}`,
        fx: () => { if (Practice.hire(s.id, Cal.day)) SFX.send(); },
        to: 'hire',
      }));
      out.push({ label: 'Not this week.', to: 'a' });
      return out;
    },
  };

  T.nodes.office = {
    text: 'The room, itemised. None of it is necessary. All of it is the difference between an office and a place you happen to be.',
    choices: () => {
      const out = Object.values(Practice.UPGRADES).map(u => ({
        label: `${u.name} — $${u.cost}. ${u.effect}`,
        if: () => !Practice.hasUpgrade(u.id) && Practice.canPay(u.cost),
        showLocked: true,
        lockedNote: Practice.hasUpgrade(u.id) ? 'done' : `you do not have $${u.cost}`,
        fx: () => { if (Practice.buyUpgrade(u.id, Cal.day)) SFX.send(); },
        to: 'office',
      }));
      out.push({ label: 'Leave it as it is.', to: 'a' });
      return out;
    },
  };
  openDialogue(T);
}

/** The upgrades that change a number rather than firing once. */
function applyUpgrades() {
  if (!G.player) return;
  const want = 100 + (Practice.hasUpgrade('bed') ? 12 : 0);
  if (G.player.maxhp === want) return;
  const gained = want - G.player.maxhp;
  G.player.maxhp = want;
  if (gained > 0) G.player.hp += gained;
  G.player.hp = Math.min(G.player.hp, want);
}

/** The paralegal exists in the world or she does not. Derived, never saved. */
function syncAlly() {
  const want = Practice.hasStaff('paralegal') && G.player;
  if (want && !G.ally) {
    const p = G.player;
    G.ally = { x: p.x - 44, y: p.y + 28, rig: new Rig(), cd: 0, face: 1 };
    G.ally.rig.spawn();
  } else if (!want) G.ally = null;
}

Practice.practiceHooks.onHire = s => {
  schedulePayroll();
  syncAlly();
  showBanner('ENGAGED', `${s.name.toUpperCase()} — ${s.role.toUpperCase()}`);
  say(`${s.name} starts Monday and will want paying every week after that, which is the part nobody puts in the fantasy.`, 8);
  syncHud(); refreshCasefile();
};
Practice.practiceHooks.onLoseStaff = gone => {
  unschedule('payroll');
  syncAlly();
  showBanner('PAYROLL NOT MADE', gone.map(s => s.name.toUpperCase()).join(' · '));
  G.fx.addTrauma(0.5); SFX.del();
  syncHud(); refreshCasefile();
};
Practice.practiceHooks.onUpgrade = u => {
  showBanner('SUITE 2B', u.name.toUpperCase());
  say(u.blurb, 8);
  if (u.id === 'door') {
    for (const r of REGIONS) Practice.bumpRep(r.id, 2);
    say('The vinyl went on at eight in the morning and by lunchtime three people had used your name without being told it.', 8);
  }
  applyUpgrades();
  syncHud(); refreshCasefile();
};

function doCommingle(amount) {
  const n = Practice.commingle(amount, 'Rent — Suite 2B', Cal.day);
  Practice.clearArrears();
  say(`$${n} moved out of trust. The rent is paid.`, 7);
  syncHud();
}

Practice.practiceHooks.onCommingle = (n, count) => {
  showBanner('TRUST ACCOUNT SHORT', `$${n} — crossing #${count}`);
  G.fx.addTrauma(0.5);
  SFX.del();
  // The Bar Complaint is not an enemy you kill. It follows you between
  // districts and stops only when the trust account is whole again.
  spawnComplaint();
};

Practice.practiceHooks.onEvict = () => {
  showBanner('EVICTED', 'SUITE 2B — THE TAPE IS OFF THE BUZZER');
  say('Two weeks down and the lock is changed. Your files are in four boxes on the sidewalk, which at least makes them portable.', 10);
  SFX.boom(); G.fx.addTrauma(0.8);
};

/**
 * Running out of energy is not death. There is no game-over screen in a game
 * about a law practice — you lose the rest of the day, which is worse, because
 * the docket does not care why you were unconscious.
 */
function collapse() {
  const p = G.player;
  p.hp = p.maxhp;
  G.fx.stamp(p.x, p.y - 10, 'CONTINUED', '#c0392b');
  G.fx.addTrauma(0.7);
  SFX.del();
  if (HAS_CLOCK()) {
    say('You come to on the sidewalk with your own business cards scattered around you and no memory of the afternoon.', 8);
    endDay(true);
  } else {
    // No day to lose here, so the building takes the only thing this layer has.
    // It does not credit you for the time you were out; it charges you for it,
    // and the entry is already written when you come round.
    const took = writeDown(COLLAPSE_TAKE, 'non-productive time, written off');
    say(took
      ? `You come to at the same desk. The clock has not moved, because it does not. ${fmtHours(took)} hours have gone off the sheet, and the entry is in your handwriting.`
      : 'You come to at the same desk. There was nothing on the sheet to take, which the building appears to find clarifying.', 9);
    showBanner('TIME WRITTEN OFF', took ? '−' + fmtHours(took) + ' HOURS' : 'NOTHING LEFT TO TAKE');
  }
  // put some distance between you and whatever did it
  const b = G.world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  if (b) { p.x = (b.ox + 3) * TILE + 20; p.y = (b.oy + 19) * TILE + 20; G.world.update(p.x, p.y); }
}

function spawnComplaint() {
  if (G.complaint) return;
  const p = G.player;
  G.complaint = { x: p.x - 140, y: p.y - 140, rig: new Rig(), t: 0 };
  G.complaint.rig.spawn();
  say('A grievance has been opened. It is a piece of paper and it is following you.', 8);
}
/**
 * How much client money ought to be sitting in trust right now.
 * One retainer makes this a two-line function; when there are five, move the
 * obligation onto the quest definitions and sum them.
 */
function trustOwed() {
  const owedCoronado = Facts.knows('coronado_paid')
    && !(Quests.isDone('coronado') && !Quests.isFailed('coronado'));
  return owedCoronado ? 1400 : 0;
}

function clearComplaint() {
  if (!G.complaint) return;
  G.complaint = null;
  say('The trust account is whole. The grievance closes without a finding, which is the best result there is.', 8);
}

/**
 * One actor, off the board. Everything that follows from a thing going down
 * lives here and nowhere else, because there are two callers now — you and the
 * paralegal — and a quest stage that only counted YOUR kills would be a bug
 * nobody would find until the district that needs a kill stage.
 */
function downActor(a, d) {
  G.fx.stamp(a.x, a.y - 10, d.harmless ? 'EXCUSED' : 'DISMISSED', d.harmless ? '#9be05e' : C.red);
  SFX.die();
  G.world.killActor(a);              // <- the delta: this one stays gone
  Quests.questEvent('kill', { enemy: a.type });
  // The Unbilled are your own hours, itemized. Putting one down is the only way
  // to get time back rather than earn it, and it is why the dark has anything
  // in it worth walking into.
  if (d.hours && HAS_HOURS())
    bill(d.hours, `${fmtHours(d.hours)} — time recovered (previously written off)`);
}

/* --------------------------- the opposition ----------------------------- */

// Conditions the roster can require before it exists at all. Keyed by the
// `needs` string on the actor type, so the table stays data.
const ACTOR_NEEDS = {
  arrears: () => Practice.Books.arrears > 0 || !Practice.Office.held,
};
const actorAwake = d => !d.needs || !ACTOR_NEEDS[d.needs] || ACTOR_NEEDS[d.needs]();

/**
 * Something reached you. Not every enemy in LE2 wants the same thing off you —
 * a Collections Agent wants $140 and does not care about your energy, a Process
 * Server wants to hand you a piece of paper that stays handed. One place, so
 * adding an enemy that wants something new is one branch.
 */
function touchedBy(a, d, dmg) {
  const p = G.player;
  if (p.hurtCd > 0 || p.dashT > 0) return;
  p.hurtCd = 0.9;
  const ux = (p.x - a.x) / (Math.hypot(p.x - a.x, p.y - a.y) || 1);
  const uy = (p.y - a.y) / (Math.hypot(p.x - a.x, p.y - a.y) || 1);
  p.rig.hurt(ux, uy);
  G.fx.addTrauma(0.4);
  SFX.hit();

  if (d.drain && HAS_CLOCK()) {
    // It takes what is there. An empty operating account is not a defence — it
    // is just a smaller number on the same demand.
    const took = Math.min(d.drain, Math.max(0, Practice.Books.operating));
    if (took > 0) Practice.expense(took, 'Collection — taken on the street', Cal.day);
    G.fx.number(p.x, p.y - 30, took > 0 ? `−$${took}` : 'NOTHING TO TAKE', C.red);
    say(took > 0 ? `They took $${took} off you in the street, with a receipt.` : 'He looks at the balance, and then at you, and writes something down.', 5);
    syncHud();
    return;
  }

  if (d.steal && G.carried.length) {
    const i = (Math.random() * G.carried.length) | 0;
    const gone = G.carried.splice(i, 1)[0];
    G.fx.number(p.x, p.y - 30, 'RETRIEVED', C.red);
    say(`They took the ${gone}. It was on their system, apparently, and now it is back on it.`, 6);
    syncHud();
    return;
  }

  p.hp -= dmg;
  G.fx.number(p.x, p.y - 30, d.onTouch || dmg, C.red);
  if (d.debuff === 'served') {
    // Being served is a condition, not a hit. They stack, they slow you, and
    // they last until you sleep — which makes a bad afternoon on the courthouse
    // steps a bad afternoon rather than a bad four seconds.
    G.served++;
    G.fx.bark(p.x, p.y - 52, `SERVED ×${G.served}`, '#e05e5e', 2.4);
  }
  if (p.hp <= 0) collapse();
  syncHud();
}

/** How much the paper you are carrying is slowing you down. Caps, so it is a tax. */
const servedSlow = () => 1 - Math.min(0.45, G.served * 0.09);

/**
 * The Ambulance Chaser. She is not hostile — she never touches you and cannot
 * be fought off, because she is never on you. She walks at whoever the HUD
 * currently says you should be talking to, and if she gets there she signs
 * them. Getting in the way is the only counter, which is also true of the
 * actual profession.
 */
function updateChaser(a, d, dt) {
  const p = G.player;
  if (!a.rig) { a.rig = new Rig(); a.rig.spawn(); }
  a.barkT = (a.barkT || 4 + Math.random() * 8) - dt;

  // She only operates where you are. Every district is resident at once on a
  // map this size, and a rival quietly signing a client two districts away
  // while you have never set foot there is not a mechanic, it is a tax you
  // cannot see. She is a threat in the room, or she is not a threat.
  const here = G.world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  if (!here || here.id !== a.region) { a.rig.step(dt, { moving: false }); return; }

  const obj = Quests.objective();
  // the nearest marked client, not whichever one the iterator reached first
  let mark = null, best = Infinity;
  for (const n of G.world.allNpcs()) {
    if (n.marker !== '!') continue;
    const dd = Math.hypot(n.x - a.x, n.y - a.y);
    if (dd < best) { best = dd; mark = n; }
  }

  let moving = false;
  if (mark) {
    const dx = mark.x - a.x, dy = mark.y - a.y, m = Math.hypot(dx, dy) || 1;
    // you, standing in the gap, are a wall to her
    const toYou = Math.hypot(p.x - a.x, p.y - a.y);
    if (toYou > 46) {
      moveEntity(G.world, a, (dx / m) * d.speed * dt, (dy / m) * d.speed * dt, d.r);
      a.face = dx; moving = true;
    }
    if (m < 34) poached(a, obj);
  }
  if (a.barkT <= 0 && Math.hypot(p.x - a.x, p.y - a.y) < 320 && d.barks) {
    a.barkT = 7 + Math.random() * 10;
    G.fx.bark(a.x, a.y - d.r - 20, d.barks[(Math.random() * d.barks.length) | 0], '#e07a9a', 2.6);
  }
  a.rig.step(dt, { moving, speed: d.speed, faceX: a.face || 0 });
}

/** She got there first. Not a lost matter — a worse one, on a shorter fuse. */
function poached(a, obj) {
  G.world.killActor(a);
  G.fx.stamp(a.x, a.y - 10, 'SIGNED', '#e07a9a');
  SFX.del(); G.fx.addTrauma(0.5);
  showBanner('SHE GOT THERE FIRST', 'VONNIE ASLANIAN — RETAINED');
  if (!obj) { say('She signed somebody on the street in front of you and did not break stride.', 8); return; }
  const q = obj.quest;
  const entry = allEntries().find(e => e.ref === q.id && e.kind === 'deadline');
  if (entry) entry.day = Math.max(Cal.day, entry.day - 1);
  // the standing goes where it happened — she signed somebody on THIS street
  CASE_HOOKS.rep(a.region, -3);
  say(`She had a card out before you had the door open. ${q.name} is still yours and it is now on somebody else's timetable.`, 10);
  refreshCasefile(); syncHud();
}

/** Paper in the air. Expires on its own; nothing here needs a pool. */
function updateShots(dt) {
  const p = G.player;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
    if (s.t <= 0 || G.world.solidAtPx(s.x, s.y)) { G.shots.splice(i, 1); continue; }
    if (Math.hypot(s.x - p.x, s.y - p.y) < p.r + 10) {
      G.shots.splice(i, 1);
      if (p.hurtCd > 0 || p.dashT > 0) continue;
      p.hurtCd = 0.7;
      p.hp -= s.dmg;
      p.rig.hurt(Math.sign(s.vx), Math.sign(s.vy));
      G.fx.number(p.x, p.y - 30, s.label, C.red);
      G.fx.addTrauma(0.35);
      SFX.hit();
      if (p.hp <= 0) collapse();
      syncHud();
    }
  }
}

/* ------------------------------- update -------------------------------- */
function updatePlay(dt) {
  const p = G.player, world = G.world, fx = G.fx;
  G.t += dt;

  // --- movement + dash ---
  const v = Input.vec();
  const mag = Math.hypot(v.x, v.y);
  p.moving = mag > 0.08;

  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.meleeCd > 0) p.meleeCd -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;

  // dashing from a standstill is allowed — it lunges along the way you face
  if (Input.pressed('dash') && p.dashCd <= 0 && p.dashT <= 0) {
    const dx = p.moving ? v.x / mag : p.face.x, dy = p.moving ? v.y / mag : p.face.y;
    p.dashT = DASH_T; p.dashCd = DASH_CD; p.dashDx = dx; p.dashDy = dy;
    p.rig.dash(dx);
    SFX.dash();
    fx.dust(p.x, p.y, dx, dy, 8);
  }

  if (p.dashT > 0) {
    p.dashT -= dt;
    moveEntity(world, p, p.dashDx * DASH_SPD * dt, p.dashDy * DASH_SPD * dt, p.r);
    p.face = { x: p.dashDx, y: p.dashDy };
  } else if (p.moving) {
    // every piece of paper you are carrying is on you until you sleep
    const spd = SPEED * servedSlow();
    moveEntity(world, p, (v.x / mag) * spd * dt, (v.y / mag) * spd * dt, p.r);
    p.face = { x: v.x / mag, y: v.y / mag };
  }

  // pad right-stick / mouse aim wins over movement facing
  if (Input.pad.aim) p.face = { ...Input.pad.aim };

  p.rig.step(dt, { moving: p.moving, speed: SPEED, faceX: p.face.x });

  // --- streaming ---
  world.update(p.x, p.y);
  camFollow(p.x, p.y);

  // --- the dark ---
  // An unlit floor takes energy off you for as long as you stand on it. Slowly:
  // a minute of walking, not a death sentence. It is a clock, and the clock is
  // the whole argument for paying the panel — you CAN cross a dark district,
  // you just cannot work in one.
  const here = world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  G.dark = HAS_HOURS() && !!here && !isLit(here.id);
  if (G.dark) {
    p.hp -= DARK_DRAIN * dt;
    if (Math.random() < dt * 0.14)
      fx.bark(p.x, p.y - 44, DARK_BARKS[(Math.random() * DARK_BARKS.length) | 0], '#6f6a86', 2.6);
    if (p.hp <= 0) collapse();
  }

  // --- actor hp, filled from the table the first frame we see one ---
  // The region builder cannot know what a `server` is worth, so this is where
  // an actor stops being coordinates and becomes a thing with a health bar.
  for (const a of world.allActors()) if (a.hp == null) a.hp = actorDef(a.type).hp;

  // --- strike ---
  if (Input.pressed('strike') && p.meleeCd <= 0) {
    p.meleeCd = 0.36; p.rig.strike();
    const cx = p.x + p.face.x * 32, cy = p.y + p.face.y * 32;
    let hit = false;
    for (const a of [...world.allActors()]) {
      const d = actorDef(a.type);
      if (Math.hypot(a.x - cx, a.y - cy) < d.r + 28) {
        a.hp -= 18; hit = true;
        (a.rig || (a.rig = new Rig())).hurt(p.face.x, p.face.y);
        moveEntity(world, a, p.face.x * 240 * 0.06, p.face.y * 240 * 0.06, d.r);
        fx.number(a.x, a.y - d.r - 6, 18, '#fff');
        fx.spark(a.x, a.y, 3);
        if (a.hp <= 0) downActor(a, d);
      }
    }
    SFX.melee();
    if (hit) { fx.addTrauma(0.35); fx.stop(0.05); SFX.hit(); }
  }

  // --- actors ---
  // On THE FLOOR, anything that `scales` gets the building's attention folded
  // into it: every ten hours you have billed makes The Unbilled a little more
  // urgent about collecting. Lighting a floor buys safety on that floor and
  // pays for it everywhere else.
  const PRESS = HAS_HOURS() ? pressure() : 1;
  for (const a of world.allActors()) {
    const d = actorDef(a.type);

    // Some of the roster only exists under a condition. The Landlord is not a
    // fight, he is a bill with a walking speed, and he is not on the street at
    // all while you are current.
    a.asleep = !actorAwake(d);
    if (a.asleep) continue;

    const spd = d.scales ? d.speed * PRESS : d.speed;
    const dmg = d.scales ? Math.round(d.dmg * PRESS) : d.dmg;
    if (!a.rig) { a.rig = new Rig(); a.rig.spawn(); }
    a.barkT = (a.barkT || 4 + Math.random() * 10) - dt;
    const dist = Math.hypot(p.x - a.x, p.y - a.y);

    // The Ambulance Chaser does not want you and will not be drawn off. She
    // walks at whoever your objective is, and the only way to stop her is to
    // be standing between her and them, which is also the only way anybody has
    // ever stopped one.
    if (d.poach) { updateChaser(a, d, dt); continue; }

    // Anything with `ranged` throws from where it stands, on its own cadence,
    // whether or not it also closes.
    if (d.ranged && dist < d.chase) {
      a.fireT = (a.fireT ?? d.ranged.every) - dt;
      if (a.fireT <= 0) {
        a.fireT = d.ranged.every;
        const ux = (p.x - a.x) / (dist || 1), uy = (p.y - a.y) / (dist || 1);
        G.shots.push({
          x: a.x, y: a.y, vx: ux * d.ranged.speed, vy: uy * d.ranged.speed,
          t: d.ranged.life, dmg: Math.round(d.ranged.dmg * (d.scales ? PRESS : 1)),
          label: d.ranged.label,
        });
        a.rig.strike();
        SFX.page();
      }
    }

    let moving = false;
    // `still` never closes. It is where it is, it hurts what touches it, and
    // that is the entire design — a thing that does not come for you is scarier
    // than a thing that does, and cheaper.
    if (d.still) {
      if (dist < d.r + p.r + 4) touchedBy(a, d, dmg);
    } else if (!d.harmless && dist < d.chase) {
      const ux = (p.x - a.x) / (dist || 1), uy = (p.y - a.y) / (dist || 1);
      moveEntity(world, a, ux * spd * dt, uy * spd * dt, d.r);
      a.face = ux; moving = true;
      if (dist < d.r + p.r + 4) touchedBy(a, d, dmg);
    } else {
      // wander: pick a nearby open point, walk to it, then stand around
      if (!a.wp || a.lingerT > 0) {
        a.lingerT = (a.lingerT || 1 + Math.random() * 3) - dt;
        if (a.lingerT <= 0) {
          const ang = Math.random() * Math.PI * 2, rad = 60 + Math.random() * 140;
          a.wp = { x: a.x + Math.cos(ang) * rad, y: a.y + Math.sin(ang) * rad };
        }
      } else {
        const dx = a.wp.x - a.x, dy = a.wp.y - a.y, m = Math.hypot(dx, dy);
        if (m < 8) { a.wp = null; a.lingerT = 1 + Math.random() * 3; }
        else {
          const bx = a.x, by = a.y;
          moveEntity(world, a, (dx / m) * spd * dt, (dy / m) * spd * dt, d.r);
          a.face = dx;
          moving = true;
          if (Math.abs(a.x - bx) < 0.01 && Math.abs(a.y - by) < 0.01) a.wp = null;  // wedged — replan
        }
      }
    }
    if (a.barkT <= 0 && dist < 300 && d.barks) {
      a.barkT = 8 + Math.random() * 14;
      fx.bark(a.x, a.y - d.r - 20, d.barks[(Math.random() * d.barks.length) | 0], '#bcb0d4', 2.6);
    }
    a.rig.step(dt, { moving, speed: spd, faceX: a.face || 0 });
  }

  // --- paper in the air ---
  updateShots(dt);

  // --- the paralegal ---
  // She keeps station off your shoulder and swings at whatever is on you. She
  // cannot be hurt and does not need managing — a companion you have to babysit
  // would be a worse deal than the $420 a week, and the $420 a week is the
  // mechanic. If geometry loses her, she catches up off-screen, because a
  // paralegal stuck behind a bollard is a bug and not a characterisation.
  if (G.ally) {
    const al = G.ally;
    const ax = p.x - al.x, ay = p.y - al.y, am = Math.hypot(ax, ay) || 1;
    let alMoving = false;
    if (am > 560) { al.x = p.x - 40; al.y = p.y + 26; }
    else if (am > ALLY_STATION) {
      moveEntity(world, al, (ax / am) * ALLY_SPD * dt, (ay / am) * ALLY_SPD * dt, 13);
      al.face = ax; alMoving = true;
    }
    al.cd -= dt;
    if (al.cd <= 0) {
      for (const t of [...world.allActors()]) {
        const td = actorDef(t.type);
        if (td.harmless) continue;
        if (Math.hypot(t.x - al.x, t.y - al.y) > td.r + ALLY_REACH) continue;
        t.hp -= 14; al.cd = 1.05;
        al.rig.strike();
        (t.rig || (t.rig = new Rig())).hurt(Math.sign(t.x - al.x), Math.sign(t.y - al.y));
        fx.number(t.x, t.y - td.r - 6, 14, '#c9a2e0');
        fx.spark(t.x, t.y, 2);
        SFX.melee();
        if (t.hp <= 0) downActor(t, td);
        break;
      }
    }
    al.rig.step(dt, { moving: alMoving, speed: ALLY_SPD, faceX: al.face || 0 });
  }

  // --- the Bar Complaint ---
  // It is not an enemy. It cannot be hit, it does not care about walls, and it
  // never stops. It follows you across district lines at a walking pace and
  // takes a little energy whenever it reaches you. The only way to close it is
  // to put the client's money back.
  if (G.complaint) {
    const c = G.complaint;
    c.t += dt;
    const dx = p.x - c.x, dy = p.y - c.y, m = Math.hypot(dx, dy) || 1;
    c.x += (dx / m) * 62 * dt;
    c.y += (dy / m) * 62 * dt;
    c.rig.step(dt, { moving: true, speed: 62, faceX: dx });
    if (m < 34 && p.hurtCd <= 0) {
      p.hp -= 7; p.hurtCd = 1.3;
      p.rig.hurt(dx / m, dy / m);
      fx.number(p.x, p.y - 30, 'GRIEVANCE', C.red);
      fx.addTrauma(0.3); SFX.hit();
      if (p.hp <= 0) collapse();
      syncHud();
    }
    if (c.t > 3 && Math.random() < dt * 0.25)
      fx.bark(c.x, c.y - 26, 'RE: TRUST ACCOUNT', '#e05e5e', 2.6);
    // cure: the trust account covers what is owed again
    if (Practice.Books.trust >= trustOwed()) clearComplaint();
  }

  // --- npcs: idle rigs and the "I have something for you" marker ---
  for (const n of world.allNpcs()) {
    if (!n.rig) { n.rig = new Rig(); n.rig.spawn(); }
    n.rig.step(dt, { moving: false });
    n.marker = npcMarker(n.id);
  }

  // --- pickups ---
  for (const q of [...world.allPickups()]) {
    if (Math.hypot(q.x - p.x, q.y - p.y) < 30) {
      world.takePickup(q);             // <- the delta: this one stays taken
      G.carried.push(q.item);
      SFX.pick();
      fx.number(q.x, q.y - 16, '+ ' + q.name, C.gold, true);
      say(q.name + ' — ' + q.note, 6);
      Quests.questEvent('collect', { item: q.item });
      if (q.fact) Facts.learn(q.fact);
      syncHud();
    }
  }

  // --- prompts + interaction ---
  // NPCs outrank props: standing between Ruiz and the corkboard should offer
  // Ruiz, because a person is always the more interesting of the two.
  G.prompt = null;
  let bestNpc = null, npcD = 66;
  for (const n of world.allNpcs()) {
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d < npcD) { npcD = d; bestNpc = n; }
  }
  let best = null, bestD = 62;
  for (const pr of world.allProps()) {
    const d = Math.hypot(pr.x - p.x, pr.y - p.y);
    if (d < bestD) { bestD = d; best = pr; }
  }

  if (bestNpc) {
    G.prompt = ek(bestNpc.label || `[E] ${bestNpc.name}`);
    if (Input.pressed('interact')) talkTo(bestNpc);
  } else if (best) {
    G.prompt = ek(best.label);
    if (Input.pressed('interact')) useProp(best);
  }

  // --- fx ---
  fx.step(dt);
  if (G.msg.t > 0) G.msg.t -= dt;
  if (G.banner.t > 0) G.banner.t -= dt;
  syncHudLight();

  // --- dev ---
  if (DEV) {
    if (Input.pressed('devLayer')) {
      const next = G.layer === 'street' ? 'floor' : 'street';
      G.layer = next;
      G.world.setLayer(next);
      G.world.update(p.x, p.y);
      showBanner(layerOf(next).name, 'dev layer swap');
      say(`Layer -> ${next}. Same geometry, different world.`, 4);
    }
    if (Input.pressed('devSave')) say(doSave() ? 'dev: saved.' : 'dev: save failed.', 2);
    if (Input.pressed('devLoad')) { continueGame(); say('dev: loaded.', 2); }
  }
}

/* -------------------------------- HUD ---------------------------------- */
const el = id => document.getElementById(id);

function syncHud() {
  el('hName').textContent = G.path === 'delete' ? 'THE FLOOR' : 'ATTORNEY AT LAW';
  // The books only exist on the street. Showing a $0 balance on THE FLOOR
  // would imply an economy that floor has no business having.
  const money = el('hMoney');
  if (HAS_CLOCK()) {
    const B = Practice.Books;
    money.innerHTML = `<b>$${B.operating}</b> operating`
      + (B.trust ? ` &nbsp;·&nbsp; <span class="trust">$${B.trust} in trust</span>` : '')
      + (Practice.Office.held ? '' : ' &nbsp;·&nbsp; <span class="bad">NO OFFICE</span>');
    el('hDay').textContent = dateString();
  } else if (HAS_HOURS()) {
    // The floor's two columns. `banked` is what you can spend; `billed` is the
    // one that matters, and it is deliberately the one you cannot do anything
    // about — it sits there going up next to a number that goes up and down.
    money.innerHTML = `<b>${fmtHours(Hours.banked)}</b> banked`
      + ` &nbsp;·&nbsp; <span class="trust">${fmtHours(Hours.billed)} billed</span>`;
    el('hDay').textContent = 'THE SAME DAY';
  } else {
    money.textContent = '';
    el('hDay').textContent = '';
  }
  el('hCarry').innerHTML = (G.carried.length ? 'CARRYING: ' + G.carried.join(' · ') : '')
    + (G.served ? ` <span class="bad">SERVED ×${G.served}</span>` : '');
  syncHudLight();
}
function syncHudLight() {
  const p = G.player;
  if (!p) return;
  el('hHpFill').style.width = Math.max(0, (p.hp / p.maxhp) * 100) + '%';
  el('hHpLabel').textContent = `ENERGY ${Math.max(0, Math.round(p.hp))}/${p.maxhp}`;
  const b = G.world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  el('hDistrict').textContent = (b ? b.def.name + ' · ' + layerOf(G.layer).name : layerOf(G.layer).name)
    + (G.dark ? ' · UNLIT' : '');
  // the active stage's hint IS the objective — one source, never restated
  const obj = Quests.objective();
  el('hObjective').textContent = obj ? obj.text : '';
  el('hMatter').textContent = obj ? obj.quest.name : '';
  const m = el('hMsg');
  m.textContent = G.msg.t > 0 ? G.msg.text : '';
  m.style.opacity = G.msg.t > 0 ? Math.min(1, G.msg.t) : 0;
  if (DEV) el('hDev').textContent = `resident: [${G.world.residentIds().join(', ')}]  tile ${Math.floor(p.x / TILE)},${Math.floor(p.y / TILE)}`;
}

function drawBanner() {
  if (G.banner.t <= 0) return;
  const g = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const a = Math.min(1, G.banner.t / 0.6);
  g.globalAlpha = a;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 26px "Courier New", monospace';
  g.fillStyle = 'rgba(9,7,15,0.72)';
  g.fillRect(0, H * 0.16, W, 74);
  g.fillStyle = C.gold;
  g.fillText(G.banner.text, W / 2, H * 0.16 + 30);
  g.font = '12px "Courier New", monospace';
  g.fillStyle = C.dim;
  g.fillText(G.banner.sub, W / 2, H * 0.16 + 54);
  g.globalAlpha = 1;
}

/* -------------------------------- loop --------------------------------- */
let last = performance.now();
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  Input.frame();

  if (G.state === 'intro') {
    Intro.step(dt);
    Intro.draw();
    musicTick('letter');
  } else if (G.state === 'dialog') {
    // the world holds still behind the conversation, but keeps drawing
    G.fx.step(dt);
    G.player.rig.step(dt, { moving: false });
    drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G);
    stepDialogueInput();
    musicTick(layerOf(G.layer).music);
  } else if (G.state === 'play') {
    if (Casefile.open) {
      // the casefile is a reading screen; freeze play under it
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G);
      if (Input.pressed('casefile') || Input.pressed('cancel')) { Casefile.hide(); Input.clearHeld(); }
    } else {
      if (G.fx.hitStop > 0) G.fx.hitStop -= dt;
      else updatePlay(dt);
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G);
      if (G.prompt) drawPrompt(G.prompt);
      drawBanner();
      if (Input.pressed('casefile')) { Casefile.show(G.layer, HAS_CLOCK()); Input.clearHeld(); }
    }
    musicTick(layerOf(G.layer).music);
  } else {
    musicTick(null);
  }
}
// Dialogue is DOM and takes clicks on its own, but it must also be fully
// drivable from the keyboard and the pad — the choice list is the game's
// primary verb, not a mouse-only convenience.
function stepDialogueInput() {
  if (!Dialogue.active) { G.state = 'play'; return; }
  const nv = Input.nav();
  if (nv === 'up') { Dialogue.move(-1); SFX.blip(); }
  if (nv === 'down') { Dialogue.move(1); SFX.blip(); }
  const n = Input.numberPressed();
  if (n) { Dialogue.choose(n - 1); return; }
  if (Input.pressed('confirm') || Input.pressed('interact')) Dialogue.advance();
  else if (Input.pressed('cancel')) Dialogue.close();
}

function loop(now) { step(now); requestAnimationFrame(loop); }

// keep ticking when rAF is throttled (hidden/background tab)
setInterval(() => { const now = performance.now(); if (now - last > 250) step(now); }, 125);

/* -------------------------------- wiring -------------------------------- */
G.fx = new FX(SPR, drawSprite);

Input.hooks.onMute = () => {
  const on = toggleMute();
  if (G.state === 'play') say(on ? 'Sound: ON.' : 'Sound: MUTED. Blissful, billable silence.', 2);
};
Input.hooks.onFullscreen = toggleFullscreen;
Input.hooks.onZoom = z => (typeof z === 'number' ? setZoom(z) : cycleZoom());
Input.hooks.onWheel = dy => { if (G.state === 'play') setZoom(view.zoom * (dy > 0 ? 0.92 : 1.087)); };
Input.hooks.onCanvasTap = (x, y) => { if (G.state === 'intro') Intro.tap(x, y); };

el('fsBtn').addEventListener('click', toggleFullscreen);
el('startBtn').addEventListener('click', startNew);
el('continueBtn').addEventListener('click', continueGame);
el('saveBtn').addEventListener('click', () => say(doSave() ? 'Saved.' : 'Save failed.', 2));
if (hasSave()) el('continueBtn').style.display = '';
if (DEV) el('hDev').style.display = '';

// ?layer=floor jumps straight into a path without the reel — dev only
const q = new URLSearchParams(location.search).get('layer');
if (DEV && q && LAYERS[q]) { audioInit(); beginPath(q, q === 'floor' ? 'delete' : 'send'); }

requestAnimationFrame(loop);

// expose for the dev editor and for browser-console verification
window.LE2 = {
  G, Input, LAYERS, doSave, beginPath, loadGame, Facts, Quests, Practice,
  Dialogue, Casefile, talkTo, useProp, endDay,
  Hrs: { Hours, bill, lightUp, isLit, fmtHours, pressure },
  Clock: { Cal, dateString, allEntries, advanceDay, schedule, unschedule, resetClock },
};
