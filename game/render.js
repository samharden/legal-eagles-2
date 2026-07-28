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
import { actorDef } from './actors.js';

let motes = null, moteLayer = null;

function seedMotes(layer) {
  motes = [];
  for (let i = 0; i < layer.motes.n; i++)
    motes.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, s: 0.3 + Math.random() });
  moteLayer = layer.id;
}

export function drawWorld(world, layer, player, fx, gameT, complaint, ally) {
  const g = ctx;
  const Z = view.zoom;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = layer.bg;
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
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = world.tileAt(tx, ty);
      if (ch === VOID) continue;
      const def = TILES[ch];
      if (!def) continue;
      const sx = tx * TILE - cam.x, sy = ty * TILE - cam.y;

      g.fillStyle = layer.pal[def.cls] || '#f0f';
      g.fillRect(sx, sy, TILE, TILE);

      // a hairline on walkable tiles: without it a plaza is one flat wash and
      // the player has no sense of scale or of how far they have moved
      if (!def.solid && layer.grid) {
        g.fillStyle = layer.grid;
        g.fillRect(sx, sy, TILE, 1);
        g.fillRect(sx, sy, 1, TILE);
      }

      // solids get a lit top edge wherever they meet open ground — cheap relief,
      // and it's what makes a block of '#' read as a building rather than a hole
      if (def.solid) {
        const above = TILES[world.tileAt(tx, ty - 1)];
        if (!above || !above.solid) {
          g.fillStyle = layer.edge;
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
        g.fillStyle = layer.edge;
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
    const d = actorDef(a.type);
    if (a.rig) a.rig.draw(g, SPR[d.spr], a.x - cam.x, a.y - cam.y, d.size, a.face < 0);
    else drawSprite(g, SPR[d.spr], a.x - cam.x, a.y - cam.y, d.size);
  }

  // ---- the paralegal ----
  // Drawn before the player so she reads as standing behind you, which is
  // where she is and roughly what she is for.
  if (ally) ally.rig.draw(g, SPR.paralegal, ally.x - cam.x, ally.y - cam.y, 34, ally.face < 0);

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
  const here = world.regionAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  drawLight(g, layer, gameT, !!(here && here.layerData && here.layerData.daylight));
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

function drawLight(g, layer, gameT, daylight) {
  if (moteLayer !== layer.id) seedMotes(layer);

  // ambient motes drift in screen space — they are air, not objects
  g.fillStyle = layer.motes.color;
  for (const m of motes) {
    m.y += m.s * layer.motes.drift * 0.016;
    m.x += Math.sin(gameT * 0.4 + m.y * 0.01) * 0.25;
    if (m.y > H) { m.y = -4; m.x = Math.random() * W; }
    g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
  }

  if (daylight) {
    g.fillStyle = 'rgba(255,231,182,0.11)';
    g.fillRect(0, 0, W, H);
  } else if (layer.mood.tint) {
    g.fillStyle = layer.mood.tint;
    g.fillRect(0, 0, W, H);
  }

  // In the daylight the building stops breathing — the pulse goes with the
  // vignette, because the pulse is the building and the building is not here.
  let v = daylight ? 0.14 : layer.mood.vign;
  if (layer.mood.pulse && !daylight) v += Math.sin(gameT * 0.55) * layer.mood.pulse;
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
