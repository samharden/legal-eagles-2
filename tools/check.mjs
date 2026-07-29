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

import { REGIONS } from '../game/city.js';
import { parseRows, isSolid } from '../engine/tilemap.js';
import { ACTOR_TYPES } from '../game/actors.js';

let errors = 0;
const fail = m => { console.error('  ✗ ' + m); errors++; };

for (const def of REGIONS) {
  const { grid, w, h } = parseRows(def.rows, def.id);
  console.log(`${def.id}  ${w}x${h}  gx ${def.ox}..${def.ox + w - 1}  gy ${def.oy}..${def.oy + h - 1}`);

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
        if (e.bleed != null && !(e.bleed >= 1 && e.bleed <= 3))
          fail(`${where}: bleed ${e.bleed} is not 1..3 — it would never come into being`);
        if (kind === 'props' && e.cross) {
          (crossings[layerId] ||= []).push(e);
          if (!e.repeat) fail(`${where}: a crossing must be repeat:true — it is a door, not a document`);
        }
      }
    }

    if (layerId === 'floor') {
      const hasPanel = (L.props || []).some(p => p.lights);
      if (!L.litFree && !hasPanel) fail(`${def.id}/floor: no lights: prop and not litFree — this district can never be lit`);
      if (!L.litFree && !L.lightCost) fail(`${def.id}/floor: no lightCost`);
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

if (errors) { console.error(`\n${errors} problem${errors > 1 ? 's' : ''} in game/city.js`); process.exit(1); }
console.log('\ncity ok');
