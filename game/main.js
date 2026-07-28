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
};

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
  say(`Word gets around ${d === 'strand' ? 'The Strand' : 'Courthouse Square'}.`, 3);
};

function refreshCasefile() { if (Casefile.open) Casefile.render(G.layer); }

/* ================================ THE DOCKET ============================= */
// THE FLOOR has no clock — its calendar reads the same date forever, so the
// whole survival layer is Path A's alone. This is the one predicate that says so.
const HAS_CLOCK = () => G.layer === 'street';

const RENT = 1100, RENT_EVERY = 7;

function scheduleRent() {
  for (let i = 1; i <= 12; i++)
    schedule({ day: 1 + i * RENT_EVERY, kind: 'rent', label: `Rent — Suite 2B ($${RENT})` });
}

clockHooks.onDue = e => {
  if (e.kind === 'rent') rentDay();
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
    showBanner(def.name, layerOf(G.layer).name);
    if (L.greet) say(L.greet, 6);
    SFX.district();
    Quests.questEvent('reach', { region: def.id });
  };
  const s = SPAWN[layerId];
  G.player = makePlayer(s.x, s.y);
  G.carried = [];
  G.complaint = null;
  resetClock();
  Practice.resetPractice();
  if (layerId === 'street') {
    Practice.post(4100, 'Opening balance — everything you had', 'operating', 1);
    scheduleRent();
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
  G.world.loadDeltas(d.deltas);
  // rebuild residency at the restored position so deltas apply to fresh builds
  for (const id of G.world.residentIds()) G.world.evict(id);
  G.world.currentId = null;
  G.world.update(G.player.x, G.player.y);
  camFollow(G.player.x, G.player.y);
  if (d.complaint) spawnComplaint();
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
  // stairs up to your office. It must never be marked spent.
  if (!pr.repeat) { pr.used = true; G.world.markUsed(pr.region, pr.id); }
  say(pr.text, 9);
  SFX.door();
  Quests.questEvent('use', { prop: pr.id });
  if (pr.fact && first) Facts.learn(pr.fact);
  else if (pr.fact) SFX.page();
  if (pr.endDay) endDay();
  syncHud();
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
    if (entry && entry.day <= Cal.day) {
      unschedule(q.id);
      Quests.failQuest(q.id, 'the date passed');
    }
  }

  advanceDay();

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
    say('You come to at the same desk. The clock has not moved, because it does not.', 7);
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
    moveEntity(world, p, (v.x / mag) * SPEED * dt, (v.y / mag) * SPEED * dt, p.r);
    p.face = { x: v.x / mag, y: v.y / mag };
  }

  // pad right-stick / mouse aim wins over movement facing
  if (Input.pad.aim) p.face = { ...Input.pad.aim };

  p.rig.step(dt, { moving: p.moving, speed: SPEED, faceX: p.face.x });

  // --- streaming ---
  world.update(p.x, p.y);
  camFollow(p.x, p.y);

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
        if (a.hp <= 0) {
          fx.stamp(a.x, a.y - 10, d.harmless ? 'EXCUSED' : 'DISMISSED', d.harmless ? '#9be05e' : C.red);
          SFX.die();
          world.killActor(a);          // <- the delta: this one stays gone
        }
      }
    }
    SFX.melee();
    if (hit) { fx.addTrauma(0.35); fx.stop(0.05); SFX.hit(); }
  }

  // --- actors ---
  for (const a of world.allActors()) {
    const d = actorDef(a.type);
    if (!a.rig) { a.rig = new Rig(); a.rig.spawn(); }
    a.barkT = (a.barkT || 4 + Math.random() * 10) - dt;
    const dist = Math.hypot(p.x - a.x, p.y - a.y);

    let moving = false;
    if (!d.harmless && dist < d.chase) {
      const ux = (p.x - a.x) / (dist || 1), uy = (p.y - a.y) / (dist || 1);
      moveEntity(world, a, ux * d.speed * dt, uy * d.speed * dt, d.r);
      a.face = ux; moving = true;
      if (dist < d.r + p.r + 4 && p.hurtCd <= 0 && p.dashT <= 0) {
        p.hp -= d.dmg; p.hurtCd = 0.9;
        p.rig.hurt(ux, uy);
        fx.number(p.x, p.y - 30, d.onTouch, C.red);
        fx.addTrauma(0.4);
        SFX.hit();
        if (p.hp <= 0) collapse();
        syncHud();
      }
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
          moveEntity(world, a, (dx / m) * d.speed * dt, (dy / m) * d.speed * dt, d.r);
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
    a.rig.step(dt, { moving, speed: d.speed, faceX: a.face || 0 });
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
  } else {
    money.textContent = '';
    el('hDay').textContent = '';
  }
  el('hCarry').textContent = G.carried.length ? 'CARRYING: ' + G.carried.join(' · ') : '';
  syncHudLight();
}
function syncHudLight() {
  const p = G.player;
  if (!p) return;
  el('hHpFill').style.width = Math.max(0, (p.hp / p.maxhp) * 100) + '%';
  el('hHpLabel').textContent = `ENERGY ${Math.max(0, Math.round(p.hp))}/${p.maxhp}`;
  const b = G.world.regionAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
  el('hDistrict').textContent = b ? b.def.name + ' · ' + layerOf(G.layer).name : layerOf(G.layer).name;
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
    drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G.complaint);
    stepDialogueInput();
    musicTick(layerOf(G.layer).music);
  } else if (G.state === 'play') {
    if (Casefile.open) {
      // the casefile is a reading screen; freeze play under it
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G.complaint);
      if (Input.pressed('casefile') || Input.pressed('cancel')) { Casefile.hide(); Input.clearHeld(); }
    } else {
      if (G.fx.hitStop > 0) G.fx.hitStop -= dt;
      else updatePlay(dt);
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t, G.complaint);
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
  Clock: { Cal, dateString, allEntries, advanceDay, schedule, unschedule, resetClock },
};
