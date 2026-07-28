# LEGAL EAGLES II: MOTION TO WITHDRAW

> *"A motion to withdraw shall state the reasons therefor, unless the reasons are obvious."*

Sequel to [LEGAL EAGLES: Rise to Partner](https://github.com/samharden/legal-eagles-rpg). You made partner. You survived the building. It is 2:47 a.m. and you are writing a resignation letter.

The whole game forks on one keystroke:

| | |
|---|---|
| **SEND** | *THE SOLO SHINGLE* — you resign. Build a law firm out of a city that does not want one. |
| **DELETE** | *WAS THIS ALL A DREAM?* — you close the draft, put your head down, and wake in a firm that has been empty for years. |

Design doc: [DESIGN.md](DESIGN.md).

---

## Status: Phase 0 (engine spike) — playable

What exists today:

- The opening reel and the **SEND / DELETE** fork, end to end.
- A **seamless two-region city** — Courthouse Square (gx 0–39) and The Strand (gx 40–75) on one global tile grid. Walk the road east and you cross districts with no loading break and no coordinate reset.
- **Region streaming with persistent deltas** — regions build and evict by distance; what you killed, took and used stays that way when they rebuild.
- **Two layers over one geometry** — THE STREET and THE FLOOR share every wall and differ in palette, light, music, tiles, props, pickups and population.
- Movement, dash, melee, interaction prompts, pickups, wandering/chasing actors, DOM HUD, save/load.
- Keyboard, mouse, touch and gamepad through one action layer.
- ASCII tilemaps plus a **map editor** at `?edit=1`.
- A bundler that emits a self-contained `dist/index.html`.

Not built yet: the Docket, the economy, reputation, the facts model, quest engine v2, combat beyond a briefcase swing, the other four districts. See DESIGN.md §8.

---

## Run it

```bash
node tools/serve.mjs
```

Then open <http://localhost:8142>. Node is used only for the dev server and the bundler — the game itself has no dependencies, no build step, and no external assets.

Useful URLs:

| URL | What |
|---|---|
| `/?dev=1` | Dev HUD (resident regions, tile coords) and dev keys |
| `/?dev=1&layer=street` | Skip the reel, start on Path A |
| `/?dev=1&layer=floor` | Skip the reel, start on Path B |
| `/?edit=1` | Map editor |
| `/?touch=1` | Force the mobile layout on desktop |

Dev keys (`?dev=1` only): `P` swap layer · `O` save · `U` load.

## Build the single file

```bash
node tools/build.mjs
```

Writes `dist/index.html` — one file, no external references, double-clickable and itch.io-ready.

---

## Controls

| Key | Action |
|-----|--------|
| `WASD` / arrows | Move |
| `E` | Use / talk / advance |
| `J` / `Space` | Briefcase strike |
| `K` / click | Fire *(reserved)* |
| `L` | Spin *(reserved)* |
| `Shift` | Dash |
| `M` · `F` | Mute · fullscreen |
| `−` / `+` / wheel | Zoom |
| 🎮 | Sticks move & aim, A use, B strike, X fire, Y spin, LB dash |

---

## Architecture

```
engine/     reusable — stage, sprites, anim (LEAnim), audio, input,
            tilemap, region streaming, save
game/       content — city regions, layers, actors, render, intro, main
dev/        editor.js — the ?edit=1 map painter
tools/      serve.mjs (dev server), build.mjs (bundler)
```

Vanilla ES modules, canvas 2D, Web Audio. No framework, no dependencies, no asset files — every sprite, map and note is generated in code, as in LE1.

### Three things worth knowing before you edit

**Maps are ASCII.** `game/city.js` holds each region's geometry as rows of characters (`engine/tilemap.js` defines the legend). Rows must be rectangular — the parser throws with the offending row rather than silently producing collision bugs. Paint with `?edit=1` and paste the export back.

**The city is one coordinate space.** A region declares its origin in global tiles; there is no per-map coordinate system and no `setWorld`. Query by global tile: `world.tileAt(gx, gy)`. Unbuilt space is solid.

**Deltas are keyed by layer.** `world.delta(id)` is scoped `"<layer>:<region>"`, so killing someone on THE STREET has no effect on THE FLOOR. Anything that permanently changes a region must go through `killActor` / `takePickup` / `markUsed`, or it will come back when the region rebuilds.

### The bundler's two rules

`tools/build.mjs` concatenates the module graph into one scope, so it enforces:

1. **No circular imports.**
2. **No duplicate module-scope declaration names across files.**

Both fail the build with the offending files named. Keep imports as plain relative specifiers — the dev server adds cache-busting, the source stays clean.

### Why a Node dev server

ES modules import each other by literal path, so a `?v=` on the entry never reaches `engine/stage.js`, and Chrome will happily keep a stale module graph across reloads even under `Cache-Control: no-store`. `tools/serve.mjs` rewrites relative import specifiers on the way out, stamping each with the newest mtime in the source tree. Change any file and every module URL changes. This cost an hour to discover once; it is not worth rediscovering.
