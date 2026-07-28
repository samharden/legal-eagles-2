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
import { REGIONS, SPAWN } from './city.js';
import { LAYERS, layerOf } from './layers.js';
import { actorDef } from './actors.js';
import { drawWorld, drawPrompt } from './render.js';
import { Intro } from './intro.js';

/* -------------------------------- state -------------------------------- */
export const G = {
  state: 'menu',        // menu | intro | play
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

/* -------------------------------- boot --------------------------------- */
function beginPath(layerId, path) {
  G.path = path;
  G.layer = layerId;
  G.world = new World(REGIONS, layerId);
  G.world.onEnter = (def, built) => {
    const L = built.layerData;
    showBanner(def.name, layerOf(G.layer).name);
    if (L.greet) say(L.greet, 6);
    SFX.district();
  };
  const s = SPAWN[layerId];
  G.player = makePlayer(s.x, s.y);
  G.carried = [];
  G.world.update(s.x, s.y);
  camFollow(s.x, s.y);
  G.state = 'play';
  document.getElementById('menu').style.display = 'none';
  document.getElementById('hud').style.display = '';
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
    carried: G.carried,
    deltas: G.world.saveDeltas(),
  });
}

/* ------------------------------ messaging ------------------------------ */
function say(text, t = 4) { G.msg.text = text; G.msg.t = t; }
function showBanner(text, sub) { G.banner.text = text; G.banner.sub = sub || ''; G.banner.t = 3.2; }

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

  // --- pickups ---
  for (const q of [...world.allPickups()]) {
    if (Math.hypot(q.x - p.x, q.y - p.y) < 30) {
      world.takePickup(q);             // <- the delta: this one stays taken
      G.carried.push(q.item);
      SFX.pick();
      fx.number(q.x, q.y - 16, '+ ' + q.name, C.gold, true);
      say(q.name + ' — ' + q.note, 6);
      syncHud();
    }
  }

  // --- prompts + interaction ---
  G.prompt = null;
  let best = null, bestD = 62;
  for (const pr of world.allProps()) {
    const d = Math.hypot(pr.x - p.x, pr.y - p.y);
    if (d < bestD) { bestD = d; best = pr; }
  }
  if (best) {
    G.prompt = IS_TOUCH ? best.label.replace('[E]', '[USE]') : best.label;
    if (Input.pressed('interact')) {
      best.used = true;
      G.world.markUsed(best.region, best.id);
      say(best.text, 8);
      SFX.door();
    }
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
  } else if (G.state === 'play') {
    if (G.fx.hitStop > 0) G.fx.hitStop -= dt;
    else updatePlay(dt);
    drawWorld(G.world, layerOf(G.layer), G.player, G.fx, G.t);
    if (G.prompt) drawPrompt(G.prompt);
    drawBanner();
    musicTick(layerOf(G.layer).music);
  } else {
    musicTick(null);
  }
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
window.LE2 = { G, Input, LAYERS, doSave, beginPath, loadGame };
