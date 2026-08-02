#!/usr/bin/env node
// ============================== CITY CHECK ==============================
// Static validation of game/city.js, run before the bundler.
//
// parseRows() already catches ragged maps and unknown tiles, loudly, because a
// ragged map is the authoring mistake that produces collision bugs a long way
// from the cause. This catches the other three:
//
//   1. Anything authored somewhere it cannot be used. The rule differs by kind,
//      because a PROP is allowed to sit on a solid tile — the newsstand prop is
//      drawn on the newsstand, which is the point — it just has to have an open
//      tile beside it, since the use radius is a tile and a half. Anything that
//      occupies space or has to be walked onto needs its own tile walkable.
//      An NPC inside a wall is not a crash; it is a quest you cannot finish.
//   2. Duplicate ids inside one region+layer, which silently shadow.
//   3. A floor region with no way to pay for its lights: a lightCost and no
//      `lights` prop, or neither that nor `litFree`, is a district that is dark
//      for the rest of the game.
//
// Usage: node tools/check.mjs

import { REGIONS, ALL_REGIONS } from '../game/city.js';
import { parseRows, isSolid } from '../engine/tilemap.js';
import { ACTOR_TYPES } from '../game/actors.js';

let errors = 0;
const fail = m => { console.error('  ✗ ' + m); errors++; };

// Mirrored from engine/region.js, which cannot be imported here: it pulls in
// stage.js, which wants a DOM. Same reason this file re-implements `sub`.
// If the pad changes there, change it here.
const EVICT_PAD = 44;

// every door authored anywhere, checked as pairs at the bottom
const doors = [];     // {from, layer, id, into, spot}
// NPC ids, per layer, across ALL regions — `world.npc(id)` and every `talk`
// stage resolve by id alone, so the same NPC in two regions is a quest that
// completes at whichever one happened to build first.
const npcHomes = {};
const byId = new Map(ALL_REGIONS.map(r => [r.id, r]));

// Two regions overlapping on the global grid is silent and awful: `regionAt`
// returns whichever built first, so half a district answers as the other one.
// Interiors live at oy 200 precisely so this can never happen, and this is the
// line that proves it rather than trusting the comment.
for (let i = 0; i < ALL_REGIONS.length; i++)
  for (let j = i + 1; j < ALL_REGIONS.length; j++) {
    const a = ALL_REGIONS[i], b = ALL_REGIONS[j];
    const aw = a.rows[0].length, ah = a.rows.length, bw = b.rows[0].length, bh = b.rows.length;
    if (a.ox < b.ox + bw && b.ox < a.ox + aw && a.oy < b.oy + bh && b.oy < a.oy + ah)
      fail(`${a.id} and ${b.id} overlap on the global grid`);

    // Districts are MEANT to be neighbours; rooms are not. Two interiors within
    // the eviction pad are both resident at once, and at low zoom the second one
    // hangs in the void beside the one you are standing in. Silent, and it looks
    // like a rendering bug rather than a layout mistake.
    if (!a.interior || !b.interior) continue;
    const gap = Math.hypot(
      Math.max(a.ox - (b.ox + bw), b.ox - (a.ox + aw), 0),
      Math.max(a.oy - (b.oy + bh), b.oy - (a.oy + ah), 0));
    if (gap <= EVICT_PAD)
      fail(`${a.id} and ${b.id} are ${gap.toFixed(0)} tiles apart — interiors must clear EVICT_PAD (${EVICT_PAD}) or they are resident together`);
  }

