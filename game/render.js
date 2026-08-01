"use strict";
// ============================== RENDER ==============================
// One pass over the visible tile window, then props, pickups, actors, the
// player, the FX layer, and the layer's light. Nothing here knows which region
// a tile came from — the world answers by global tile coordinate and the
// renderer just draws what is in front of the camera.

import { ctx, cam, view, TILE, W, H, C } from '../engine/stage.js';
import { TILES, VOID } from '../engine/tilemap.js';
import { SPR, drawSprite } from '../engine/sprites.js';
import { isLit } from '../engine/hours.js';
import { bleedAt, Bleed } from '../engine/bleed.js';
import { LAYERS } from './layers.js';
import { actorDef } from './actors.js';

let motes = null, moteLayer = null;

// Enough for the densest layer, not just this one — a bled district draws the
// other layer's population out of the same pool, and a short pool would quietly
// cap the effect at whichever layer happened to be seeded.
const MOTE_POOL = 40;

function seedMotes(layer) {
  motes = [];
  for (let i = 0; i < MOTE_POOL; i++)
    motes.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, s: 0.3 + Math.random() });
  moteLayer = layer.id;
}

/* ------------------------------- THE BLEED ------------------------------- */
// One number per district decides how much of the other layer is in this one,
// and everything the renderer owns is a lerp along it: every paint class, the
// solid edge, the grid hairline, the page colour, the vignette and the motes.
// There is no second render path — a bled district is the same draw with
// different constants, which is why this is affordable at six districts.

/** #rrggbb interpolation. The palettes are all six-digit hex by convention. */
function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}

const otherLayer = layer => LAYERS[layer.id === 'street' ? 'floor' : 'street'];

// Dressings are cached by layer + rounded amount rather than recomputed per
// tile: at six districts and a 40x30 window that is ~1200 palette builds a
// frame otherwise, for at most a handful of distinct values.
const dressCache = new Map();
function dress(layer, amt) {
  const q = Math.round(amt * 25) / 25;
  const key = layer.id + '|' + q;
  let d = dressCache.get(key);
  if (d) return d;
  const o = otherLayer(layer);
  if (q <= 0) d = { pal: layer.pal, edge: layer.edge, grid: layer.grid, amt: 0 };
  else {
    const pal = {};
    for (const k in layer.pal) pal[k] = mix(layer.pal[k], o.pal[k] || layer.pal[k], q);
    d = { pal, edge: mix(layer.edge, o.edge, q), grid: layer.grid, amt: q };
  }
  dressCache.set(key, d);
  return d;
}

/**
 * `ent` is the bag of things that are not in the world's own arrays — the
 * grievance, the payroll, paper in the air. It is an object rather than four
 * more positional parameters because render.js cannot import G (main.js imports
 * render.js, and the bundler forbids the cycle).
 */
