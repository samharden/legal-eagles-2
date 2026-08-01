"use strict";
// ============================== MAIN ==============================
// Boot, state machine, the play loop. Phase 0 scope: the opening fork, a player
// who can walk a seamless two-region city, interact, take things, hit things,
// and have all of that survive the region being evicted and rebuilt.

import { ctx, cam, camFollow, view, setZoom, cycleZoom, toggleFullscreen, TILE, W, H, C, IS_TOUCH, DEV } from '../engine/stage.js';
import { SPR, drawSprite } from '../engine/sprites.js';
import { Rig, FX } from '../engine/anim.js';
import { audioInit, musicTick, toggleMute, SFX, AU, SONGS } from '../engine/audio.js';
import * as Input from '../engine/input.js';
import { World, moveEntity } from '../engine/region.js';
import { saveGame, loadGame, hasSave } from '../engine/save.js';
import * as Facts from '../engine/facts.js';
import * as Quests from '../engine/quests.js';
import { Cal, clockHooks, dateString, schedule, unschedule, allEntries, advanceDay, saveClock, loadClock, resetClock } from '../engine/clock.js';
import * as Practice from '../engine/practice.js';
import { Hours, hoursHooks, bill, lightUp, lightFree, isLit, writeDown, fmtHours, pressure, pressureStep, saveHours, loadHours, resetHours } from '../engine/hours.js';
import { Bleed, bleedHooks, setBleed, witness, bleedAt, canCross, LEVEL_NAME, saveBleed, loadBleed, resetBleed } from '../engine/bleed.js';
import { recordRun, runs, lastRun, hasRun, nextPath, nextLayer } from '../engine/run.js';
import { walkInto, hasWalked, saveAtlas, loadAtlas, resetAtlas } from '../engine/atlas.js';
import { Dialogue } from '../engine/dialogue.js';
import { REGIONS, SPAWN } from './city.js';
import { LAYERS, layerOf } from './layers.js';
import { AREAS, DEFAULT_AREA, areaOf, importLE1 } from './areas.js';
import { actorDef } from './actors.js';
import { drawWorld, drawPrompt } from './render.js';
import { Intro } from './intro.js';
import { Ending, endingMeta } from './ending.js';
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
  // Seconds until the next arrival. Set for real in beginPath(), which every
  // route into play goes through — SPAWN_FIRST is declared far below this
  // object and reading it here would be a temporal-dead-zone crash at load.
  spawnT: 0,
  spawnSeq: 0,
  seenSpawn: {},        // types that have turned up this run, for the one-time line
  complaint: null,      // the Bar Complaint, once you have earned one
  allies: [],           // everybody on the payroll, walking with you
  dark: false,          // standing on an unlit floor
  bleedAmt: 0,          // how far through the district under you has gone
  boss: null,           // the live boss, if there is one — drives the HUD bar and the music
  shots: [],            // your argument, in the air
  incoming: [],         // theirs
  area: DEFAULT_AREA,   // your practice area — the ranged attack IS the area
  served: 0,            // stacking, and it does not come off until you sleep
  plus: 0,              // how many finished runs are behind this one
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
// Spin: strike reaches 28px on one bearing for 18; this reaches 54px on all of
// them for 26, and pays about three strikes of cooldown for the privilege.
const SPIN_R = 54, SPIN_DMG = 26, SPIN_CD = 1.15;

