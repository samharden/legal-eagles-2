"use strict";
// ============================== TILEMAP ==============================
// LE1 built its maps by calling hline()/rectF()/vline() in JavaScript. That is
// fine for six rooms and untenable for a city: you cannot see the map you are
// editing. LE2 authors geometry as ASCII rows, which are readable in the source,
// diffable in git, and paintable by the dev editor (?edit=1).
//
// `cls` is the paint class. A layer supplies one colour per class, which is how
// one set of rows dresses as both THE STREET and THE FLOOR.

export const TILES = {
  '.': { name: 'sidewalk', cls: 'ground', solid: false },
  ',': { name: 'grass',    cls: 'grass',  solid: false },
  '=': { name: 'road',     cls: 'road',   solid: false },
  '-': { name: 'road-centre', cls: 'road', solid: false },   // draws the lane dash on its top edge
  's': { name: 'steps',    cls: 'steps',  solid: false },
  '+': { name: 'door',     cls: 'door',   solid: false, door: true },
  '#': { name: 'building', cls: 'build',  solid: true },
  'w': { name: 'window',   cls: 'glass',  solid: true },
  'T': { name: 'tree',     cls: 'tree',   solid: true },
  'b': { name: 'bench',    cls: 'prop',   solid: true },
  'k': { name: 'kiosk',    cls: 'prop',   solid: true },
  'x': { name: 'bollard',  cls: 'prop',   solid: true },
  'o': { name: 'fence',    cls: 'fence',  solid: true },
  ':': { name: 'lot',      cls: 'lot',    solid: false },
  '~': { name: 'water',    cls: 'water',  solid: true },
  // ---- inside ----
  // A room is not a street with walls round it, and the paint has to say so
  // before any writing does. `|` is the partition a layer can open: it is a
  // wall on THE STREET and `sub`s to floor on THE FLOOR, which is how a room
  // gets to be deeper on one side than the building it is in.
  '_': { name: 'room',      cls: 'inside',    solid: false },
  '%': { name: 'concourse', cls: 'stone',     solid: false },
  '|': { name: 'partition', cls: 'partition', solid: true },
  'c': { name: 'furniture', cls: 'furn',      solid: true },
};

export const VOID = ' ';   // unbuilt space — solid, drawn as nothing

export function tileDef(ch) { return TILES[ch] || null; }
export function isSolid(ch) { const d = TILES[ch]; return d ? d.solid : true; }

/**
 * Parse ASCII rows into a 2D char grid, validating rectangularity loudly —
 * a ragged map is the single most common authoring mistake and silently
 * accepting it produces collision bugs a long way from the cause.
 */
export function parseRows(rows, label = 'region') {
  if (!rows.length) throw new Error(`${label}: no rows`);
  const w = rows[0].length;
  const grid = [];
  rows.forEach((r, y) => {
    if (r.length !== w)
      throw new Error(`${label}: row ${y} is ${r.length} chars, expected ${w}\n  "${r}"`);
    const line = [];
    for (let x = 0; x < w; x++) {
      const ch = r[x];
      if (ch !== VOID && !TILES[ch])
        throw new Error(`${label}: unknown tile '${ch}' at ${x},${y}`);
      line.push(ch);
    }
    grid.push(line);
  });
  return { grid, w, h: rows.length };
}

/** Serialize a grid back to ASCII rows — the editor's export path. */
export function toRows(grid) { return grid.map(r => r.join('')); }