export function drawWorld(world, layer, player, fx, gameT, ent = {}) {
  const { complaint, allies, incoming, shots } = ent;
  const g = ctx;
  const Z = view.zoom;

  // The district you are standing in decides the page colour and the mood, the
  // same way it decides its own tiles — so walking from a bled district into a
  // sealed one is a change you feel at the line rather than a global setting.
  const here = world.regionAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const hereAmt = here ? bleedAt(here.id) : 0;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = mix(layer.bg, otherLayer(layer).bg, hereAmt);
  g.fillRect(0, 0, W, H);

  // camera transform, with the FX layer's trauma shake folded in
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(fx.shakeRot);
  g.scale(Z, Z);
  g.translate(-W / (2 * Z) + fx.shakeX, -H / (2 * Z) + fx.shakeY);

  const x0 = Math.floor(cam.x / TILE) - 1, x1 = Math.ceil((cam.x + view.w) / TILE) + 1;
  const y0 = Math.floor(cam.y / TILE) - 1, y1 = Math.ceil((cam.y + view.h) / TILE) + 1;

  // ---- tiles ----
  // Walked region-first rather than by global tile lookup, because the bleed is
  // a per-DISTRICT quantity: the dressing is resolved once when the scan crosses
  // a district line instead of once per tile.
  let curB = null, D = dress(layer, 0);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const b = world.regionAt(tx, ty);
      if (!b) continue;
      if (b !== curB) { curB = b; D = dress(layer, bleedAt(b.id)); }
      const ch = b.grid[ty - b.oy][tx - b.ox];
      if (ch === VOID) continue;
      const def = TILES[ch];
      if (!def) continue;
      const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;

      g.fillStyle = D.pal[def.cls] || '#f0f';
      g.fillRect(sx, sy, TILE, TILE);

      // a hairline on walkable tiles: without it a plaza is one flat wash and
      // the player has no sense of scale or of how far they have moved
      if (!def.solid && D.grid) {
        g.fillStyle = D.grid;
        g.fillRect(sx, sy, TILE, 1);
        g.fillRect(sx, sy, 1, TILE);
      }

      // solids get a lit top edge wherever they meet open ground — cheap relief,
      // and it's what makes a block of '#' read as a building rather than a hole
      if (def.solid) {
        const above = TILES[world.tileAt(tx, ty - 1)];
        if (!above || !above.solid) {
          g.fillStyle = D.edge;
          g.fillRect(sx, sy, TILE, 5);
        }
      }
      if (def.cls === 'glass') {
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(sx + 5, sy + 5, TILE - 10, TILE - 14);
      }
      if (def.cls === 'road' && ch === '-') {
        g.strokeStyle = 'rgba(240,199,94,0.28)';
        g.lineWidth = 3; g.setLineDash([16, 14]);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + TILE, sy); g.stroke();
        g.setLineDash([]);
      }
      if (def.door) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(sx + 4, sy + 2, TILE - 8, TILE - 4);
      }
      // the river: two slow highlights per tile, offset by position so the
      // whole surface does not blink in unison
      if (def.cls === 'water') {
        const t = gameT * 0.6 + tx * 0.7 + ty * 0.3;
        g.fillStyle = `rgba(255,255,255,${0.03 + Math.sin(t) * 0.025})`;
        g.fillRect(sx, sy + TILE * 0.28, TILE, 2);
        g.fillRect(sx, sy + TILE * 0.66, TILE, 1);
      }
      // chain link: a barrier you can see through, which is the whole reason a
      // tow yard is a fence and not a wall — you are meant to look at what is
      // inside it and not be able to get to it.
      if (def.cls === 'fence') {
        g.strokeStyle = 'rgba(0,0,0,0.34)'; g.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          g.beginPath(); g.moveTo(sx + i * TILE / 4, sy); g.lineTo(sx + i * TILE / 4, sy + TILE); g.stroke();
        }
        g.fillStyle = D.edge;
        g.fillRect(sx, sy, TILE, 3);
      }
      if (def.cls === 'steps') {
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          g.beginPath(); g.moveTo(sx, sy + i * TILE / 4); g.lineTo(sx + TILE, sy + i * TILE / 4); g.stroke();
        }
      }
    }
  }

  // ---- ghosts ----
  // Where the other layer's furniture stands. Drawn UNDER everything real and
  // never interactive: the clerk's window you filed at is standing in the middle
  // of a dark plaza with nobody behind it, and the newsstand is back, and you
  // cannot buy anything from it. DESIGN §2 calls recognition free horror — this
  // is the cheapest possible way to charge for it.
  if (Bleed.level) {
    for (const b of world.builtRegions()) {
      const amt = bleedAt(b.id);
      if (amt <= 0 || !b.ghosts) continue;
      g.save();
      g.globalAlpha = Math.min(0.5, amt * 0.62);
      for (const gh of b.ghosts) {
        const sx = gh.x - cam.x, sy = gh.y - cam.y;
        if (sx < -60 || sy < -60 || sx > W / view.zoom + 60 || sy > H / view.zoom + 60) continue;
        drawSprite(g, SPR[gh.spr], sx, sy, 32);
      }
      g.restore();
    }
  }

  // ---- props ----
  for (const p of world.allProps()) {
    drawSprite(g, SPR[p.spr], p.x - cam.x, p.y - cam.y, 34);
    if (!p.used) {
      const bob = Math.sin(gameT * 3 + p.x * 0.01) * 3;
      g.fillStyle = C.cyan;
      g.font = 'bold 18px "Courier New", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('!', p.x - cam.x, p.y - cam.y - 28 + bob);
    }
  }

  // ---- pickups ----
  for (const p of world.allPickups()) {
    const bob = Math.sin(gameT * 3 + p.bob) * 4;
    drawSprite(g, SPR[p.spr], p.x - cam.x, p.y - cam.y + bob, 26);
  }

  // ---- npcs ----
  for (const n of world.allNpcs()) {
    if (n.rig) n.rig.draw(g, SPR[n.spr], n.x - cam.x, n.y - cam.y, 34, false);
    else drawSprite(g, SPR[n.spr], n.x - cam.x, n.y - cam.y, 34);
    if (n.marker) {
      const bob = Math.sin(gameT * 3.4 + n.x * 0.02) * 3;
      g.fillStyle = n.marker === '?' ? C.gold : C.cyan;
      g.font = 'bold 20px "Courier New", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)';
      g.strokeText(n.marker, n.x - cam.x, n.y - cam.y - 30 + bob);
      g.fillText(n.marker, n.x - cam.x, n.y - cam.y - 30 + bob);
    }
  }

  // ---- actors ----
  for (const a of world.allActors()) {
    if (a.asleep) continue;          // conditional roster — not here right now
    const d = actorDef(a.type);
    if (a.rig) a.rig.draw(g, SPR[d.spr], a.x - cam.x, a.y - cam.y, d.size, a.face < 0);
    else drawSprite(g, SPR[d.spr], a.x - cam.x, a.y - cam.y, d.size);
  }

  // ---- your argument, in the air ----
  // A disc with a soft glow behind it, coloured by practice area — the shot
  // colour is the only thing on screen that says which lawyer you are.
  if (shots) for (const s of shots) {
    const sx = s.x - cam.x, sy = s.y - cam.y;
    g.save();
    g.globalAlpha = 0.28;
    g.fillStyle = s.color;
    g.beginPath(); g.arc(sx, sy, s.r * 2.1, 0, 7); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = s.color;
    g.beginPath(); g.arc(sx, sy, s.r, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.arc(sx - s.vx * 0.004, sy - s.vy * 0.004, Math.max(1, s.r * 0.42), 0, 7); g.fill();
    g.restore();
  }

  // ---- paper in the air ----
  if (incoming) for (const s of incoming) {
    const sx = s.x - cam.x, sy = s.y - cam.y;
    g.save();
    g.translate(sx, sy);
    g.rotate(Math.atan2(s.vy, s.vx) + gameT * 6);
    drawSprite(g, SPR.paper, 0, 0, 18);
    g.restore();
  }

  // ---- the payroll ----
  // Drawn before the player so they read as standing behind you, which is where
  // they are and roughly what they are for. Each carries its own sprite key:
  // three staff drawn as three paralegals would make the hire screen a lie.
  if (allies) for (const al of allies)
    al.rig.draw(g, SPR[al.spr] || SPR.paralegal, al.x - cam.x, al.y - cam.y, 34, al.face < 0);

  // ---- player ----
  player.rig.draw(g, SPR[player.spr], player.x - cam.x, player.y - cam.y, 36, player.face.x < 0);

  // ---- the dark ----
  // Drawn over everything in the world including the actors, because a floor
  // that is not on the lights should not show you what is on it. You get a
  // radius and your own footsteps. The player sits in the clear centre of the
  // gradient, so they are never the thing that disappears.
  if (layer.dark) { drawDaylight(g, world); drawDark(g, world, player); }

  // ---- the grievance ----
  // Drawn after the player and tinted red underneath, because it should read as
  // something attached to you rather than something in the street.
  if (complaint) {
    const cx = complaint.x - cam.x, cy = complaint.y - cam.y;
    g.save();
    g.globalAlpha = 0.30 + Math.sin(gameT * 3) * 0.08;
    g.fillStyle = '#c0392b';
    g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.fill();
    g.restore();
    complaint.rig.draw(g, SPR.grievance, cx, cy, 30, false);
  }

  // ---- fx ----
  fx.drawWorld(g, cam);

  g.restore();

  // Standing IN the daylight lifts the whole screen, not just the tiles under
  // it. The world-space wash above draws the seam so you can see the boundary
  // from outside; this is what it feels like once you have crossed it, and on a
  // layer whose default mood is a 0.62 vignette that pulses, the lifting is the
  // entire effect.
  drawLight(g, layer, gameT, !!(here && here.layerData && here.layerData.daylight), hereAmt);
}