for (const def of ALL_REGIONS) {
  const { grid, w, h } = parseRows(def.rows, def.id);
  console.log(`${def.id}  ${w}x${h}  gx ${def.ox}..${def.ox + w - 1}  gy ${def.oy}..${def.oy + h - 1}`
    + (def.interior ? `  (inside ${def.of})` : ''));

  if (def.interior) {
    if (!byId.has(def.of)) fail(`${def.id}: of '${def.of}' is not a region`);
    else if (byId.get(def.of).interior) fail(`${def.id}: of '${def.of}' is itself an interior`);
    if (!Array.isArray(def.at) || def.at.length !== 2) fail(`${def.id}: no at [tx,ty] — the map has nowhere to put you`);
  }

  const crossings = {};   // layer -> [{id, tx, ty}] — checked as a pair below

  for (const layerId of ['street', 'floor']) {
    const L = (def.layers && def.layers[layerId]) || null;
    if (!L) continue;

    // per-layer tile substitution, same as region.js does at build time
    const g = grid.map(r => r.slice());
    if (L.sub) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = L.sub[g[y][x]];
      if (s) g[y][x] = s;
    }

    const seen = new Set();
    const groups = [['props', L.props], ['pickups', L.pickups], ['npcs', L.npcs], ['actors', L.actors]];
    for (const [kind, list] of groups) {
      for (const e of list || []) {
        const where = `${def.id}/${layerId}/${kind} ${e.id}`;
        if (seen.has(e.id)) fail(`${where}: duplicate id in this region+layer`);
        seen.add(e.id);
        if (e.tx == null || e.ty == null) { fail(`${where}: no tx/ty`); continue; }
        if (e.ty < 0 || e.ty >= h || e.tx < 0 || e.tx >= w) { fail(`${where}: ${e.tx},${e.ty} is outside ${w}x${h}`); continue; }
        const ch = g[e.ty][e.tx];
        const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w) ? g[y][x] : '#';
        if (kind === 'props') {
          // may sit on the thing it depicts; must be reachable from beside it
          const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !isSolid(at(e.tx + dx, e.ty + dy)));
          if (!open) fail(`${where}: walled in at ${e.tx},${e.ty} — no open tile adjacent`);
        } else if (isSolid(ch)) {
          fail(`${where}: sits on a solid tile '${ch}' at ${e.tx},${e.ty}`);
        }
        if (kind === 'actors' && !ACTOR_TYPES[e.type]) fail(`${where}: unknown actor type '${e.type}'`);
        if (kind === 'npcs') ((npcHomes[layerId] ||= {})[e.id] ||= []).push(def.id);
        if (e.bleed != null && !(e.bleed >= 1 && e.bleed <= 3))
          fail(`${where}: bleed ${e.bleed} is not 1..3 — it would never come into being`);
        if (kind === 'props' && e.cross) {
          // A crossing inside a room would be a stuck run: crossLayers() swaps
          // the layer under you, and a room the other layer does not author is
          // four walls with no door prop in them. Crossings belong to districts.
          if (def.interior) fail(`${where}: a crossing cannot be inside a room — the other layer may not author this one`);
          (crossings[layerId] ||= []).push(e);
          if (!e.repeat) fail(`${where}: a crossing must be repeat:true — it is a door, not a document`);
        }
        if (kind === 'props' && e.into) {
          if (!e.repeat) fail(`${where}: a door must be repeat:true — you go through it more than once`);
          const dest = byId.get(e.into);
          if (!dest) { fail(`${where}: into '${e.into}' is not a region`); continue; }
          if (!Array.isArray(e.spot) || e.spot.length !== 2) { fail(`${where}: no spot [tx,ty] — nowhere to arrive`); continue; }
          const [sx, sy] = e.spot;
          const dh = dest.rows.length, dw = dest.rows[0].length;
          if (sy < 0 || sy >= dh || sx < 0 || sx >= dw) fail(`${where}: spot ${sx},${sy} is outside ${e.into} (${dw}x${dh})`);
          else {
            // the tile you land on has to be walkable in the layer you land in,
            // after that layer's substitutions. Arriving inside a wall is a
            // stuck run, and it is invisible until somebody opens that door.
            const DL = (dest.layers && dest.layers[layerId]) || null;
            if (!DL) fail(`${where}: ${e.into} has no ${layerId} layer, and you can get there from this one`);
            else {
              let ch = dest.rows[sy][sx];
              if (DL.sub && DL.sub[ch]) ch = DL.sub[ch];
              if (isSolid(ch)) fail(`${where}: spot ${sx},${sy} in ${e.into}/${layerId} is solid '${ch}'`);
            }
          }
          doors.push({ from: def.id, layer: layerId, id: e.id, into: e.into });
        }
      }
    }

    if (layerId === 'floor') {
      // A room is lit by the district it is in, so it needs no panel of its own
      // and must not have one — two panels for one floor would charge twice.
      if (def.interior) {
        if ((L.props || []).some(p => p.lights)) fail(`${def.id}/floor: an interior must not have its own lighting panel — it is lit by ${def.of}`);
      } else {
        const hasPanel = (L.props || []).some(p => p.lights);
        if (!L.litFree && !hasPanel) fail(`${def.id}/floor: no lights: prop and not litFree — this district can never be lit`);
        if (!L.litFree && !L.lightCost) fail(`${def.id}/floor: no lightCost`);
      }
    }
  }

  // A crossing is ONE physical thing seen from either side, so it has to be
  // authored on both layers at the same tile. A one-sided crossing is a one-way
  // trip into a district with no way back out, which is the single worst bug
  // this feature can have and the only one the player cannot work around.
  const A = crossings.street || [], B = crossings.floor || [];
  for (const a of A) {
    const b = B.find(x => x.tx === a.tx && x.ty === a.ty);
    if (!b) fail(`${def.id}: crossing '${a.id}' is on street at ${a.tx},${a.ty} with nothing facing it on floor`);
  }
  for (const b of B) {
    const a = A.find(x => x.tx === b.tx && x.ty === b.ty);
    if (!a) fail(`${def.id}: crossing '${b.id}' is on floor at ${b.tx},${b.ty} with nothing facing it on street`);
  }
}

// A door is authored in PAIRS, and for the same reason a crossing is: a way in
// with no way back is a one-way trip into a room, which is the worst bug this
// feature can have and the only one the player cannot walk out of. Checked per
// layer, because THE STREET and THE FLOOR are separately authored and a door
// that only comes back on one side strands you on the other.
for (const d of doors) {
  const back = doors.some(o => o.layer === d.layer && o.from === d.into && o.into === d.from);
  if (!back) fail(`${d.from}/${d.layer}: door '${d.id}' goes into ${d.into} and nothing in ${d.into}/${d.layer} comes back`);
}

// Every interior has to be reachable from the district that owns it, on every
// layer it is authored for. An unreachable room is content nobody will see.
for (const def of ALL_REGIONS) {
  if (!def.interior) continue;
  for (const layerId of ['street', 'floor']) {
    if (!def.layers || !def.layers[layerId]) continue;
    if (!doors.some(d => d.layer === layerId && d.into === def.id))
      fail(`${def.id}/${layerId}: no door anywhere leads into this room`);
  }
}

for (const layerId in npcHomes)
  for (const id in npcHomes[layerId])
    if (npcHomes[layerId][id].length > 1)
      fail(`npc '${id}' is in ${npcHomes[layerId][id].join(' and ')} on ${layerId} — a talk stage cannot tell them apart`);

if (errors) { console.error(`\n${errors} problem${errors > 1 ? 's' : ''} in game/city.js`); process.exit(1); }
console.log('\ncity ok');
