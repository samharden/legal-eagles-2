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
  fees: 0,              // Phase 2 turns this into a real economy; for now it counts
  msg: { text: '', t: 0 },
  banner: { text: '', sub: '', t: 0 },
  carried: [],
  prompt: null,
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
Quests.questHooks.onStart = q => { showBanner('NEW MATTER', q.name); say(q.blurb, 7); SFX.district(); };
Quests.questHooks.onComplete = () => { SFX.send(); refreshCasefile(); };
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

CASE_HOOKS.say = (t, d) => say(t, d);
CASE_HOOKS.banner = (a, b) => showBanner(a, b);
CASE_HOOKS.reward = n => { G.fees += n; if (n) say(`Fee earned: $${n}.`, 4); syncHud(); };

function refreshCasefile() { if (Casefile.open) Casefile.render(G.layer); }

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
  G.fees = 0;
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
  G.fees = d.fees || 0;
  // restore knowledge and matters BEFORE residency, so quest markers and
  // already-read props come back in the right state
  Facts.loadFacts(d.facts);
  Quests.loadQuests(d.quests);
  G.world.loadDeltas(d.deltas);
  // rebuild residency at the restored position so deltas apply to fresh builds
  for (const id of G.world.residentIds()) G.world.evict(id);
  G.world.currentId = null;
  G.world.update(G.player.x, G.player.y);
  camFollow(G.player.x, G.player.y);
  syncHud();
  say('Representation resumed.', 3);
}

export function doSave() {
  if (G.state !== 'play') return false;
  return saveGame({
    layer: G.layer, path: G.path,
    x: G.player.x, y: G.player.y, hp: G.player.hp,
    carried: G.carried, fees: G.fees,
    facts: Facts.saveFacts(),
    quests: Quests.saveQuests(),
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
  pr.used = true;
  G.world.markUsed(pr.region, pr.id);
  say(pr.text, 9);
  SFX.door();
  Quests.questEvent('use', { prop: pr.id });
  if (pr.fact && first) Facts.learn(pr.fact);
  else if (pr.fact) SFX.page();
  syncHud();
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
        if (p.hp <= 0) { p.hp = 1; say('You are running on nothing. Phase 0 has no death screen yet.', 4); }
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
  el('hName').textContent = (G.path === 'delete' ? 'THE FLOOR' : 'ATTORNEY AT LAW')
    + (G.fees ? `   $${G.fees}` : '');
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
    drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t);
    stepDialogueInput();
    musicTick(layerOf(G.layer).music);
  } else if (G.state === 'play') {
    if (Casefile.open) {
      // the casefile is a reading screen; freeze play under it
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t);
      if (Input.pressed('casefile') || Input.pressed('cancel')) { Casefile.hide(); Input.clearHeld(); }
    } else {
      if (G.fx.hitStop > 0) G.fx.hitStop -= dt;
      else updatePlay(dt);
      drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t);
      if (G.prompt) drawPrompt(G.prompt);
      drawBanner();
      if (Input.pressed('casefile')) { Casefile.show(G.layer); Input.clearHeld(); }
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
window.LE2 = { G, Input, LAYERS, doSave, beginPath, loadGame, Facts, Quests, Dialogue, Casefile, talkTo, useProp };