/**
 * The opposite of the dark, and it uses the same clip so it lands on the same
 * seam. A region whose floor data says `daylight` gets a warm wash over its own
 * rectangle — DESIGN §7 says The Flats is the only place on THE FLOOR with
 * daylight, and the point of that is not that it is prettier. It is that the
 * light there is not on anybody's timesheet.
 */
function drawDaylight(g, world) {
  for (const b of world.builtRegions()) {
    if (!b.layerData || !b.layerData.daylight) continue;
    const rx = b.px - cam.x, ry = b.py - cam.y;
    if (rx > W / view.zoom || ry > H / view.zoom || rx + b.pw < 0 || ry + b.ph < 0) continue;
    g.save();
    g.beginPath(); g.rect(rx, ry, b.pw, b.ph); g.clip();
    g.fillStyle = 'rgba(255,236,196,0.20)';
    g.fillRect(rx, ry, b.pw, b.ph);
    // and it comes from somewhere, which is the part you are not going to like
    const grad = g.createLinearGradient(rx, ry, rx + b.pw * 0.7, ry + b.ph);
    grad.addColorStop(0, 'rgba(255,224,160,0.20)');
    grad.addColorStop(1, 'rgba(255,224,160,0)');
    g.fillStyle = grad;
    g.fillRect(rx, ry, b.pw, b.ph);
    g.restore();
  }
}

