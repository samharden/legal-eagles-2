"use strict";
// ============================== REGIONS & STREAMING ==============================
// The city is ONE global tile grid. A region is a rectangle of that grid with an
// origin, some ASCII rows, and per-layer content. There is no "current map" and
// no coordinate reset when you cross a district line — that is what makes the
// world seamless.
//
// Residency is a two-threshold band (load at LOAD_PAD, evict at EVICT_PAD) so
// walking back and forth over a boundary cannot thrash the builder.
//
// Deltas are the other half of "open world": what you did to a region survives
// its eviction. They are keyed by LAYER + region, because THE STREET and THE
// FLOOR are the same geometry but emphatically not the same world state.

import { TILE } from './stage.js';
import { parseRows, isSolid, VOID } from './tilemap.js';

const LOAD_PAD = 26;    // tiles beyond the player before a region is built
const EVICT_PAD = 44;   // ...and before a built region is dropped

export class World {
  constructor(defs, layerId) {
    this.defs = new Map();
    for (const d of defs) this.defs.set(d.id, d);
    this.layer = layerId;
    this.built = new Map();     // id -> built region
    this.deltas = new Map();    // "layer:id" -> {used:Set, taken:Set, killed:Set}
    this.onEnter = null;        // (regionDef) => void — fired when the player's region changes
    this.currentId = null;
  }

  /* ---------------------------- deltas ---------------------------- */
  delta(id) {
    const key = this.layer + ':' + id;
    let d = this.deltas.get(key);
    if (!d) { d = { used: new Set(), taken: new Set(), killed: new Set() }; this.deltas.set(key, d); }
    return d;
  }
  markUsed(id, key) { this.delta(id).used.add(key); }
  markTaken(id, key) { this.delta(id).taken.add(key); }
  markKilled(id, key) { this.delta(id).killed.add(key); }

  /* -------------------------- layer swap -------------------------- */
  // Crossing between THE STREET and THE FLOOR rebuilds everything: same
  // geometry, different dressing, different deltas, different population.
  setLayer(layerId) {
    if (layerId === this.layer) return;
    this.layer = layerId;
    for (const id of [...this.built.keys()]) this.evict(id);
    this.currentId = null;
  }