function makePlayer(x, y) {
  return {
    x, y, spr: 'p_f', face: { x: 0, y: 1 }, r: 14,
    hp: 100, maxhp: 100, moving: false,
    dashT: 0, dashCd: 0, meleeCd: 0, hurtCd: 0, fireCd: 0, spinCd: 0,
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
  bleedTick();
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
CASE_HOOKS.rent = n => {
  if (!HAS_CLOCK() || n === RENT) return;
  const was = RENT;
  RENT = n;
  scheduleRent();          // relabel every future rent day with the new figure
  showBanner(n < was ? 'RENT REDUCED' : 'RENT SET', `$${was} → $${n} A WEEK`);
  say(`Rent on Suite 2B is $${n} a week from now on. That is $${Math.abs(was - n) * 52} a year, in the direction it is going.`, 9);
  refreshCasefile(); syncHud();
};
CASE_HOOKS.rep = (d, n) => {
  if (!n) return;
  Practice.bumpRep(d, n);
  say(`Word gets around ${districtName(d)}.`, 3);
};
/**
 * The last thing that happens. `cases.js` decides WHICH of the seven; it has
 * never had an opinion about what an ending looks like and does not get one now.
 *
 * The Casefile is closed first because it is DOM and sits over the canvas — an
 * ending playing underneath an open matters list is the sort of thing nobody
 * finds until somebody records it.
 */
CASE_HOOKS.ending = outcome => {
  Casefile.hide();
  Input.clearHeld();
  // Written before the reel rather than after it, so a player who closes the tab
  // on the stamp card still finished the game. The record is what NEW GAME +
  // reads, and what puts this run's letter in the Annex boxes next time.
  const closed = Quests.allQuests().filter(q => Quests.isDone(q.id) && !Quests.isFailed(q.id)).length;
  recordRun({
    path: G.path, layer: G.layer, ending: outcome, area: G.area,
    plus: G.plus || 0,
    closed,
    lost: Quests.allQuests().filter(q => Quests.isFailed(q.id)).length,
    crossings: Practice.Books.commingled || 0,
    hours: Hours.billed,
    crossed: Bleed.crossed,
    bleed: Bleed.level,
    days: HAS_CLOCK() ? Cal.day : 0,
  });
  G.state = 'end';
  Ending.start(outcome, () => {
    // The reel is over; the accounting is not. The summary opens over the top of
    // the close card and is the last thing the run does, so IT is what returns
    // the player to the title rather than the reel.
    G.state = 'summary';
    Input.clearHeld();     // the key that dismissed the reel must not also close this
    Casefile.onSummaryClose = () => {
      G.state = 'menu';
      Casefile.onSummaryClose = null;
      document.body.classList.remove('reel');
      document.getElementById('menu').style.display = '';
      document.getElementById('hud').style.display = 'none';
      // The save is left exactly as it was — a finished run is a thing you
      // should be able to load and stand around in, and there is a whole city
      // that reads differently once you know how it comes out.
      if (hasSave()) el('continueBtn').classList.add('on');
      // the run that just ended is on the record now, so the offer to press the
      // other key has to appear without needing a reload
      syncPlusButton();
    };
    Casefile.showSummary(outcome);
  });
};

/** The city is the one place district names live. Nothing else spells them. */
export function districtName(id) {
  const r = REGIONS.find(x => x.id === id);
  return r ? r.name : id;
}

function refreshCasefile() { if (Casefile.open) Casefile.render(G.layer); }

// Where the map should put the dot. Global tiles, because that is the only
// coordinate space this city has.
Casefile.hooks.player = () => {
  if (!G.player || !G.world) return null;
  const gx = Math.floor(G.player.x / TILE), gy = Math.floor(G.player.y / TILE);
  const b = G.world.regionAt(gx, gy);
  return { gx, gy, region: b ? b.id : null };
};

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

/** The layer you are not on. Two callers, and both would get it wrong once. */
const OTHER_LAYER = () => (G.layer === 'street' ? 'floor' : 'street');

/* ================================ THE BLEED ============================== */
// DESIGN §2's crossover, and it is deliberately not a story flag. The level is
// DERIVED from matters closed, so a save cannot disagree with the docket about
// how far in the player is, and the gates are the same two districts on both
// paths — the Tower, then the Annex, then your own finale.
//
// The symmetry is the whole reason these particular matters were chosen:
// `retrieval` and `reviews` are both the Tower District, which is DC&H on one
// layer and the desk you woke at on the other. `sealed` and `sublevel` are
// both the Annex and both about the four hundred letters. A player on either
// path meets the bleed in the same building at the same depth.
const BLEED_GATES = [
  { at: 1, when: () => Quests.isDone('retrieval') || Quests.isDone('reviews') },
  { at: 2, when: () => Quests.isDone('sealed') || Quests.isDone('sublevel') },
  { at: 3, when: () => Quests.isDone('withdrawal') || Quests.isDone('thefirm') },
];

/** Re-derive the level. Cheap, and called only when a matter closes or loads. */
function bleedTick() {
  for (const g of BLEED_GATES) if (Bleed.level < g.at && g.when()) setBleed(g.at);
}

const BLEED_LINES = [
  '',
  'The colour of the light changed while you were not looking at it, and it has not changed back. Nothing else about the street is different, which is the part that will keep you up.',
  'There is a door in this building that is not in this building. You have walked past the wall it is in perhaps two hundred times.',
  'It is open. It has been open for some time and you have been the thing that was shut.',
];

bleedHooks.onLevel = (n) => {
  showBanner('THE BLEED — ' + LEVEL_NAME[n], n >= 3 ? 'YOU CAN GO THROUGH' : 'IT IS COMING THROUGH');
  say(BLEED_LINES[n] || BLEED_LINES[BLEED_LINES.length - 1], 11);
  G.fx.addTrauma(0.5);
  SFX.del();
  // Content gated on the level has to come into being, and props are resolved
  // at build time — so every resident region is dropped and rebuilt through the
  // gate. Without this the door that shouldn't exist appears the next time you
  // happen to walk far enough away to evict the district, which is nowhere.
  if (G.world) { G.world.rebuild(); G.world.update(G.player.x, G.player.y); }
  refreshCasefile(); syncHud();
};

// what work is worth, in tenths of an hour
const BILL_FACT = 3;      // 0.3 — a fact established
const BILL_PROP = 1;      // 0.1 — something read for the first time
const BILL_MATTER = 40;   // 4.0 — a matter closed
// Energy per second on an unlit floor. Was 1.7, which emptied a full bar in
// fifty-nine seconds — enough to CROSS a dark district and not remotely enough
// to look at one, so the layer's own content was behind a timer nobody could
// beat. At 0.4 a full bar is about four minutes in the dark: still a clock, still
// the argument for paying the panel, but long enough to read what is down there.
const DARK_DRAIN = 0.4;
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

// Rent is a LET. Winning The Lease actually moves it — a matter whose reward
// is a permanent change to your overhead is worth more than any fee in the
// game, and it should be the number on the docket that changes, not a coupon.
let RENT = 1100;
const RENT_EVERY = 7;
const ALLY_SPD = 190;
// RANGE is measured from the employee, not from you, and comfortably outstrips
// the distance they stand off at — they answer anything that has got near you
// without having to leave your shoulder to do it.
// TURN is the facing deadzone: below it the sprite keeps the way it was already
// pointing. See the note in the payroll block; it is what stopped the spinning.
const ALLY_CD = 1.05, ALLY_RANGE = 340, ALLY_SHOT_SPD = 430;
const ALLY_HOLD = 16, ALLY_TURN = 26, ALLY_COLOR = '#c9a2e0';
// Where each of them walks. Without a per-person slot a firm of three occupies
// one pixel and reads as a single smeared employee.
const ALLY_SLOTS = [{ x: -44, y: 26 }, { x: 44, y: 26 }, { x: 0, y: 48 }];

function scheduleRent() {
  unschedule('rent');
  for (let i = 1; i <= 12; i++)
    schedule({ day: Cal.day + i * RENT_EVERY, ref: 'rent', kind: 'rent', label: `Rent — Suite 2B ($${RENT})` });
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
function beginPath(layerId, path, area, plus = 0, look = null) {
  G.path = path;
  G.layer = layerId;
  G.plus = plus;
  Facts.resetFacts();
  Quests.resetQuests();
  G.world = new World(REGIONS, layerId);
  // Anything authored with a `bleed` is not in the world until the layers have
  // come apart that far. One line, and it is the whole of how Phase 4's content
  // knows when it exists.
  G.world.gate = e => e.bleed == null || Bleed.level >= e.bleed;
  G.world.onEnter = (def, built) => {
    const L = built.layerData;
    const unlit = G.layer === 'floor' && !isLit(def.id);
    // onEnter fires exactly once per arrival, which makes it the one honest
    // place to record that you have actually been somewhere.
    walkInto(G.layer, def.id);
    showBanner(def.name, layerOf(G.layer).name + (unlit ? ' · UNLIT' : ''));
    // a district you have not paid for describes itself differently, and the
    // line you get after you light it is the one that was always written for it
    const line = (unlit && L.greetDark) || L.greet;
    if (line) say(line, 6);
    SFX.district();
    Quests.questEvent('reach', { region: def.id });
  };
  // Both of these come from the reel, which ASKED. An LE1 save is only a
  // fallback for the dev `?layer=` jump, which skips the reel entirely — it is
  // no longer allowed to decide anything a player was going to be asked.
  const le1 = importLE1();
  G.area = (area && AREAS[area]) ? area : (le1 ? le1.area : DEFAULT_AREA);
  const s = SPAWN[layerId];
  G.player = makePlayer(s.x, s.y);
  G.player.spr = SPR[look] ? look : (le1 ? le1.spr : G.player.spr);
  say(`${areaOf(G.area).name}. ${areaOf(G.area).attack}. It is what you put in the letter and it is what you have.`, 8);
  G.carried = [];
  G.complaint = null;
  G.allies = [];
  G.spawnT = SPAWN_FIRST;
  G.seenSpawn = {};
  G.incoming = [];
  G.shots = [];
  G.served = 0;
  resetClock();
  Practice.resetPractice();
  Practice.seedRep(REGIONS.map(r => r.id));
  resetHours();
  resetBleed();
  resetAtlas();
  if (layerId === 'street') {
    Practice.post(4100, 'Opening balance — everything you had', 'operating', 1);
    scheduleRent();
  }
  if (layerId === 'floor') seedFreeLights();
  G.world.update(s.x, s.y);
  camFollow(s.x, s.y);
  G.state = 'play';
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = '';
  Quests.qTick();      // opens whichever matter this path starts with
  syncHud();
}

/**
 * Wherever you wake up is already on the lights, and nowhere else is. The region
 * declares it rather than main.js hard-coding a district, because there are six
 * of these and only one is free.
 *
 * Called from beginPath on Path B — and again the first time a Path A player
 * crosses over, because they did not wake up here and would otherwise arrive on
 * a floor with no lit district anywhere and no banked hours to light one with.
 * `lightFree` is idempotent, so calling it twice costs nothing.
 */
function seedFreeLights() {
  for (const def of REGIONS)
    if (def.layers.floor && def.layers.floor.litFree) lightFree(def.id);
}

/**
 * A new run. `plus` forces the fork to the key the last run did not press —
 * DESIGN §3 says both paths are full-length campaigns, so a second run is the
 * other side of the fork rather than the same side with the numbers turned up.
 *
 * The reel still runs, and EXHIBIT C still asks what kind of lawyer you are.
 * Only the fork is spent, and the reel says so.
 */
function startNew(plus = false) {
  audioInit();
  document.getElementById('menu').style.display = 'none';
  G.state = 'intro';
  const depth = plus ? runs().length : 0;
  Intro.start((layerId, path, area, look) => beginPath(layerId, path, area, depth, look),
    plus ? { forcePath: nextPath(), prev: lastRun() } : null);
}

function continueGame() {
  audioInit();
  const d = loadGame();
  if (!d) { startNew(); return; }
  beginPath(d.layer, d.path);
  G.player.x = d.x; G.player.y = d.y;
  G.player.hp = d.hp ?? 100;
  G.carried = d.carried || [];
  if (d.area && AREAS[d.area]) G.area = d.area;
  if (d.look && SPR[d.look]) G.player.spr = d.look;
  // restore knowledge, matters, the docket and the books BEFORE residency, so
  // quest markers and already-read props come back in the right state
  Facts.loadFacts(d.facts);
  Quests.loadQuests(d.quests);
  loadClock(d.clock);
  Practice.loadPractice(d.practice);
  Practice.seedRep(REGIONS.map(r => r.id));   // a save made before a district existed
  if (d.hours) loadHours(d.hours);
  loadBleed(d.bleed);
  loadAtlas(d.atlas);
  bleedTick();                                // a save made before a gate existed
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
  syncAllies();
  syncHud();
  say(`Representation resumed. ${dateString()}.`, 4);
}

export function doSave() {
  if (G.state !== 'play') return false;
  return saveGame({
    layer: G.layer, path: G.path,
    x: G.player.x, y: G.player.y, hp: G.player.hp,
    carried: G.carried,
    area: G.area,
    // never saved before, so a chosen face was silently replaced by the LE1
    // import (or the default) every time a save was loaded
    look: G.player.spr,
    facts: Facts.saveFacts(),
    quests: Quests.saveQuests(),
    clock: saveClock(),
    practice: Practice.savePractice(),
    hours: saveHours(),
    bleed: saveBleed(),
    atlas: saveAtlas(),
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
    // A choice's `fx` may have moved the game somewhere else entirely — picking
    // an ending does exactly that, from inside this conversation. The only
    // state this handler owns is the conversation's own, so restoring 'play'
    // unconditionally would stomp whatever the choice just did.
    if (G.state === 'dialog') G.state = 'play';
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
    // see openDialogue: a choice may have ended the game from in here
    if (G.state === 'dialog') G.state = 'play';
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

  // Anything authored with a `bleed` IS the bleed evidence for its district, so
  // reading it is what makes that district start showing the other side. This
  // is the difference between a bleed that happens to you on a schedule and one
  // you go and find: the level is global, the intensity is where you have been.
  if (pr.bleed && witness(pr.region)) {
    showBanner(districtName(pr.region), 'IT IS IN THIS ONE TOO');
    G.fx.addTrauma(0.3);
    if (G.world) { G.world.rebuild(); G.world.update(G.player.x, G.player.y); }
  }

  // ...and then the PRESENTATION half.
  if (pr.lights) return openPanel(pr);
  if (pr.office) return openOffice(pr);
  if (pr.cross) return openCrossing(pr);
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
      + `\nUnder the line, in the same hand as everything else here: THE LIGHTS RUN AS LONG AS THE WORK DOES.`,
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
    text: 'You write the hours in. You leave the matter number blank, because there is no matter. The lights come on anyway.',
  };
  openDialogue(T);
}

/* --------------------------- crossing over ------------------------------ */

/**
 * A crossing. It is authored ONCE per district and appears in both layers at
 * the same tile, because it is the same physical thing seen from either side —
 * the door behind the bench in Department 13 is the door behind the bench in
 * Department 13. `tools/check.mjs` enforces the pairing, because a one-sided
 * crossing is a one-way trip into a district with no way back out of it.
 *
 * Like the lighting panel it is a conversation rather than a keypress. Going
 * through is the largest decision left in the game and it should cost the
 * player a sentence every time, not become a hotkey by the fourth crossing.
 */
function openCrossing(pr) {
  const T = { who: pr.who || 'THE WAY THROUGH', spr: 'sign', start: 'a', nodes: {} };
  const other = layerOf(OTHER_LAYER());

  if (!canCross()) {
    // It is there before it works, which is the point of it being there. You
    // are meant to have found this and been unable to use it.
    T.nodes.a = {
      text: (pr.text || 'A door that is not in this building.')
        + '\n\nIt does not open. Not locked — no lock, no handle, no give at all. The air on the far side is a different temperature and you can feel it through the door.',
    };
    openDialogue(T);
    return;
  }

  T.nodes.a = {
    text: (pr.text || 'A door that is not in this building.')
      + `\n\nIt is open now. Through it is ${other.name} — the same street, the same buildings, none of it dressed the way this one is.`,
    choices: [
      { tag: 'THROUGH', label: `Go through. Cross to ${other.name}.`, to: 'go' },
      { label: 'Not yet. Shut it.', to: null },
    ],
  };
  T.nodes.go = {
    text: 'You go through. No step down, no threshold, no moment of being in neither. One stride is here and the next is there, and your footfall does not change pitch.',
    fx: () => crossLayers(),
  };
  openDialogue(T);
}

/**
 * Change layer in place. Position, energy, what you are carrying, the grievance
 * and the paralegal all come with you; the world does not.
 *
 * Everything else that had to be true for this was already true before Phase 4
 * touched it, which is the payoff of the two layers having been kept genuinely
 * separate: deltas are keyed by layer so the other side's dead stay dead,
 * `layerOk` opens the other docket and no more of it than its prereqs allow,
 * and HAS_CLOCK/HAS_HOURS are one-line predicates on G.layer, so the day stops
 * and the timesheet starts without a single system being told about it.
 */
function crossLayers() {
  const to = OTHER_LAYER();
  const p = G.player;
  G.layer = to;
  G.world.setLayer(to);
  if (to === 'floor') seedFreeLights();
  // paper in the air belonged to the world you left
  G.incoming.length = 0; G.shots.length = 0;
  G.world.update(p.x, p.y);
  Bleed.crossed++;

  showBanner(layerOf(to).name, `CROSSING #${Bleed.crossed}`);
  say(to === 'floor'
    ? 'The date on your watch has not moved, and it will not while you are here. The only currency on this side is the time you put in.'
    : 'A Tuesday, four in the afternoon, and a bus goes past. Your rent is still due. You have never been so glad about a bus.', 11);
  SFX.district();
  G.fx.addTrauma(0.6);
  Quests.qTick();          // whatever this layer opens with, if anything
  refreshCasefile(); syncHud();
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
  G.incoming.length = 0; G.shots.length = 0;
  if (Practice.hasStaff('associate')) associateWorks();

  // Evicted, you can still end the day — blocking it would soft-lock the game,
  // since ending days is how you get to the work that pays the arrears. You
  // just sleep worse.
  const roofless = !Practice.Office.held;
  G.player.hp = roofless ? Math.round(G.player.maxhp * 0.55) : G.player.maxhp;

  const d = Cal.day;
  showBanner(dateString(d), forced ? 'you lost the rest of yesterday' : `DAY ${d}`);
  if (!forced) say(roofless
    ? `${dateString(d)}. You slept in the firm car with the files in the footwell. You will feel it until Thursday.`
    : `${dateString(d)}. You slept about four hours. Two more than the firm ever allowed.`, 6);
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
    text: `Rent. Eleven hundred, weekly, cash. The man who collects it does not come upstairs. He waits at the bottom of the stairs.\n\nOperating: $${Practice.Books.operating}.   Trust: $${Practice.Books.trust}.`,
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
  T.nodes.paid = { text: 'He counts it twice on the step, nods, and goes back inside.' };
  T.nodes.trustWarn = {
    text: 'Same bank, different word on the account. Delgado will not look at it this week. Nobody looks at it any week. That is why it works.',
    choices: [
      { label: 'Do it.', fx: () => doCommingle(owed), to: 'didIt' },
      { label: 'Don\'t. Tell him next week.', to: 'miss' },
    ],
  };
  T.nodes.didIt = { text: 'The transfer takes eleven seconds. You are current on the rent, and you are holding less of your client\'s money than you are supposed to be holding.' };
  T.nodes.miss = {
    text: 'He does not argue. He writes something on the back of his hand and goes back inside.',
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
    text: `Friday, near enough. ${who} — $${owed} between them. None of them has asked you about it.\n\nOperating: $${Practice.Books.operating}.   Trust: $${Practice.Books.trust}.`,
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
    text: 'The same button as last time. It is easier this time. That money belongs to people who are not in this room.',
    choices: [
      { label: 'Do it.', fx: () => doCommingle(owed), to: 'didIt' },
      { label: 'Don\'t. Tell them Monday.', to: 'miss' },
    ],
  };
  T.nodes.didIt = { text: 'Payroll is made. Three people go home able to make their own rent, on money that was not yours.' };
  T.nodes.miss = {
    text: 'They take it well, which tells you how often it has happened to them before. By the end of the week the desks are clear.',
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
    text: 'Three names. Each of them is somebody\'s whole month.\n'
      + 'Whoever you take on walks out of the building with you. What they are worth in a doorway is what you paid for them.',
    choices: () => {
      const out = Object.values(Practice.STAFF).map(s => ({
        label: `${s.name} — ${s.role}. $${s.hire} now, $${s.wage} a week. Throws for ${Practice.staffPower(s)}. ${s.effect}`,
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

/**
 * Everybody on the payroll, in the world. Derived from Firm.staff, never saved.
 *
 * It used to be one person: the paralegal, because DESIGN §3 gave her the combat
 * line and gave the other two paperwork. But a receptionist who is at the office
 * while you are on the courthouse steps is a line item you never see, and this
 * is a game about what a payroll costs. So they all come with you, and the hire
 * fee is the swing — see Practice.staffPower.
 */
function syncAllies() {
  if (!G.player) { G.allies = []; return; }
  G.allies = G.allies.filter(al => Practice.hasStaff(al.id));
  Practice.Firm.staff.forEach((id, i) => {
    if (G.allies.some(al => al.id === id)) return;
    const s = Practice.STAFF[id], p = G.player;
    const slot = ALLY_SLOTS[i % ALLY_SLOTS.length];
    const al = {
      id, spr: SPR[s.spr] ? s.spr : 'paralegal', dmg: Practice.staffPower(s),
      x: p.x + slot.x, y: p.y + slot.y, rig: new Rig(), cd: 0, face: 1,
    };
    al.rig.spawn();
    G.allies.push(al);
  });
}

Practice.practiceHooks.onHire = s => {
  schedulePayroll();
  syncAllies();
  showBanner('ENGAGED', `${s.name.toUpperCase()} — ${s.role.toUpperCase()}`);
  say(`${s.name} starts Monday, and wants paying every week after that. That is the part nobody mentions.`, 8);
  syncHud(); refreshCasefile();
};
Practice.practiceHooks.onLoseStaff = gone => {
  unschedule('payroll');
  syncAllies();
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
  say('Two weeks down and the lock is changed. Your files are in four boxes on the sidewalk.', 10);
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
    say('You come to on the sidewalk, your own business cards scattered around you, no memory of the afternoon.', 8);
    endDay(true);
  } else {
    // No day to lose here, so the building takes the only thing this layer has.
    // It does not credit you for the time you were out; it charges you for it,
    // and the entry is already written when you come round.
    const took = writeDown(COLLAPSE_TAKE, 'non-productive time, written off');
    say(took
      ? `You come to at the same desk. The clock has not moved. ${fmtHours(took)} hours have gone off the sheet and the entry is in your handwriting.`
      : 'You come to at the same desk. There was nothing on the sheet to take.', 9);
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
  say('The trust account is whole. The grievance closes without a finding.', 8);
}

/**
 * One actor, off the board. Everything that follows from a thing going down
 * lives here and nowhere else, because it is not always you that did it — the
 * payroll throws paper too, and its shots resolve through the same
 * updateFired() your own do. A quest stage that only counted YOUR kills would
 * be a bug nobody would find until the district that needs a kill stage.
 */
function downActor(a, d) {
  G.fx.stamp(a.x, a.y - 10, d.harmless ? 'EXCUSED' : 'DISMISSED', d.harmless ? '#9be05e' : C.red);
  SFX.die();
  G.world.killActor(a);              // <- the delta: this one stays gone
  // Arrivals do not close matters. A kill stage names a specific thing standing
  // in a specific place — the covenant in the plaza, the third review — and a
  // faucet that can hand you a past_junior anywhere would let the docket clear
  // itself while you stood still.
  if (!a.transient) Quests.questEvent('kill', { enemy: a.type });
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
  // a boss is not scenery — it is not in the plaza until the matter that
  // summons it is open, and it is gone the moment that matter closes
  sued: () => Quests.isActive('withdrawal'),
  sublevelopen: () => Quests.isActive('thefirm'),
  // Tighter than the other two on purpose. In re Yourself opens on your first
  // crossing and its first stage sends you to two more districts to find the
  // other doors — a 380hp boss with a 1000px chase radius standing in the
  // square for all of that is not tension, it is a commute. It is on the board
  // for exactly the stage that asks you to put it down.
  yourselfopen: () => {
    const s = Quests.currentStage('yourself');
    return !!s && s.type === 'kill';
  },
};
const actorAwake = d => !d.needs || !ACTOR_NEEDS[d.needs] || ACTOR_NEEDS[d.needs]();

/* ---------------------------- arrivals ---------------------------------- */
// Until now every enemy in the game was authored into a region and stayed dead
// once you put it down, so a district you had cleared was a district that was
// over. Nine days into a practice the city was emptier than it was on day one,
// which is the opposite of how any of this goes.
//
// So the opposition also ARRIVES. Not waves and not a horde — a slow faucet,
// off-screen, that opens as you get further in. What "further in" means is
// heat(): matters closed, how far the bleed has come, and time (days on the
// street, billed hours on the floor). At heat 0 that is one process server
// every twenty-odd seconds and never more than two on the board. At heat 1 it
// is one every seven and up to nine, out of a roster that has grown.

const SPAWN_FIRST = 30;              // grace at the top of a run
const SPAWN_EVERY = [26, 7];         // seconds between arrivals, cold .. hot
const SPAWN_CAP = [2, 9];            // how many arrivals may stand on the board
const SPAWN_MIN = 340, SPAWN_MAX = 780;
// `ramp`, not `lerp`: engine/anim.js already has a top-level lerp, and the
// bundler flat-concatenates modules, so a second one is a redeclaration.
const ramp = (a, b, t) => a + (b - a) * t;

// `at` is the heat the type unlocks at. Deliberately absent: the Landlord and
// every boss (they are `needs`-gated events, not weather), and the Ambulance
// Chaser. She costs you a day off a deadline in whatever district she reaches,
// and one of those arriving unannounced two streets away is a tax you cannot
// see coming. She stays where the design put her.
const SPAWN_POOL = {
  street: [
    { type: 'server', at: 0 },
    { type: 'collections', at: 0.22 },
    { type: 'depo', at: 0.45 },
    { type: 'retrieval', at: 0.62 },
  ],
  floor: [
    { type: 'unbilled', at: 0 },
    { type: 'stayed', at: 0.30 },
    { type: 'past_junior', at: 0.52 },
    { type: 'past_counsel', at: 0.74 },
    { type: 'past_partner', at: 0.90 },
  ],
};

// Said once per run, the first time each one turns up. A difficulty ramp nobody
// is told about is just a game that got harder for no reason.
const SPAWN_LINE = {
  server: 'Somebody at the corner is holding a folded paper and checking a photograph.',
  collections: 'A second car has been parked across the street all morning.',
  depo: 'A notice went up on the wall behind you. It has your name on it and a date.',
  retrieval: 'Two people from the firm are on this street and they are not here for the coffee.',
  unbilled: 'Something on this floor is itemising you.',
  stayed: 'A desk lamp came on down the corridor. Somebody is at it.',
  past_junior: 'You know that walk. You had that walk.',
  past_counsel: 'She has read everything you are about to say. She read it when you did.',
  past_partner: 'The one who made partner is on this floor and he is not sorry.',
};

/** How far in you are, 0..1. Drives everything the faucet decides. */
function heat() {
  const closed = Quests.allQuests().filter(q => Quests.isDone(q.id)).length;
  const time = HAS_HOURS() ? pressureStep() * 0.06 : (Cal.day - 1) * 0.02;
  return Math.min(1, closed * 0.13 + Bleed.level * 0.11 + time);
}

/**
 * Somewhere to put one: standing room, inside a district that is actually
 * built, and off the edge of the screen. `view` is the visible board in world
 * pixels and it changes with the zoom, so this reads it rather than assuming a
 * radius — at 3x zoom a fixed 340px ring is comfortably on camera.
 */
function findSpawnPoint(world, p) {
  for (let i = 0; i < 26; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    const x = p.x + Math.cos(ang) * rad, y = p.y + Math.sin(ang) * rad;
    if (Math.abs(x - p.x) < view.w / 2 + 40 && Math.abs(y - p.y) < view.h / 2 + 40) continue;
    const b = world.regionAt(Math.floor(x / TILE), Math.floor(y / TILE));
    if (!b) continue;
    // room to stand AND room to leave. A spawn wedged in a doorway is a fight
    // you have one tile at a time, which flatters nobody.
    if (world.solidAtPx(x, y)) continue;
    if (world.solidAtPx(x - 16, y) || world.solidAtPx(x + 16, y)) continue;
    if (world.solidAtPx(x, y - 16) || world.solidAtPx(x, y + 16)) continue;
    return { x, y, region: b.id };
  }
  return null;
}

function stepSpawner(dt, world) {
  // A boss is a duel. LE1 threw chaff into its boss rooms and the fights were
  // worse for it: you cannot read a pattern through a crowd.
  if (G.boss) return;

  G.spawnT -= dt;
  if (G.spawnT > 0) return;
  const h = heat();
  // jittered, so arrivals do not land on a metronome
  G.spawnT = ramp(SPAWN_EVERY[0], SPAWN_EVERY[1], h) * (0.7 + Math.random() * 0.6);

  let live = 0;
  for (const a of world.allActors()) if (a.transient) live++;
  if (live >= Math.round(ramp(SPAWN_CAP[0], SPAWN_CAP[1], h))) return;

  const pool = (SPAWN_POOL[G.layer] || []).filter(e => h >= e.at);
  if (!pool.length) return;
  const type = pool[(Math.random() * pool.length) | 0].type;
  const d = actorDef(type);
  const at = findSpawnPoint(world, G.player);
  if (!at) return;

  world.addActor(at.region, { type, id: `arr${G.spawnSeq++}`, x: at.x, y: at.y, hp: d.hp });
  if (!G.seenSpawn[type] && SPAWN_LINE[type]) {
    G.seenSpawn[type] = true;
    say(SPAWN_LINE[type], 7);
  }
}

/**
 * Fill in what the engine cannot know about a freshly built actor: what it is
 * worth, and whether it is on the board at all. region.js leaves `hp` null on
 * purpose — it has no actor table — and it knows nothing about `needs`, so a
 * new actor arrives with `hp: null` and NO `asleep` property. render.js's guard
 * is `if (a.asleep) continue`, and that does not skip `undefined`.
 *
 * Harmless while the play update is running, because it sets both before
 * anything is drawn. Not harmless on a CROSSING: crossLayers() rebuilds the
 * world and says its piece in the same breath, and the dialog branch draws the
 * world WITHOUT running the play update. So THE PARTY OF THE SECOND PART stood
 * in Courthouse Square for exactly as long as the door's message was open, and
 * went out on the first play frame after it — a boss that appears when you
 * cross and vanishes when you close the message.
 *
 * Runs ahead of the state branch so no drawing path can get in front of it, and
 * fills only what is unset: the play update still re-evaluates `asleep` every
 * frame, and a conversation still does not dismiss the boss standing behind it.
 */
function initActors(world) {
  for (const a of world.allActors()) {
    const d = actorDef(a.type);
    if (a.hp == null) a.hp = d.hp;
    if (a.asleep === undefined) a.asleep = !actorAwake(d);
  }
}

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

/**
 * What a Past Self throws. It is your own attack, aimed back at you, at about
 * two-thirds the damage and half the rate — the point is recognition, not a
 * mirror match. A litigator's Past Selves object at them constantly; a tax
 * lawyer's arrive slowly and hit like a filing deadline.
 */
function pastAttack() {
  const A = areaOf(G.area);
  return {
    dmg: Math.max(6, Math.round(A.dmg * 0.7)),
    speed: A.speed * 0.55,
    every: Math.max(0.9, A.cd * 3.4),
    life: 3.0,
    label: A.attack.toUpperCase(),
  };
}

/* ------------------------------ THE ARGUMENT ---------------------------- */
// LE1's ranged weapon was never a weapon — it was your PRACTICE AREA, and what
// came out when you pressed the button was the argument that area actually
// makes. That is ported whole. `game/areas.js` holds the five.

/**
 * Fire. Aims at the cursor on desktop when the mouse is over the board, and
 * otherwise along the way you are facing, which is what makes this playable on
 * a pad and a phone as well as with a mouse — the same call LE1 made.
 */
function fire() {
  const p = G.player;
  if (p.fireCd > 0) return;
  const A = areaOf(G.area);
  p.fireCd = A.cd;

  // Mouse aim wins and turns you into the shot. Keyboard and pad keep the
  // facing they already had, so the same button is a twin-stick trigger, an
  // aim-at-cursor click and an 8-way key depending on what you are holding.
  if (Input.mouse.down && Input.mouse.over && !IS_TOUCH) {
    const w = Input.mouseWorld();
    if (Math.hypot(w.x - p.x, w.y - p.y) > 4) {
      const a = Math.atan2(w.y - p.y, w.x - p.x);
      p.face = { x: Math.cos(a), y: Math.sin(a) };
    }
  }

  const ang = Math.atan2(p.face.y, p.face.x);
  G.fx.muzzle(p.x + p.face.x * 18, p.y + p.face.y * 18, ang, A.color);
  SFX.shoot(A.id);
  p.rig.strike();

  const mk = a => G.shots.push({
    x: p.x, y: p.y, vx: Math.cos(a) * A.speed, vy: Math.sin(a) * A.speed,
    dmg: A.dmg, r: A.size, color: A.color, homing: A.special === 'homing',
    life: 1.6, hit: new Set(),
  });

  if (A.special === 'nova') for (let i = 0; i < A.count; i++) mk(i / A.count * Math.PI * 2);
  else if (A.special === 'spread') for (let i = 0; i < A.count; i++) mk(ang + (i - (A.count - 1) / 2) * 0.16);
  else mk(ang);

  if (A.shout && (A.special === 'nova' || Math.random() < 0.25))
    G.fx.number(p.x, p.y - 26, A.shout, A.color);
}

/** Your shots. Pierce is off, so each one stops on the first thing it convinces. */
function updateFired(dt) {
  const world = G.world;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    // Cease & Desist finds you. A gentle steer, not a lock — it should feel
    // like a letter that knows your address, not a missile.
    if (s.homing) {
      let best = null, bd = 260;
      for (const a of world.allActors()) {
        if (a.asleep || actorDef(a.type).harmless) continue;
        const d = Math.hypot(a.x - s.x, a.y - s.y);
        if (d < bd) { bd = d; best = a; }
      }
      if (best) {
        const want = Math.atan2(best.y - s.y, best.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        let dA = want - cur;
        while (dA > Math.PI) dA -= Math.PI * 2;
        while (dA < -Math.PI) dA += Math.PI * 2;
        const na = cur + Math.max(-3.2 * dt, Math.min(3.2 * dt, dA));
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
      }
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.life <= 0 || world.solidAtPx(s.x, s.y)) {
      if (s.life > 0) G.fx.spark(s.x, s.y, 2);
      G.shots.splice(i, 1); continue;
    }
    let done = false;
    for (const a of [...world.allActors()]) {
      if (a.asleep) continue;
      const d = actorDef(a.type);
      // Yours pass through nobody. The payroll's `spare` them: staff fire on
      // their own initiative, constantly, and a receptionist putting a client
      // down in the street because he wandered into the line is not a decision
      // you made. Your own shots keep hitting whatever you point them at.
      if (s.spare && d.harmless) continue;
      if (Math.hypot(a.x - s.x, a.y - s.y) > d.r + s.r) continue;
      if (a.hp == null) a.hp = d.hp;
      a.hp -= s.dmg;
      (a.rig || (a.rig = new Rig())).hurt(Math.sign(s.vx), Math.sign(s.vy));
      G.fx.number(a.x, a.y - d.r - 6, s.dmg, s.color);
      G.fx.spark(a.x, a.y, 3);
      SFX.hit();
      if (a.hp <= 0) downActor(a, d);
      done = true; break;
    }
    if (done) G.shots.splice(i, 1);
  }
}

/** Paper in the air. Expires on its own; nothing here needs a pool. */
function updateShots(dt) {
  const p = G.player;
  for (let i = G.incoming.length - 1; i >= 0; i--) {
    const s = G.incoming[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
    if (s.t <= 0 || G.world.solidAtPx(s.x, s.y)) { G.incoming.splice(i, 1); continue; }
    if (Math.hypot(s.x - p.x, s.y - p.y) < p.r + 10) {
      G.incoming.splice(i, 1);
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

/**
 * Which song the game wants right now. A live boss takes the music the same way
 * it takes the objective line — everything else you were doing can wait — and
 * In re Yourself gets its own, because it is the only fight in the game that is
 * about both layers at once and the track is built that way.
 */
function currentTrack() {
  if (G.boss && G.boss.hp > 0) return G.boss.type === 'yourself' ? 'yourself' : 'boss';
  return layerOf(G.layer).music;
}

/** The nearest awake boss, if one is on the board. Drives the HUD bar. */
function bossInPlay() {
  if (!G.world || !G.player) return null;
  for (const a of G.world.allActors()) {
    const d = actorDef(a.type);
    if (d.boss && !a.asleep && a.hp != null) return a;
  }
  return null;
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
  if (p.fireCd > 0) p.fireCd -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;
  if (p.spinCd > 0) p.spinCd -= dt;

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
  // Read once a frame and kept on G: the HUD, the renderer and the music all
  // want this and none of them should be recomputing it for themselves.
  G.bleedAmt = here ? bleedAt(here.id) : 0;
  G.dark = HAS_HOURS() && !!here && !isLit(here.id);
  if (G.dark) {
    p.hp -= DARK_DRAIN * dt;
    if (Math.random() < dt * 0.14)
      fx.bark(p.x, p.y - 44, DARK_BARKS[(Math.random() * DARK_BARKS.length) | 0], '#6f6a86', 2.6);
    if (p.hp <= 0) collapse();
  }

  // --- actor hp and roster gating: see initActors(), which runs every frame
  // ahead of the state branch. It used to be done here, which meant a world
  // built during a state that does not run this update was drawn uninitialised.

  // --- who else turned up ---
  stepSpawner(dt, world);

  // --- fire ---
  // Held, not tapped: LE1's attacks are all automatic and the cooldown IS the
  // rate of fire. Tapping a 0.26s litigation attack would be miserable.
  if (Input.down('fire')) fire();
  updateFired(dt);

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

  // --- spin ---
  // The rig has had a `spin` state since the animation pass and the input layer
  // has had the binding, but nothing ever connected the two, so the SPIN button
  // on the thumb shelf was decoration. It is the answer to being SURROUNDED,
  // which is the one thing strike is bad at: strike is a 28px circle thrown 32px
  // along your facing and it can only ever answer one direction at a time.
  //
  // So: everything within reach, no facing, knocked outward from you rather than
  // away from your nose. It hits harder than strike and costs a long cooldown —
  // roughly three strikes' worth — so it stays the thing you spend when you are
  // in trouble rather than the button you lean on.
  if (Input.pressed('spin') && p.spinCd <= 0) {
    p.spinCd = SPIN_CD; p.rig.spin();
    let hit = false;
    for (const a of [...world.allActors()]) {
      const d = actorDef(a.type);
      const dx = a.x - p.x, dy = a.y - p.y, m = Math.hypot(dx, dy);
      if (m < d.r + SPIN_R) {
        // dead-centre overlap has no direction to be thrown in; pick your facing
        const kx = m > 0.001 ? dx / m : p.face.x, ky = m > 0.001 ? dy / m : p.face.y;
        a.hp -= SPIN_DMG; hit = true;
        (a.rig || (a.rig = new Rig())).hurt(kx, ky, 1.35);
        moveEntity(world, a, kx * 240 * 0.11, ky * 240 * 0.11, d.r);
        fx.number(a.x, a.y - d.r - 6, SPIN_DMG, '#f0c75e');
        fx.spark(a.x, a.y, 5);
        if (a.hp <= 0) downActor(a, d);
      }
    }
    SFX.melee(); SFX.dash();
    // a ring, not dust: dust takes a direction, and atan2(0,0) is 0, so a spin
    // asking for dust with no bearing throws all of it due west. The ring is
    // also the honest picture of the move — it is drawn at the reach.
    fx.ring(p.x, p.y, C.gold, SPIN_R + 16, 0.3, 3);
    if (hit) { fx.addTrauma(0.5); fx.stop(0.07); SFX.hit(); }
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
    // whether or not it also closes. A Past Self uses YOUR practice area's
    // attack — DESIGN §4 asks for exactly that, and now that the areas are
    // real data it is a lookup rather than an aspiration.
    const R = d.past ? pastAttack() : d.ranged;
    if (R && dist < d.chase) {
      a.fireT = (a.fireT ?? R.every) - dt;
      if (a.fireT <= 0) {
        a.fireT = R.every;
        const ux = (p.x - a.x) / (dist || 1), uy = (p.y - a.y) / (dist || 1);
        G.incoming.push({
          x: a.x, y: a.y, vx: ux * R.speed, vy: uy * R.speed,
          t: R.life, dmg: Math.round(R.dmg * (d.scales ? PRESS : 1)),
          label: R.label,
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

  // --- the payroll, walking ---
  // They keep station off your shoulder and throw paper at whatever is near you.
  // They cannot be hurt and do not need managing — a companion you have to
  // babysit would be a worse deal than the wage, and the wage is the mechanic.
  // If geometry loses one, they catch up off-screen: an employee stuck behind a
  // bollard is a bug and not a characterisation.
  //
  // The attack is RANGED, and it is the reason they hold station instead of
  // closing. They used to walk onto the target to swing at it, which put them
  // between you and the thing hitting you and dragged them all over the street.
  // From the shoulder they answer anything inside ALLY_RANGE without leaving.
  //
  // What each throw does is Practice.staffPower(): the hire fee over 60. The
  // cadence is the same for everybody, so the fee buys damage and nothing else,
  // and the office price list reads as the power curve it is.
  G.allies.forEach((al, i) => {
    const slot = ALLY_SLOTS[i % ALLY_SLOTS.length];
    const gx = p.x + slot.x, gy = p.y + slot.y;
    const ax = gx - al.x, ay = gy - al.y, am = Math.hypot(ax, ay) || 1;
    let alMoving = false;
    if (Math.hypot(p.x - al.x, p.y - al.y) > 560) { al.x = gx; al.y = gy; }
    else if (am > ALLY_HOLD) {
      // never overshoot the station in one frame, or a stopped firm vibrates
      const stepD = Math.min(ALLY_SPD * dt, am - ALLY_HOLD);
      moveEntity(world, al, (ax / am) * stepD, (ay / am) * stepD, 13);
      alMoving = true;
      // Facing is DEADZONED, and that is the whole fix for the spin. `face` is a
      // number whose sign flips the sprite, and walking beside you it is the
      // difference between the ally and a station point that moves with you: it
      // crosses zero constantly, so the sprite was flipping every frame or two
      // and reading as a pirouette. Turn only for a real horizontal gap, which a
      // stopped or vertically-drifting ally never has.
      if (Math.abs(ax) > ALLY_TURN) al.face = ax;
    }

    // the nearest thing worth a letter — each of them picks their own
    let best = null, bd = ALLY_RANGE;
    for (const t of world.allActors()) {
      const td = actorDef(t.type);
      if (td.harmless || t.asleep) continue;
      const d2 = Math.hypot(t.x - al.x, t.y - al.y);
      if (d2 < bd) { bd = d2; best = t; }
    }
    al.cd -= dt;
    if (best && al.cd <= 0) {
      al.cd = ALLY_CD;
      const ang = Math.atan2(best.y - al.y, best.x - al.x);
      // Turn to what you are answering — but only when standing. Walking beside
      // you they are already facing their direction of travel, and letting the
      // shot re-point them fought the walk for the sprite once a second: face
      // right to keep up, face left to throw, back again. Two clean turns a
      // second still reads as a flap. On the move they throw over a shoulder.
      const towards = Math.cos(ang);
      if (!alMoving && Math.abs(towards) > 0.35) al.face = towards;
      al.rig.strike();
      // Straight into the player's own shot array: updateFired() already does
      // travel, walls, collision, the damage number and downActor. `spare` is
      // the one thing it did not do — your staff do not shoot bystanders.
      G.shots.push({
        x: al.x, y: al.y,
        vx: Math.cos(ang) * ALLY_SHOT_SPD, vy: Math.sin(ang) * ALLY_SHOT_SPD,
        dmg: al.dmg, r: 4, color: ALLY_COLOR, homing: false, spare: true,
        life: 1.4, hit: new Set(),
      });
      fx.muzzle(al.x + Math.cos(ang) * 14, al.y + Math.sin(ang) * 14, ang, ALLY_COLOR);
      SFX.page();
    }
    al.rig.step(dt, { moving: alMoving, speed: ALLY_SPD, faceX: al.face || 0 });
  });

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
  G.boss = bossInPlay();
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
  el('hName').innerHTML = (G.path === 'delete' ? 'THE FLOOR' : 'ATTORNEY AT LAW')
    + ` <span class="cfDim">${areaOf(G.area).name} · ${areaOf(G.area).attack}</span>`;
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
  const carry = G.carried.length ? 'CARRYING: ' + G.carried.join(' · ') : '';
  el('hCarry').innerHTML = carry
    + (G.served ? `${carry ? ' &nbsp;·&nbsp; ' : ''}<span class="bad">SERVED ×${G.served}</span>` : '');
  syncHudLight();
}
function syncHudLight() {
  const p = G.player;
  if (!p) return;
  el('hHpFill').style.width = Math.max(0, (p.hp / p.maxhp) * 100) + '%';
  el('hHpLabel').textContent = `ENERGY ${Math.max(0, Math.round(p.hp))}/${p.maxhp}`;
  const b = G.world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  // The bleed reads as a property of the DISTRICT, next to its name, because
  // that is what it is — the level is global but a district you have found the
  // evidence in is much further gone than one you have only walked through.
  const amt = b ? bleedAt(b.id) : 0;
  el('hDistrict').textContent = (b ? b.def.name + ' · ' + layerOf(G.layer).name : layerOf(G.layer).name)
    + (G.dark ? ' · UNLIT' : '')
    + (amt >= 0.4 ? ' · BLED' : amt > 0 ? ' · SEEPING' : '');
  // the active stage's hint IS the objective — one source, never restated
  const obj = Quests.objective();
  // A live boss takes over the objective line. Everything else you are doing
  // can wait, and a 340hp fight with no readout is just a long silence.
  // `hp > 0` guards the one frame between the killing blow and updatePlay
  // clearing G.boss — otherwise the bar reads 0% over a corpse.
  const boss = G.boss && G.boss.hp > 0 ? G.boss : null;
  if (boss) {
    const d = actorDef(boss.type);
    const pct = Math.max(0, Math.round((boss.hp / d.hp) * 100));
    el('hMatter').textContent = d.title;
    el('hObjective').innerHTML = `<span style="color:#e05e5e">${'█'.repeat(Math.round(pct / 5)).padEnd(20, '░')}</span> <span style="color:#f0c75e">${pct}%</span>`;
  } else {
    el('hObjective').textContent = obj ? obj.text : '';
    el('hMatter').textContent = obj ? obj.quest.name : '';
  }
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

/* ----------------------------- the title ------------------------------- */
/**
 * The one screen a controller could not reach. The three title buttons are DOM
 * and `menu` had no branch in step(), so the pad was polled every frame with
 * nothing listening: you could play the whole game on an Xbox pad except start
 * it, which meant getting up to find a mouse and then sitting back down.
 *
 * It walks the row that is actually ON SCREEN. RESUME REPRESENTATION and the
 * NEW GAME + button are `display:none` until `.on` reveals them, so the row is
 * one, two or three buttons wide depending on what you have done, and asking
 * for a fixed three would let you land the cursor on a button nobody can see.
 * `offsetParent` is the honest test — it answers for the rendered element and
 * cannot be got wrong the way reading `style.display` can.
 *
 * The highlight only appears once there is a pad or once somebody has actually
 * steered, so a mouse player's title screen looks exactly as it always did.
 */
const MENU_BTNS = ['continueBtn', 'startBtn', 'plusBtn'];
let menuSel = 0, menuSteered = false;

function stepMenu() {
  const btns = MENU_BTNS.map(el).filter(b => b && b.offsetParent !== null);
  if (!btns.length) return;
  if (menuSel > btns.length - 1) menuSel = btns.length - 1;

  // The row is horizontal, but a thumb that pushes up expects to move — both
  // axes walk it rather than one of them being silently inert.
  const nv = Input.nav();
  if (nv === 'right' || nv === 'down') { menuSel = (menuSel + 1) % btns.length; menuSteered = true; }
  else if (nv === 'left' || nv === 'up') { menuSel = (menuSel + btns.length - 1) % btns.length; menuSteered = true; }

  const show = menuSteered || Input.pad.on;
  for (const [i, b] of btns.entries()) b.classList.toggle('padsel', show && i === menuSel);

  if (Input.pressed('confirm')) {
    // The same press must not also turn the letter's first page: `confirm` is
    // what the intro advances on, and it is still held when the intro starts.
    Input.consume('confirm');
    Input.clearHeld();
    for (const b of btns) b.classList.remove('padsel');
    btns[menuSel].click();
  }
}

/* -------------------------------- loop --------------------------------- */
let last = performance.now();
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  Input.frame();
  if (G.world) initActors(G.world);

  if (G.state === 'menu') {
    stepMenu();
  } else if (G.state === 'intro') {
    Intro.step(dt);
    Intro.draw();
    musicTick('letter');
  } else if (G.state === 'end') {
    Ending.step(dt);
    Ending.draw();
    musicTick('ending');
  } else if (G.state === 'summary') {
    // The panel is DOM and opaque, so nothing needs drawing under it — but the
    // ending's track keeps running, because the run has not been put down yet.
    musicTick('ending');
    stepCasefileInput(dt);
    if (Input.pressed('casefile') || Input.pressed('cancel')
      || Input.pressed('confirm') || Input.pressed('interact')) {
      Casefile.hide();
      Input.clearHeld();
    }
  } else if (G.state === 'dialog') {
    // the world holds still behind the conversation, but keeps drawing
    G.fx.step(dt);
    G.player.rig.step(dt, { moving: false });
    drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G);
    stepDialogueInput();
    // a conversation does not lift the bleed or dismiss the boss standing behind it
    musicTick(currentTrack(), G.bleedAmt);
  } else if (G.state === 'play') {
    if (Casefile.open) {
      // the casefile is a reading screen; freeze play under it
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G);
      stepCasefileInput(dt);
      if (Input.pressed('casefile') || Input.pressed('cancel')) { Casefile.hide(); Input.clearHeld(); }
    } else {
      if (G.fx.hitStop > 0) G.fx.hitStop -= dt;
      else updatePlay(dt);
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G);
      if (G.prompt) drawPrompt(G.prompt);
      drawBanner();
      if (Input.pressed('casefile')) { Casefile.show(G.layer, HAS_CLOCK()); Input.clearHeld(); }
    }
    musicTick(currentTrack(), G.bleedAmt);
  } else {
    musicTick(null);
  }
}
/**
 * The casefile, from a stick.
 *
 * Scrolling is CONTINUOUS off `Input.vec()` rather than edge-triggered off
 * `Input.nav()`: nav gives one event per push, which is right for a choice list
 * and useless for a page — reading the summary would be a hundred separate
 * flicks. vec is the merged movement vector, so the same held-down analog
 * deflection that walks the player reads the panel, and W/S and the arrow keys
 * get the scroll they have never actually had.
 *
 * Tabs stay on nav(), because those ARE a list: one push, one tab.
 */
const CF_SCROLL = 1400;   // px/s at full deflection — a screenful in about half a second
function stepCasefileInput(dt) {
  const v = Input.vec();
  if (Math.abs(v.y) > 0.2) Casefile.scrollBy(v.y * CF_SCROLL * dt);
  const nv = Input.nav();
  if (nv === 'left' && Casefile.cycleTab(-1)) SFX.blip();
  else if (nv === 'right' && Casefile.cycleTab(1)) SFX.blip();
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
Input.hooks.onCanvasTap = (x, y) => {
  if (G.state === 'intro') Intro.tap(x, y);
  else if (G.state === 'end') Ending.tap();
};

el('fsBtn').addEventListener('click', toggleFullscreen);
el('startBtn').addEventListener('click', () => startNew(false));
el('continueBtn').addEventListener('click', continueGame);
el('plusBtn').addEventListener('click', () => startNew(true));
el('saveBtn').addEventListener('click', () => say(doSave() ? 'Saved.' : 'Save failed.', 2));
if (hasSave()) el('continueBtn').classList.add('on');

/**
 * The title's NEW GAME + affordance. It only exists once a run has been
 * finished, and it says which key is left rather than making the player work it
 * out — the fork is the game's one irreversible decision and the offer to take
 * the other side of it should be legible from the menu.
 */
function syncPlusButton() {
  const prev = lastRun();
  if (!prev) return;
  const other = nextPath();
  el('plusBtn').classList.add('on');
  el('plusBtn').textContent = other === 'delete' ? 'DELETE IT INSTEAD' : 'SEND IT INSTEAD';
  const note = el('plusNote');
  note.classList.add('on');
  const em = endingMeta(prev.ending);
  note.innerHTML = `Last time you ${prev.path === 'send' ? 'sent it' : 'deleted it'}`
    + ` and it ended <b>${em.stamp}</b>. ${runs().length} run${runs().length > 1 ? 's' : ''} on the record.`
    + `<br>The letter you left is filed with the other four hundred.`;
}
syncPlusButton();
if (DEV) el('hDev').style.display = '';

// ?layer=floor jumps straight into a path without the reel — dev only
const q = new URLSearchParams(location.search).get('layer');
if (DEV && q && LAYERS[q]) { audioInit(); beginPath(q, q === 'floor' ? 'delete' : 'send'); }

requestAnimationFrame(loop);

// expose for the dev editor and for browser-console verification
window.LE2 = {
  G, Input, LAYERS, doSave, beginPath, loadGame, Facts, Quests, Practice,
  Dialogue, Casefile, talkTo, useProp, endDay, Intro, Ending,
  Hrs: { Hours, bill, lightUp, isLit, fmtHours, pressure },
  Bld: { Bleed, setBleed, witness, bleedAt, canCross, cross: () => crossLayers() },
  Aud: { AU, SONGS, musicTick, currentTrack, SFX },
  Areas: { AREAS, areaOf, importLE1, set: id => { if (AREAS[id]) G.area = id; return G.area; } },
  Clock: { Cal, dateString, allEntries, advanceDay, schedule, unschedule, resetClock },
};