/**
 * Black out every resident region that is not on the lights, clipped to that
 * region's own rectangle — so the seam between a lit floor and a dark one is a
 * hard line you can stand on, which is the whole reason to buy the light.
 */
function drawDark(g, world, player) {
  const px = player.x - cam.x, py = player.y - cam.y;
  for (const b of world.builtRegions()) {
    if (isLit(b.id)) continue;
    const rx = b.px - cam.x, ry = b.py - cam.y;
    if (rx > W / view.zoom || ry > H / view.zoom || rx + b.pw < 0 || ry + b.ph < 0) continue;
    g.save();
    g.beginPath(); g.rect(rx, ry, b.pw, b.ph); g.clip();
    const grad = g.createRadialGradient(px, py, 34, px, py, 250);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.62)');
    grad.addColorStop(1, 'rgba(0,0,0,0.97)');
    g.fillStyle = grad;
    g.fillRect(rx, ry, b.pw, b.ph);
    g.restore();
  }
}

/**
 * The screen-space light: air, tint and vignette. `amt` is how far into the
 * other layer the district under your feet has gone.
 *
 * The two layers' moods are not blended arithmetically — their tints and mote
 * colours are `rgba()` strings and parsing them to interpolate would be four
 * lines of regex for a worse result. Both are drawn, one over the other, at
 * complementary opacity. Two atmospheres in the same room is the effect
 * anyway; a single averaged one would be a third atmosphere belonging to
 * neither, which is exactly what the bleed must not look like.
 */
function drawLight(g, layer, gameT, daylight, amt = 0) {
  if (moteLayer !== layer.id) seedMotes(layer);
  const o = otherLayer(layer);
  const lerp = (a, b) => a + (b - a) * amt;

  // ambient motes drift in screen space — they are air, not objects
  const drift = lerp(layer.motes.drift, o.motes.drift);
  for (const m of motes) {
    m.y += m.s * drift * 0.016;
    m.x += Math.sin(gameT * 0.4 + m.y * 0.01) * 0.25;
    if (m.y > H) { m.y = -4; m.x = Math.random() * W; }
  }
  const drawMotes = (spec, alpha) => {
    if (alpha <= 0.004) return;
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = spec.color;
    const n = Math.min(motes.length, spec.n);
    for (let i = 0; i < n; i++) {
      const m = motes[i];
      g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
    }
    g.restore();
  };
  drawMotes(layer.motes, 1 - amt * 0.7);
  drawMotes(o.motes, amt);

  const tint = (col, alpha) => {
    if (!col || alpha <= 0.004) return;
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = col;
    g.fillRect(0, 0, W, H);
    g.restore();
  };
  if (daylight) tint('rgba(255,231,182,0.11)', 1);
  else { tint(layer.mood.tint, 1 - amt); tint(o.mood.tint, amt); }

  // In the daylight the building stops breathing — the pulse goes with the
  // vignette, because the pulse is the building and the building is not here.
  // A bled street borrows the building's breath: the pulse arrives on Path A
  // before anything else does, and it arrives without explanation.
  let v = daylight ? 0.14 : lerp(layer.mood.vign, o.mood.vign);
  const pulse = lerp(layer.mood.pulse, o.mood.pulse);
  if (pulse && !daylight) v += Math.sin(gameT * 0.55) * pulse;
  if (v > 0.01) {
    const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.92, v)})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
}

/** The interaction prompt, drawn screen-space under the player. */
export function drawPrompt(text) {
  const g = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.font = 'bold 15px "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(text).width;
  g.fillStyle = 'rgba(9,7,15,0.86)';
  g.fillRect(W / 2 - w / 2 - 12, H - 62, w + 24, 28);
  g.strokeStyle = C.line; g.lineWidth = 1;
  g.strokeRect(W / 2 - w / 2 - 12, H - 62, w + 24, 28);
  g.fillStyle = C.gold;
  g.fillText(text, W / 2, H - 48);
}