  /* ---------------------------- build ----------------------------- */
  build(id) {
    if (this.built.has(id)) return this.built.get(id);
    const def = this.defs.get(id);
    if (!def) return null;

    const { grid, w, h } = parseRows(def.rows, def.id);
    const L = (def.layers && def.layers[this.layer]) || {};

    // per-layer tile substitution: one geometry, two dressings
    if (L.sub) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const s = L.sub[grid[y][x]];
        if (s) grid[y][x] = s;
      }
    }

    const d = this.delta(id);
    const gx = t => (def.ox + t) * TILE + TILE / 2;
    const gy = t => (def.oy + t) * TILE + TILE / 2;

    const props = (L.props || []).map(p => ({
      ...p, region: id, x: gx(p.tx), y: gy(p.ty), used: d.used.has(p.id),
    }));
    const pickups = (L.pickups || [])
      .filter(p => !d.taken.has(p.id))
      .map(p => ({ ...p, region: id, x: gx(p.tx), y: gy(p.ty), bob: Math.random() * 6 }));
    const actors = (L.actors || [])
      .filter(a => !d.killed.has(a.id))
      .map(a => ({ ...a, region: id, x: gx(a.tx), y: gy(a.ty), hp: a.hp || 20, rig: null }));
    // NPCs are not actors: they never fight, never die, and are the only things
    // in the world that can hand you a fact.
    const npcs = (L.npcs || []).map(n => ({ ...n, region: id, x: gx(n.tx), y: gy(n.ty), rig: null }));

    const built = {
      def, id, grid, w, h,
      ox: def.ox, oy: def.oy,
      px: def.ox * TILE, py: def.oy * TILE,      // world-pixel origin
      pw: w * TILE, ph: h * TILE,
      layerData: L,
      props, pickups, actors, npcs,
    };
    this.built.set(id, built);
    return built;
  }

  evict(id) {
    const b = this.built.get(id);
    if (!b) return;
    // capture anything that changed while resident, then drop the build
    const d = this.delta(id);
    for (const p of b.props) if (p.used) d.used.add(p.id);
    this.built.delete(id);
  }

  /* -------------------------- residency --------------------------- */
  update(px, py) {
    const ptx = px / TILE, pty = py / TILE;

    // distance in tiles from a point to a region's rectangle (0 when inside)
    const distTo = def => {
      const dx = Math.max(def.ox - ptx, 0, ptx - (def.ox + def.rows[0].length));
      const dy = Math.max(def.oy - pty, 0, pty - (def.oy + def.rows.length));
      return Math.hypot(dx, dy);
    };

    for (const def of this.defs.values()) {
      const dist = distTo(def);
      if (dist <= LOAD_PAD) this.build(def.id);
      else if (dist > EVICT_PAD) this.evict(def.id);
    }

    const here = this.regionAt(Math.floor(ptx), Math.floor(pty));
    const id = here ? here.id : null;
    if (id && id !== this.currentId) {
      this.currentId = id;
      if (this.onEnter) this.onEnter(here.def, here);
    }
  }

  /* ---------------------------- queries --------------------------- */
  regionAt(gtx, gty) {
    for (const b of this.built.values())
      if (gtx >= b.ox && gtx < b.ox + b.w && gty >= b.oy && gty < b.oy + b.h) return b;
    return null;
  }
  tileAt(gtx, gty) {
    const b = this.regionAt(gtx, gty);
    return b ? b.grid[gty - b.oy][gtx - b.ox] : VOID;
  }
  // world-pixel collision test. Unbuilt space is solid: an open world still has
  // to stop you walking off the edge of what exists.
  solidAtPx(x, y) { return isSolid(this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE))); }

  setTile(gtx, gty, ch) {
    const b = this.regionAt(gtx, gty);
    if (b) b.grid[gty - b.oy][gtx - b.ox] = ch;
  }

  /* -------------------- aggregated live content -------------------- */
  // Callers iterate the whole resident world, not a per-map array. Regions come
  // and go underneath; nothing else has to know.
  *allProps() { for (const b of this.built.values()) yield* b.props; }
  *allPickups() { for (const b of this.built.values()) yield* b.pickups; }
  *allActors() { for (const b of this.built.values()) yield* b.actors; }
  *allNpcs() { for (const b of this.built.values()) yield* b.npcs; }
  npc(id) { for (const b of this.built.values()) for (const n of b.npcs) if (n.id === id) return n; return null; }

  takePickup(p) {
    const b = this.built.get(p.region);
    if (b) b.pickups = b.pickups.filter(q => q !== p);
    this.markTaken(p.region, p.id);
  }
  killActor(a) {
    const b = this.built.get(a.region);
    if (b) b.actors = b.actors.filter(q => q !== a);
    this.markKilled(a.region, a.id);
  }

  /* ------------------------- serialization ------------------------- */
  saveDeltas() {
    const out = {};
    for (const [key, d] of this.deltas)
      out[key] = { used: [...d.used], taken: [...d.taken], killed: [...d.killed] };
    return out;
  }
  loadDeltas(obj) {
    this.deltas.clear();
    for (const key in obj || {}) {
      const d = obj[key];
      this.deltas.set(key, {
        used: new Set(d.used || []), taken: new Set(d.taken || []), killed: new Set(d.killed || []),
      });
    }
  }

  /** Debug/verification helper — what is resident right now. */
  residentIds() { return [...this.built.keys()].sort(); }
}

/**
 * Wall-aware movement. Axis-separated so sliding along a wall works and a
 * corner never eats the whole step.
 */
export function moveEntity(world, e, dx, dy, r = 14) {
  if (dx) {
    const nx = e.x + dx;
    const edge = nx + Math.sign(dx) * r;
    if (!world.solidAtPx(edge, e.y - r * 0.6) && !world.solidAtPx(edge, e.y + r * 0.6)) e.x = nx;
  }
  if (dy) {
    const ny = e.y + dy;
    const edge = ny + Math.sign(dy) * r;
    if (!world.solidAtPx(e.x - r * 0.6, edge) && !world.solidAtPx(e.x + r * 0.6, edge)) e.y = ny;
  }
}
